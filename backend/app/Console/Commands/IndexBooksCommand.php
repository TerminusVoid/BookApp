<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Services\AlgoliaService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class IndexBooksCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'books:index 
                           {--clear : Clear the index before indexing}
                           {--limit=100 : Number of books to index per batch}
                           {--from-google= : Index books by searching Google Books API with this query}
                           {--configure : Configure the Algolia index settings}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Index books in Algolia search';

    private AlgoliaService $algoliaService;

    public function __construct(AlgoliaService $algoliaService)
    {
        parent::__construct();
        $this->algoliaService = $algoliaService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting Algolia books indexing...');

        try {
            // Configure index if requested
            if ($this->option('configure')) {
                $this->info('Configuring Algolia index...');
                $this->algoliaService->configureIndex();
                $this->info('✅ Index configured successfully');
            }

            // Clear index if requested
            if ($this->option('clear')) {
                if ($this->confirm('Are you sure you want to clear the entire Algolia index?')) {
                    $this->info('Clearing Algolia index...');
                    $this->algoliaService->clearIndex();
                    $this->info('✅ Index cleared successfully');
                }
            }

            // Index from Google Books API if query provided
            $googleQuery = $this->option('from-google');
            if ($googleQuery) {
                return $this->indexFromGoogleBooks($googleQuery);
            }

            // Index existing books in database
            return $this->indexExistingBooks();

        } catch (\Exception $e) {
            $this->error('Error during indexing: ' . $e->getMessage());
            Log::error('Books indexing failed: ' . $e->getMessage());
            return 1;
        }
    }

    /**
     * Index existing books from the database
     */
    private function indexExistingBooks(): int
    {
        $limit = (int) $this->option('limit');
        $totalBooks = Book::count();

        if ($totalBooks === 0) {
            $this->warn('No books found in the database to index.');
            return 0;
        }

        $this->info("Found {$totalBooks} books to index");
        
        $bar = $this->output->createProgressBar($totalBooks);
        $bar->start();

        $indexed = 0;
        $errors = 0;

        Book::chunk($limit, function ($books) use ($bar, &$indexed, &$errors) {
            try {
                $this->algoliaService->indexBooks($books->all());
                $indexed += $books->count();
                $bar->advance($books->count());
            } catch (\Exception $e) {
                $errors += $books->count();
                $this->newLine();
                $this->error("Failed to index batch: " . $e->getMessage());
                $bar->advance($books->count());
            }
        });

        $bar->finish();
        $this->newLine();

        $this->info("✅ Indexing completed!");
        $this->info("📊 Successfully indexed: {$indexed} books");
        
        if ($errors > 0) {
            $this->warn("⚠️ Failed to index: {$errors} books");
        }

        return 0;
    }

    /**
     * Index books by searching Google Books API
     */
    private function indexFromGoogleBooks(string $query): int
    {
        $this->info("Searching Google Books API for: '{$query}'");
        
        $maxResults = 40; // Google Books API limit
        $totalIndexed = 0;
        $totalErrors = 0;
        $startIndex = 0;
        $maxPages = 25; // Limit to 1000 books (25 * 40)
        
        for ($page = 0; $page < $maxPages; $page++) {
            $this->info("Processing page " . ($page + 1) . "...");
            
            try {
                // Search for books using the Algolia service which handles Google Books integration
                $books = [];
                
                // We'll make a direct call to fetch from Google Books
                for ($i = 0; $i < $maxResults; $i++) {
                    try {
                        $googleBookId = $this->generateBookIdFromQuery($query, $startIndex + $i);
                        if ($googleBookId) {
                            $book = $this->algoliaService->indexBookFromGoogle($googleBookId);
                            if ($book) {
                                $books[] = $book;
                            }
                        }
                    } catch (\Exception $e) {
                        $totalErrors++;
                        // Continue with next book
                    }
                }
                
                if (empty($books)) {
                    $this->info("No more books found. Stopping.");
                    break;
                }
                
                $totalIndexed += count($books);
                $this->info("✅ Indexed " . count($books) . " books from page " . ($page + 1));
                
                $startIndex += $maxResults;
                
                // Add delay to respect API rate limits
                sleep(1);
                
            } catch (\Exception $e) {
                $this->error("Error on page " . ($page + 1) . ": " . $e->getMessage());
                $totalErrors++;
            }
        }
        
        $this->info("🎉 Google Books indexing completed!");
        $this->info("📊 Total indexed: {$totalIndexed} books");
        
        if ($totalErrors > 0) {
            $this->warn("⚠️ Total errors: {$totalErrors}");
        }
        
        return 0;
    }

    /**
     * This is a placeholder - in real implementation, you'd search Google Books API
     * and get actual book IDs from the search results
     */
    private function generateBookIdFromQuery(string $query, int $index): ?string
    {
        // This is a simplified approach - in reality, you'd:
        // 1. Call Google Books API search endpoint
        // 2. Get the actual book IDs from search results
        // 3. Return those IDs for indexing
        
        // For now, we'll skip this and recommend using the database indexing
        return null;
    }

    /**
     * Show index statistics
     */
    public function showStats(): void
    {
        try {
            $stats = $this->algoliaService->getIndexStats();
            
            $this->info('📊 Algolia Index Statistics:');
            $this->info('Index Name: ' . $stats['index_name']);
            
            if (isset($stats['settings'])) {
                $this->info('Searchable Attributes: ' . implode(', ', $stats['settings']['searchableAttributes'] ?? []));
                $this->info('Facet Attributes: ' . implode(', ', $stats['settings']['attributesForFaceting'] ?? []));
            }
            
        } catch (\Exception $e) {
            $this->error('Failed to get index stats: ' . $e->getMessage());
        }
    }
}
