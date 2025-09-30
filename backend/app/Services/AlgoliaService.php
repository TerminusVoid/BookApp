<?php

namespace App\Services;

use App\Models\Book;
use Algolia\AlgoliaSearch\Api\SearchClient;
use Algolia\AlgoliaSearch\Model\Search\Index;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class AlgoliaService
{
    private SearchClient $client;
    private string $indexName;
    private GoogleBooksService $googleBooksService;

    public function __construct(GoogleBooksService $googleBooksService)
    {
        $this->googleBooksService = $googleBooksService;
        
        $appId = Config::get('algolia.app_id');
        $secret = Config::get('algolia.secret');
        
        if (!$appId || !$secret) {
            Log::warning('Algolia credentials not configured - service will be disabled');
            $this->client = null;
            $this->indexName = null;
            return;
        }

        $this->client = SearchClient::create($appId, $secret);
        $this->indexName = Config::get('algolia.indices.books.name');
    }

    /**
     * Check if Algolia is properly configured
     */
    private function isConfigured(): bool
    {
        return $this->client !== null && $this->indexName !== null;
    }

    /**
     * Configure the books index with proper settings
     */
    public function configureIndex(): void
    {
        if (!$this->isConfigured()) {
            Log::warning('Algolia not configured - skipping index configuration');
            return;
        }

        $settings = Config::get('algolia.indices.books.settings');
        $this->client->setSettings($this->indexName, $settings);
        Log::info('Algolia books index configured successfully');
    }

    /**
     * Search books using Algolia with caching
     */
    public function searchBooks(string $query, int $page = 1, int $hitsPerPage = 20, array $filters = []): array
    {
        // Create cache key for search results
        $cacheKey = 'search_results:' . md5(strtolower($query) . serialize($filters) . $page . $hitsPerPage);
        
        // Try to get from cache first (cache for 2 minutes for frequently searched terms)
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $searchParams = [
            'page' => $page - 1, // Algolia uses 0-based pagination
            'hitsPerPage' => $hitsPerPage,
            'attributesToHighlight' => ['title', 'authors', 'description'],
            'attributesToSnippet' => ['description:100'],
        ];

        // Add facet filters if provided
        if (!empty($filters)) {
            $facetFilters = [];
            foreach ($filters as $facet => $values) {
                if (is_array($values)) {
                    $facetFilters[] = array_map(fn($value) => "$facet:$value", $values);
                } else {
                    $facetFilters[] = "$facet:$values";
                }
            }
            $searchParams['facetFilters'] = $facetFilters;
        }

        // Add facets to retrieve
        $searchParams['facets'] = Config::get('algolia.search.facets', []);

        try {
            $searchParams['query'] = $query;
            $results = $this->client->searchSingleIndex($this->indexName, $searchParams);
            
            $searchResults = [
                'hits' => $results['hits'],
                'nbHits' => $results['nbHits'],
                'page' => $results['page'] + 1, // Convert back to 1-based pagination
                'nbPages' => $results['nbPages'],
                'hitsPerPage' => $results['hitsPerPage'],
                'facets' => $results['facets'] ?? [],
                'processingTimeMS' => $results['processingTimeMS'],
            ];
            
            // Cache search results for 2 minutes
            Cache::put($cacheKey, $searchResults, 120);
            
            return $searchResults;
        } catch (\Exception $e) {
            Log::error('Algolia search error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Index a single book from Google Books API
     */
    public function indexBookFromGoogle(string $googleBooksId): ?Book
    {
        try {
            // Get book data from Google Books API
            $googleBookData = $this->googleBooksService->getBookDetails($googleBooksId);
            
            if (!$googleBookData) {
                Log::warning("Book not found in Google Books API: $googleBooksId");
                return null;
            }

            // Store book in local database
            $book = $this->googleBooksService->storeBookFromGoogleData($googleBookData);
            
            // Index in Algolia
            $this->indexBook($book);
            
            return $book;
        } catch (\Exception $e) {
            Log::error("Error indexing book from Google Books: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Index a book in Algolia
     */
    public function indexBook(Book $book): void
    {
        $record = $this->prepareBookForIndexing($book);
        
        try {
            $this->client->saveObject($this->indexName, $record);
            Log::info("Book indexed successfully: {$book->title} (ID: {$book->id})");
        } catch (\Exception $e) {
            Log::error("Error indexing book: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Index multiple books in batch
     */
    public function indexBooks(array $books): void
    {
        $records = array_map([$this, 'prepareBookForIndexing'], $books);
        
        try {
            $this->client->saveObjects($this->indexName, $records);
            Log::info("Batch indexed " . count($books) . " books successfully");
        } catch (\Exception $e) {
            Log::error("Error batch indexing books: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Remove a book from the index
     */
    public function removeBook(Book $book): void
    {
        try {
            $this->client->deleteObject($this->indexName, $book->id);
            Log::info("Book removed from index: {$book->title} (ID: {$book->id})");
        } catch (\Exception $e) {
            Log::error("Error removing book from index: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Hybrid search: Mix Algolia results with fresh Google Books API results and auto-index
     */
    public function searchOrFetchBooks(string $query, int $page = 1, int $hitsPerPage = 20): array
    {
        Log::info("Hybrid search started for query: '{$query}', page: {$page}");
        
        // Always fetch fresh results from Google Books API for comprehensive search
        $startIndex = ($page - 1) * $hitsPerPage;
        $newBooksIndexed = 0;
        $algoliaBooks = [];
        $googleBooks = [];
        
        try {
            // Step 1: Get existing results from Algolia (if any)
            try {
                $algoliaResults = $this->searchBooks($query, $page, $hitsPerPage);
                $algoliaBooks = $algoliaResults['hits'] ?? [];
                Log::info("Found " . count($algoliaBooks) . " books in Algolia for '{$query}'");
            } catch (\Exception $e) {
                Log::warning("Algolia search failed: " . $e->getMessage());
                $algoliaBooks = [];
            }
            
            // Step 2: Always fetch fresh results from Google Books API
            Log::info("Fetching fresh results from Google Books API for '{$query}'");
            $googleResults = $this->googleBooksService->searchBooks($query, $hitsPerPage, $startIndex);
            $processedResults = $this->googleBooksService->processSearchResults($googleResults);
            $googleBooks = $processedResults['books'] ?? [];
            
            Log::info("Fetched " . count($googleBooks) . " books from Google Books API");
            
            // Step 3: Index ALL new books from Google Books API into Algolia
            $booksToIndex = [];
            $processedGoogleBooks = [];
            
            foreach ($googleBooks as $bookData) {
                // Check if book already exists in our database
                $existingBook = Book::where('google_books_id', $bookData['google_books_id'])->first();
                
                if (!$existingBook) {
                    try {
                        // Store new book in database
                        $book = $this->googleBooksService->storeBookFromGoogleData($bookData);
                        $booksToIndex[] = $book;
                        $processedGoogleBooks[] = $this->formatBookForResponse($book);
                        Log::info("Stored new book: {$book->title}");
                    } catch (\Exception $e) {
                        Log::error("Failed to store book {$bookData['google_books_id']}: " . $e->getMessage());
                        // Still include the book data even if storage failed
                        $processedGoogleBooks[] = $bookData;
                    }
                } else {
                    // Book exists, use existing data
                    $processedGoogleBooks[] = $this->formatBookForResponse($existingBook);
                }
            }
            
            // Step 4: Batch index new books into Algolia
            if (!empty($booksToIndex)) {
                try {
                    $this->indexBooks($booksToIndex);
                    $newBooksIndexed = count($booksToIndex);
                    Log::info("Successfully auto-indexed {$newBooksIndexed} new books from Google Books API into Algolia");
                    
                    // Clear search cache to ensure fresh results next time
                    $searchCacheKey = 'search_results:' . md5(strtolower($query) . serialize([]) . $page . $hitsPerPage);
                    Cache::forget($searchCacheKey);
                    
                } catch (\Exception $indexError) {
                    Log::error("Failed to index books into Algolia: " . $indexError->getMessage());
                }
            }
            
            // Step 5: Combine and deduplicate results (Algolia + Google Books)
            $combinedBooks = [];
            $seenBooks = [];
            
            // Add Algolia books first (they're already optimized)
            foreach ($algoliaBooks as $book) {
                $bookId = $book['google_books_id'] ?? $book['id'];
                if (!isset($seenBooks[$bookId])) {
                    $combinedBooks[] = $book;
                    $seenBooks[$bookId] = true;
                }
            }
            
            // Add Google Books results (avoiding duplicates)
            foreach ($processedGoogleBooks as $book) {
                $bookId = $book['google_books_id'] ?? $book['id'];
                if (!isset($seenBooks[$bookId])) {
                    $combinedBooks[] = $book;
                    $seenBooks[$bookId] = true;
                }
            }
            
            // Step 6: Return mixed results
            $totalAvailable = max(
                $processedResults['totalItems'] ?? 0,
                count($combinedBooks)
            );
            
            $results = [
                'books' => array_slice($combinedBooks, 0, $hitsPerPage), // Limit to requested page size
                'totalItems' => $totalAvailable,
                'currentPage' => $page,
                'totalPages' => ceil($totalAvailable / $hitsPerPage),
                'source' => 'hybrid_algolia_google',
                'processingTimeMS' => 0,
                'newBooksIndexed' => $newBooksIndexed,
                'algoliaCount' => count($algoliaBooks),
                'googleCount' => count($processedGoogleBooks),
                'combinedCount' => count($combinedBooks),
            ];
            
            Log::info("Hybrid search completed: {$results['combinedCount']} total books, {$newBooksIndexed} newly indexed");
            
            if ($newBooksIndexed > 0) {
                Log::info("✅ SUCCESS: Auto-indexed {$newBooksIndexed} new books for query '{$query}' into Algolia!");
            } else {
                Log::info("ℹ️  No new books to index - all books already exist in database");
            }
            return $results;
            
        } catch (\Exception $e) {
            Log::error('Error in hybrid search: ' . $e->getMessage());
            
            // Fallback to Algolia only if Google Books fails
            if (!empty($algoliaBooks)) {
                return [
                    'books' => $algoliaBooks,
                    'totalItems' => count($algoliaBooks),
                    'currentPage' => $page,
                    'totalPages' => ceil(count($algoliaBooks) / $hitsPerPage),
                    'source' => 'algolia_fallback',
                    'processingTimeMS' => 0,
                    'newBooksIndexed' => 0,
                ];
            }
            
            // Last resort: empty results
            return [
                'books' => [],
                'totalItems' => 0,
                'currentPage' => $page,
                'totalPages' => 0,
                'source' => 'error_fallback',
                'processingTimeMS' => 0,
                'newBooksIndexed' => 0,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    /**
     * Format book model for API response
     */
    private function formatBookForResponse(Book $book): array
    {
        return [
            'id' => $book->id,
            'google_books_id' => $book->google_books_id,
            'title' => $book->title,
            'authors' => is_string($book->authors) ? json_decode($book->authors, true) : $book->authors,
            'description' => $book->description,
            'thumbnail' => $book->thumbnail,
            'average_rating' => $book->average_rating,
            'ratings_count' => $book->ratings_count,
            'published_date' => $book->published_date,
            'publisher' => $book->publisher,
            'page_count' => $book->page_count,
            'categories' => is_string($book->categories) ? json_decode($book->categories, true) : $book->categories,
            'language' => $book->language,
            'isbn_10' => $book->isbn_10,
            'isbn_13' => $book->isbn_13,
            'preview_link' => $book->preview_link,
            'info_link' => $book->info_link,
            'created_at' => $book->created_at,
            'updated_at' => $book->updated_at,
        ];
    }

    /**
     * Prepare book data for Algolia indexing
     */
    private function prepareBookForIndexing(Book $book): array
    {
        $publishedYear = null;
        if ($book->published_date) {
            try {
                $publishedYear = Carbon::parse($book->published_date)->year;
            } catch (\Exception $e) {
                // Ignore parsing errors
            }
        }

        // Determine rating range for faceting
        $ratingRange = 'Unknown';
        if ($book->average_rating) {
            $rating = (float) $book->average_rating;
            if ($rating >= 4.5) {
                $ratingRange = '4.5 & up';
            } elseif ($rating >= 4.0) {
                $ratingRange = '4.0 & up';
            } elseif ($rating >= 3.5) {
                $ratingRange = '3.5 & up';
            } elseif ($rating >= 3.0) {
                $ratingRange = '3.0 & up';
            } else {
                $ratingRange = 'Under 3.0';
            }
        }

        return [
            'objectID' => $book->id,
            'id' => $book->id,
            'google_books_id' => $book->google_books_id,
            'title' => $book->title,
            'authors' => is_array($book->authors) ? $book->authors : json_decode($book->authors ?? '[]', true),
            'description' => $book->description,
            'categories' => is_array($book->categories) ? $book->categories : json_decode($book->categories ?? '[]', true),
            'publisher' => $book->publisher,
            'published_date' => $book->published_date,
            'published_year' => $publishedYear,
            'page_count' => $book->page_count,
            'language' => $book->language,
            'isbn_10' => $book->isbn_10,
            'isbn_13' => $book->isbn_13,
            'thumbnail' => $book->thumbnail,
            'preview_link' => $book->preview_link,
            'info_link' => $book->info_link,
            'average_rating' => $book->average_rating ? (float) $book->average_rating : null,
            'ratings_count' => $book->ratings_count,
            'rating_range' => $ratingRange,
            'created_at' => $book->created_at?->toISOString(),
            'updated_at' => $book->updated_at?->toISOString(),
        ];
    }

    /**
     * Clear all books from the index
     */
    public function clearIndex(): void
    {
        try {
            $this->client->clearObjects($this->indexName);
            Log::info('Algolia books index cleared successfully');
        } catch (\Exception $e) {
            Log::error('Error clearing Algolia index: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get search suggestions for autocomplete with caching
     */
    public function getSearchSuggestions(string $query, int $limit = 5): array
    {
        // Create cache key
        $cacheKey = 'search_suggestions:' . md5(strtolower($query)) . ':' . $limit;
        
        // Try to get from cache first
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        try {
            $searchParams = [
                'query' => $query,
                'hitsPerPage' => $limit * 3, // Get more results to extract unique suggestions
                'attributesToRetrieve' => ['title', 'authors'],
                'attributesToHighlight' => [],
                'attributesToSnippet' => [],
            ];

            $results = $this->client->searchSingleIndex($this->indexName, $searchParams);
            
            $suggestions = [];
            $seen = [];
            
            foreach ($results['hits'] as $hit) {
                // Add book title if it contains the query
                if (isset($hit['title']) && stripos($hit['title'], $query) !== false) {
                    $title = $hit['title'];
                    if (!isset($seen[strtolower($title)])) {
                        $suggestions[] = $title;
                        $seen[strtolower($title)] = true;
                    }
                }
                
                // Add authors if they contain the query
                if (isset($hit['authors']) && is_array($hit['authors'])) {
                    foreach ($hit['authors'] as $author) {
                        if (stripos($author, $query) !== false) {
                            if (!isset($seen[strtolower($author)])) {
                                $suggestions[] = $author;
                                $seen[strtolower($author)] = true;
                            }
                        }
                    }
                }
                
                if (count($suggestions) >= $limit) {
                    break;
                }
            }
            
            $finalSuggestions = array_slice($suggestions, 0, $limit);
            
            // Cache suggestions for 5 minutes
            Cache::put($cacheKey, $finalSuggestions, 300);
            
            return $finalSuggestions;
            
        } catch (\Exception $e) {
            Log::error('Algolia suggestions error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get index statistics
     */
    public function getIndexStats(): array
    {
        try {
            $response = $this->client->getSettings($this->indexName);
            
            return [
                'index_name' => $this->indexName,
                'settings' => $response,
            ];
        } catch (\Exception $e) {
            Log::error('Error getting index stats: ' . $e->getMessage());
            return [];
        }
    }
}
