<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Services\GoogleBooksService;
use App\Services\AlgoliaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;

class BookController extends Controller
{
    private GoogleBooksService $googleBooksService;
    private AlgoliaService $algoliaService;

    public function __construct(GoogleBooksService $googleBooksService, AlgoliaService $algoliaService)
    {
        $this->googleBooksService = $googleBooksService;
        $this->algoliaService = $algoliaService;
    }

    public function search(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'q' => 'required|string|min:1',
            'page' => 'integer|min:1',
            'per_page' => 'integer|min:1|max:40',
            'filters' => 'array',
            'use_google_books' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = $request->input('q');
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 20);
        $filters = $request->input('filters', []);
        $useGoogleBooks = $request->input('use_google_books', false);

        try {
            // Always use hybrid approach: Google Books API + local caching
            $searchResults = $this->algoliaService->searchOrFetchBooks($query, $page, $perPage);

            return response()->json([
                'success' => true,
                'data' => [
                    'books' => $searchResults['books'],
                    'pagination' => [
                        'current_page' => $searchResults['currentPage'] ?? $page,
                        'per_page' => $perPage,
                        'total' => $searchResults['totalItems'],
                        'total_pages' => $searchResults['totalPages'],
                    ],
                    'source' => $searchResults['source'],
                    'facets' => $searchResults['facets'] ?? [],
                    'processing_time_ms' => $searchResults['processingTimeMS'] ?? 0,
                    'new_books_indexed' => $searchResults['newBooksIndexed'] ?? 0,
                    'algolia_count' => $searchResults['algoliaCount'] ?? 0,
                    'google_count' => $searchResults['googleCount'] ?? 0,
                    'combined_count' => $searchResults['combinedCount'] ?? 0,
                ],
            ]);

        } catch (\Exception $e) {
            // Direct Google Books API fallback
            try {
                $startIndex = ($page - 1) * $perPage;
                $searchResults = $this->googleBooksService->searchBooks($query, $perPage, $startIndex);
                $processedResults = $this->googleBooksService->processSearchResults($searchResults);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'books' => $processedResults['books'],
                        'pagination' => [
                            'current_page' => $page,
                            'per_page' => $perPage,
                            'total' => $processedResults['totalItems'],
                            'total_pages' => ceil($processedResults['totalItems'] / $perPage),
                        ],
                        'source' => 'google_books_direct',
                        'facets' => [],
                    ],
                ]);
            } catch (\Exception $fallbackError) {
                return response()->json([
                    'success' => false,
                    'message' => 'Search failed',
                    'error' => $e->getMessage(),
                    'fallback_error' => $fallbackError->getMessage(),
                ], 500);
            }
        }
    }

    public function show(string $id): JsonResponse
    {
        try {
            $userId = auth('sanctum')->id();
            $cacheKey = "book_details_response:{$id}:" . ($userId ? "user_{$userId}" : 'guest');
            
            // Try to get cached response first (cache for 10 minutes)
            $cachedResponse = Cache::get($cacheKey);
            if ($cachedResponse !== null) {
                return response()->json($cachedResponse)
                    ->header('Cache-Control', 'public, max-age=600')
                    ->header('X-Cache-Status', 'HIT');
            }

            // First try to find in local database
            $book = Book::where('google_books_id', $id)->first();

            if (!$book) {
                // If not found locally, fetch from Google Books API
                $googleBookData = $this->googleBooksService->getBookDetails($id);
                
                if (!$googleBookData) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Book not found',
                    ], 404);
                }

                $book = $this->googleBooksService->storeBookFromGoogleData($googleBookData);
                
                // Index the new book in Algolia
                try {
                    $this->algoliaService->indexBook($book);
                } catch (\Exception $indexError) {
                    // Log error but don't fail the request
                    \Log::warning('Failed to index book in Algolia: ' . $indexError->getMessage());
                }
            }

            // Add favorite status if user is authenticated
            $isFavorited = false;
            if ($userId) {
                $isFavorited = $book->isFavoritedBy($userId);
            }

            $responseData = [
                'success' => true,
                'data' => [
                    'book' => $book,
                    'is_favorited' => $isFavorited,
                ],
            ];

            // Cache the response for 10 minutes
            Cache::put($cacheKey, $responseData, 600);

            return response()->json($responseData)
                ->header('Cache-Control', 'public, max-age=600')
                ->header('X-Cache-Status', 'MISS');
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve book details',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'page' => 'integer|min:1',
            'per_page' => 'integer|min:1|max:100',
            'sort' => 'in:title,created_at,average_rating',
            'order' => 'in:asc,desc',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 20);
        $sort = $request->input('sort', 'created_at');
        $order = $request->input('order', 'desc');

        // Create cache key based on parameters
        $cacheKey = "books_index:{$page}:{$perPage}:{$sort}:{$order}";
        
        // Try to get cached response first (cache for 5 minutes)
        $cachedResponse = Cache::get($cacheKey);
        if ($cachedResponse !== null) {
            return response()->json($cachedResponse)
                ->header('Cache-Control', 'public, max-age=300')
                ->header('X-Cache-Status', 'HIT');
        }

        $books = Book::orderBy($sort, $order)->paginate($perPage);

        $responseData = [
            'success' => true,
            'data' => [
                'books' => $books->items(),
                'pagination' => [
                    'current_page' => $books->currentPage(),
                    'per_page' => $books->perPage(),
                    'total' => $books->total(),
                    'total_pages' => $books->lastPage(),
                ],
            ],
        ];

        // Cache the response for 5 minutes
        Cache::put($cacheKey, $responseData, 300);

        return response()->json($responseData)
            ->header('Cache-Control', 'public, max-age=300')
            ->header('X-Cache-Status', 'MISS');
    }

    /**
     * Get search suggestions for autocomplete using Google Books API
     */
    public function suggestions(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'q' => 'required|string|min:1',
            'limit' => 'integer|min:1|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = $request->input('q');
        $limit = $request->input('limit', 5);

        try {
            // Get live suggestions from Google Books API
            $suggestions = $this->googleBooksService->getSearchSuggestions($query, $limit);

            return response()->json([
                'success' => true,
                'data' => [
                    'suggestions' => $suggestions,
                    'query' => $query,
                    'source' => 'google_books_live',
                ],
            ]);

        } catch (\Exception $e) {
            // Fallback 1: Try Algolia/local index
            try {
                $suggestions = $this->algoliaService->getSearchSuggestions($query, $limit);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'suggestions' => $suggestions,
                        'query' => $query,
                        'source' => 'algolia_fallback',
                    ],
                ]);

            } catch (\Exception $algoliaError) {
                // Fallback 2: Database search
                try {
                    $books = Book::where('title', 'LIKE', "%{$query}%")
                        ->orWhere('authors', 'LIKE', "%{$query}%")
                        ->select('title', 'authors')
                        ->limit($limit * 2)
                        ->get();

                    $suggestions = [];
                    foreach ($books as $book) {
                        $suggestions[] = $book->title;
                        $authors = is_string($book->authors) ? json_decode($book->authors, true) : $book->authors;
                        if (is_array($authors)) {
                            foreach ($authors as $author) {
                                if (stripos($author, $query) !== false) {
                                    $suggestions[] = $author;
                                }
                            }
                        }
                    }

                    $suggestions = array_unique($suggestions);
                    $suggestions = array_slice($suggestions, 0, $limit);

                    return response()->json([
                        'success' => true,
                        'data' => [
                            'suggestions' => array_values($suggestions),
                            'query' => $query,
                            'source' => 'database_fallback',
                        ],
                    ]);

                } catch (\Exception $databaseError) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to get suggestions',
                        'error' => $e->getMessage(),
                    ], 500);
                }
            }
        }
    }
}
