<?php

namespace App\Console\Commands;

use App\Services\GoogleBooksService;
use App\Services\AlgoliaService;
use App\Models\Book;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class BulkFetchBooksCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'books:bulk-fetch 
                           {--terms= : Comma-separated search terms (default: popular categories)}
                           {--max-per-term=200 : Maximum books to fetch per search term}
                           {--delay=1 : Delay in seconds between API calls}
                           {--dry-run : Show what would be fetched without actually doing it}';

    /**
     * The console command description.
     */
    protected $description = 'Bulk fetch and index thousands of books from Google Books API';

    private GoogleBooksService $googleBooksService;
    private AlgoliaService $algoliaService;

    public function __construct(GoogleBooksService $googleBooksService, AlgoliaService $algoliaService)
    {
        parent::__construct();
        $this->googleBooksService = $googleBooksService;
        $this->algoliaService = $algoliaService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🚀 Starting bulk book fetching operation...');

        $searchTerms = $this->getSearchTerms();
        $maxPerTerm = (int) $this->option('max-per-term');
        $delay = (int) $this->option('delay');
        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->warn('🔍 DRY RUN MODE - No books will be fetched or indexed');
        }

        $this->info("📚 Will fetch up to {$maxPerTerm} books for each of " . count($searchTerms) . " terms");
        $this->info("🔍 Search terms: " . implode(', ', $searchTerms));

        if (!$isDryRun && !$this->confirm('Do you want to proceed with bulk fetching?')) {
            $this->info('Operation cancelled.');
            return 0;
        }

        $totalFetched = 0;
        $totalIndexed = 0;
        $errors = 0;

        $overallProgress = $this->output->createProgressBar(count($searchTerms));
        $overallProgress->start();

        foreach ($searchTerms as $term) {
            $this->info("\n🔍 Fetching books for: '{$term}'");
            
            try {
                $result = $this->fetchBooksForTerm($term, $maxPerTerm, $delay, $isDryRun);
                
                $totalFetched += $result['fetched'];
                $totalIndexed += $result['indexed'];
                $errors += $result['errors'];
                
                $this->info("✅ '{$term}': {$result['fetched']} fetched, {$result['indexed']} indexed, {$result['errors']} errors");
                
            } catch (\Exception $e) {
                $this->error("❌ Failed to fetch books for '{$term}': " . $e->getMessage());
                $errors++;
            }
            
            $overallProgress->advance();
            
            // Brief pause between terms
            if (!$isDryRun) {
                sleep(1);
            }
        }

        $overallProgress->finish();
        $this->newLine(2);

        // Final summary
        $this->info('🎉 Bulk fetching completed!');
        $this->info("📊 Total books fetched: {$totalFetched}");
        $this->info("📈 Total books indexed: {$totalIndexed}");
        
        if ($errors > 0) {
            $this->warn("⚠️ Total errors: {$errors}");
        }

        // Show current database stats
        $totalBooks = Book::count();
        $this->info("📚 Total books in database: {$totalBooks}");

        return 0;
    }

    /**
     * Fetch books for a specific search term
     */
    private function fetchBooksForTerm(string $term, int $maxBooks, int $delay, bool $isDryRun): array
    {
        $fetched = 0;
        $indexed = 0;
        $errors = 0;
        $maxResults = 40; // Google Books API limit per request
        $startIndex = 0;
        $booksToIndex = [];

        while ($fetched < $maxBooks) {
            $remaining = $maxBooks - $fetched;
            $currentBatch = min($maxResults, $remaining);

            if ($isDryRun) {
                $this->line("  Would fetch {$currentBatch} books starting at index {$startIndex}");
                $fetched += $currentBatch;
                $startIndex += $currentBatch;
                continue;
            }

            try {
                $searchResults = $this->googleBooksService->searchBooks($term, $currentBatch, $startIndex);
                $processedResults = $this->googleBooksService->processSearchResults($searchResults);

                if (empty($processedResults['books'])) {
                    $this->line("  No more books found for '{$term}' at index {$startIndex}");
                    break;
                }

                foreach ($processedResults['books'] as $bookData) {
                    try {
                        // Check if book already exists
                        $existingBook = Book::where('google_books_id', $bookData['google_books_id'])->first();
                        
                        if (!$existingBook) {
                            // Store new book
                            $book = $this->googleBooksService->storeBookFromGoogleData($bookData);
                            $booksToIndex[] = $book;
                            $fetched++;
                        }
                    } catch (\Exception $e) {
                        $errors++;
                        $this->line("    Error storing book: " . $e->getMessage());
                    }
                }

                // Batch index every 20 books for better performance
                if (count($booksToIndex) >= 20) {
                    try {
                        $this->algoliaService->indexBooks($booksToIndex);
                        $indexed += count($booksToIndex);
                        $booksToIndex = [];
                    } catch (\Exception $e) {
                        $errors++;
                        $this->line("    Error indexing batch: " . $e->getMessage());
                    }
                }

                $startIndex += $currentBatch;
                
                // Respect API rate limits
                sleep($delay);
                
            } catch (\Exception $e) {
                $errors++;
                $this->line("    API Error: " . $e->getMessage());
                $startIndex += $currentBatch;
                sleep($delay * 2); // Longer delay on errors
            }
        }

        // Index remaining books
        if (!$isDryRun && !empty($booksToIndex)) {
            try {
                $this->algoliaService->indexBooks($booksToIndex);
                $indexed += count($booksToIndex);
            } catch (\Exception $e) {
                $errors++;
                $this->line("    Error indexing final batch: " . $e->getMessage());
            }
        }

        return [
            'fetched' => $fetched,
            'indexed' => $indexed,
            'errors' => $errors,
        ];
    }

    /**
     * Get search terms for bulk fetching
     */
    private function getSearchTerms(): array
    {
        $customTerms = $this->option('terms');
        
        if ($customTerms) {
            return array_map('trim', explode(',', $customTerms));
        }

        // Popular book categories and topics for diverse collection
        return [
            // Fiction genres
            'science fiction',
            'fantasy',
            'mystery',
            'thriller',
            'romance',
            'historical fiction',
            'literary fiction',
            'dystopian',
            
            // Non-fiction categories
            'biography',
            'history',
            'psychology',
            'philosophy',
            'self help',
            'business',
            'technology',
            'science',
            
            // Popular topics
            'programming',
            'artificial intelligence',
            'climate change',
            'economics',
            'politics',
            'health',
            'cooking',
            'travel',
            
            // Classic subjects
            'literature',
            'poetry',
            'drama',
            'mathematics',
            'physics',
            'chemistry',
            'biology',
            'medicine',
            
            // Contemporary interests
            'cryptocurrency',
            'machine learning',
            'data science',
            'web development',
            'entrepreneurship',
            'mindfulness',
            'fitness',
            'nutrition',
        ];
    }
}
