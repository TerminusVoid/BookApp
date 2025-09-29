<?php

namespace App\Observers;

use App\Models\Book;
use App\Services\AlgoliaService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class BookObserver
{
    private AlgoliaService $algoliaService;

    public function __construct(AlgoliaService $algoliaService)
    {
        $this->algoliaService = $algoliaService;
    }

    /**
     * Handle the Book "created" event.
     */
    public function created(Book $book): void
    {
        try {
            $this->algoliaService->indexBook($book);
            Log::info("Book automatically indexed after creation: {$book->title} (ID: {$book->id})");
        } catch (\Exception $e) {
            Log::error("Failed to auto-index book after creation: {$book->title} - " . $e->getMessage());
        }

        // Clear related caches
        $this->clearBookCaches($book);
    }

    /**
     * Handle the Book "updated" event.
     */
    public function updated(Book $book): void
    {
        try {
            $this->algoliaService->indexBook($book);
            Log::info("Book automatically re-indexed after update: {$book->title} (ID: {$book->id})");
        } catch (\Exception $e) {
            Log::error("Failed to auto-index book after update: {$book->title} - " . $e->getMessage());
        }

        // Clear related caches
        $this->clearBookCaches($book);
    }

    /**
     * Handle the Book "deleted" event.
     */
    public function deleted(Book $book): void
    {
        try {
            $this->algoliaService->removeBook($book);
            Log::info("Book automatically removed from index after deletion: {$book->title} (ID: {$book->id})");
        } catch (\Exception $e) {
            Log::error("Failed to remove book from index after deletion: {$book->title} - " . $e->getMessage());
        }

        // Clear related caches
        $this->clearBookCaches($book);
    }

    /**
     * Handle the Book "restored" event.
     */
    public function restored(Book $book): void
    {
        try {
            $this->algoliaService->indexBook($book);
            Log::info("Book automatically re-indexed after restoration: {$book->title} (ID: {$book->id})");
        } catch (\Exception $e) {
            Log::error("Failed to auto-index book after restoration: {$book->title} - " . $e->getMessage());
        }

        // Clear related caches
        $this->clearBookCaches($book);
    }

    /**
     * Handle the Book "force deleted" event.
     */
    public function forceDeleted(Book $book): void
    {
        try {
            $this->algoliaService->removeBook($book);
            Log::info("Book automatically removed from index after force deletion: {$book->title} (ID: {$book->id})");
        } catch (\Exception $e) {
            Log::error("Failed to remove book from index after force deletion: {$book->title} - " . $e->getMessage());
        }

        // Clear related caches
        $this->clearBookCaches($book);
    }

    /**
     * Clear book-related caches when a book is modified
     */
    private function clearBookCaches(Book $book): void
    {
        try {
            // Clear book details cache for all users
            Cache::forget("book_details_response:{$book->google_books_id}:guest");
            
            // Clear books index cache (all variations)
            // Since Laravel doesn't have built-in pattern deletion for file cache,
            // we'll clear specific common combinations
            for ($page = 1; $page <= 10; $page++) {
                foreach ([20, 40, 60] as $perPage) {
                    foreach (['created_at', 'title', 'average_rating'] as $sort) {
                        foreach (['asc', 'desc'] as $order) {
                            Cache::forget("books_index:{$page}:{$perPage}:{$sort}:{$order}");
                        }
                    }
                }
            }

            // Clear Google Books API cache for this book
            Cache::forget("book_details:{$book->google_books_id}");
            
            Log::info("Cleared caches for book: {$book->title} (ID: {$book->id})");
        } catch (\Exception $e) {
            Log::error("Failed to clear caches for book {$book->title}: " . $e->getMessage());
        }
    }
}
