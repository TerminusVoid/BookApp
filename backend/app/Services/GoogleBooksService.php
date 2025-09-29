<?php

namespace App\Services;

use App\Models\Book;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class GoogleBooksService
{
    private Client $client;
    private string $baseUrl = 'https://www.googleapis.com/books/v1';
    private int $rateLimitDelay = 100000; // 100ms in microseconds

    public function __construct()
    {
        $this->client = new Client([
            'timeout' => 30,
            'headers' => [
                'Accept' => 'application/json',
            ],
        ]);
    }

    public function searchBooks(string $query, int $maxResults = 20, int $startIndex = 0): array
    {
        $cacheKey = "books_search:" . md5($query . $maxResults . $startIndex);
        
        return Cache::remember($cacheKey, 3600, function () use ($query, $maxResults, $startIndex) {
            try {
                usleep($this->rateLimitDelay); // Rate limiting
                
                $response = $this->client->get($this->baseUrl . '/volumes', [
                    'query' => [
                        'q' => $query,
                        'maxResults' => $maxResults,
                        'startIndex' => $startIndex,
                        'printType' => 'books',
                    ],
                ]);

                $data = json_decode($response->getBody()->getContents(), true);
                
                return [
                    'items' => $data['items'] ?? [],
                    'totalItems' => $data['totalItems'] ?? 0,
                ];
            } catch (\Exception $e) {
                Log::error('Google Books API search error: ' . $e->getMessage());
                return ['items' => [], 'totalItems' => 0];
            }
        });
    }

    public function getBookDetails(string $bookId): ?array
    {
        $cacheKey = "book_details:" . $bookId;
        
        return Cache::remember($cacheKey, 7200, function () use ($bookId) {
            try {
                usleep($this->rateLimitDelay); // Rate limiting
                
                $response = $this->client->get($this->baseUrl . '/volumes/' . $bookId);
                return json_decode($response->getBody()->getContents(), true);
            } catch (\Exception $e) {
                Log::error('Google Books API book details error: ' . $e->getMessage());
                return null;
            }
        });
    }

    public function storeBookFromGoogleData(array $googleBookData): Book
    {
        $volumeInfo = $googleBookData['volumeInfo'] ?? [];
        $imageLinks = $volumeInfo['imageLinks'] ?? [];
        $industryIdentifiers = $volumeInfo['industryIdentifiers'] ?? [];

        $isbn10 = null;
        $isbn13 = null;
        
        foreach ($industryIdentifiers as $identifier) {
            if ($identifier['type'] === 'ISBN_10') {
                $isbn10 = $identifier['identifier'];
            } elseif ($identifier['type'] === 'ISBN_13') {
                $isbn13 = $identifier['identifier'];
            }
        }

        return Book::updateOrCreate(
            ['google_books_id' => $googleBookData['id']],
            [
                'title' => $volumeInfo['title'] ?? 'Unknown Title',
                'authors' => $volumeInfo['authors'] ?? [],
                'description' => $volumeInfo['description'] ?? null,
                'publisher' => $volumeInfo['publisher'] ?? null,
                'published_date' => $volumeInfo['publishedDate'] ?? null,
                'page_count' => $volumeInfo['pageCount'] ?? null,
                'categories' => $volumeInfo['categories'] ?? [],
                'language' => $volumeInfo['language'] ?? null,
                'isbn_10' => $isbn10,
                'isbn_13' => $isbn13,
                'thumbnail' => $imageLinks['thumbnail'] ?? null,
                'small_thumbnail' => $imageLinks['smallThumbnail'] ?? null,
                'average_rating' => $volumeInfo['averageRating'] ?? null,
                'ratings_count' => $volumeInfo['ratingsCount'] ?? null,
                'preview_link' => $volumeInfo['previewLink'] ?? null,
                'info_link' => $volumeInfo['infoLink'] ?? null,
            ]
        );
    }

    public function processSearchResults(array $searchResults): array
    {
        $books = [];
        
        foreach ($searchResults['items'] as $item) {
            $book = $this->storeBookFromGoogleData($item);
            $books[] = $book;
        }
        
        return [
            'books' => $books,
            'totalItems' => $searchResults['totalItems'],
        ];
    }

    /**
     * Get search suggestions from Google Books API with aggressive caching
     */
    public function getSearchSuggestions(string $query, int $limit = 5): array
    {
        $normalizedQuery = strtolower(trim($query));
        
        // Create cache key for suggestions
        $cacheKey = "suggestions:" . md5($normalizedQuery) . ":" . $limit;
        
        // For very short queries (1-2 chars), check if we have cached longer queries that start with this
        if (strlen($normalizedQuery) <= 2) {
            $prefixKey = "prefix_suggestions:" . $normalizedQuery . ":" . $limit;
            $cached = Cache::get($prefixKey);
            if ($cached !== null) {
                return $cached;
            }
        }
        
        return Cache::remember($cacheKey, 900, function () use ($query, $limit, $normalizedQuery) { // 15 minutes cache
            try {
                // Use a small search to get suggestions quickly
                $response = $this->client->get($this->baseUrl . '/volumes', [
                    'query' => [
                        'q' => $query,
                        'maxResults' => $limit * 3, // Get more to filter unique titles
                        'printType' => 'books',
                        'fields' => 'items(volumeInfo(title,authors))', // Only get title and authors for speed
                    ],
                ]);

                $data = json_decode($response->getBody()->getContents(), true);
                $suggestions = [];
                $seen = [];

                foreach ($data['items'] ?? [] as $item) {
                    $volumeInfo = $item['volumeInfo'] ?? [];
                    
                    // Add book title if it's relevant
                    if (isset($volumeInfo['title'])) {
                        $title = $volumeInfo['title'];
                        $titleLower = strtolower($title);
                        
                        // Only include if it contains the search query and hasn't been seen
                        if (stripos($title, $query) !== false && !isset($seen[$titleLower])) {
                            $suggestions[] = $title;
                            $seen[$titleLower] = true;
                        }
                    }
                    
                    // Add authors if they're relevant
                    if (isset($volumeInfo['authors']) && is_array($volumeInfo['authors'])) {
                        foreach ($volumeInfo['authors'] as $author) {
                            $authorLower = strtolower($author);
                            
                            if (stripos($author, $query) !== false && !isset($seen[$authorLower])) {
                                $suggestions[] = $author;
                                $seen[$authorLower] = true;
                            }
                        }
                    }
                    
                    // Stop if we have enough suggestions
                    if (count($suggestions) >= $limit) {
                        break;
                    }
                }
                
                // Ensure we don't return more than requested
                $finalSuggestions = array_slice($suggestions, 0, $limit);
                
                // Cache prefix suggestions for short queries
                if (strlen($normalizedQuery) <= 2 && !empty($finalSuggestions)) {
                    $prefixKey = "prefix_suggestions:" . $normalizedQuery . ":" . $limit;
                    Cache::put($prefixKey, $finalSuggestions, 1800); // 30 minutes for prefixes
                }
                
                return $finalSuggestions;
                
            } catch (\Exception $e) {
                Log::error('Google Books suggestions error: ' . $e->getMessage());
                // Return empty array on error - let fallbacks handle it
                return [];
            }
        });
    }
}
