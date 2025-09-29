<?php

namespace App\Console\Commands;

use App\Services\GoogleBooksService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class WarmSuggestionsCache extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'suggestions:warm 
                           {--popular-only : Only warm cache for most popular terms}
                           {--limit=100 : Maximum number of terms to warm}';

    /**
     * The console command description.
     */
    protected $description = 'Pre-warm the suggestions cache with popular search terms for instant responses';

    private GoogleBooksService $googleBooksService;

    public function __construct(GoogleBooksService $googleBooksService)
    {
        parent::__construct();
        $this->googleBooksService = $googleBooksService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔥 Warming suggestions cache for instant responses...');

        $popularTerms = $this->getPopularSearchTerms();
        $limit = (int) $this->option('limit');
        $popularOnly = $this->option('popular-only');

        if ($popularOnly) {
            $terms = array_slice($popularTerms, 0, min(20, $limit));
        } else {
            $terms = array_slice($this->getAllSearchTerms(), 0, $limit);
        }

        $this->info("🎯 Pre-warming cache for " . count($terms) . " search terms...");
        
        $progress = $this->output->createProgressBar(count($terms));
        $progress->start();

        $warmed = 0;
        $errors = 0;

        foreach ($terms as $term) {
            try {
                // Pre-fetch suggestions to warm the cache
                $suggestions = $this->googleBooksService->getSearchSuggestions($term, 5);
                
                if (!empty($suggestions)) {
                    $warmed++;
                }
                
                // Small delay to respect API limits
                usleep(200000); // 200ms delay
                
            } catch (\Exception $e) {
                $errors++;
                $this->newLine();
                $this->error("Failed to warm cache for '{$term}': " . $e->getMessage());
            }
            
            $progress->advance();
        }

        $progress->finish();
        $this->newLine(2);

        $this->info("✅ Cache warming completed!");
        $this->info("🎯 Successfully warmed: {$warmed} terms");
        
        if ($errors > 0) {
            $this->warn("⚠️ Errors: {$errors} terms");
        }

        // Show cache statistics
        $this->showCacheStats();

        return 0;
    }

    /**
     * Get popular search terms
     */
    private function getPopularSearchTerms(): array
    {
        return [
            // Single letters (most common)
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
            
            // Two-letter combinations (very common)
            'th', 'he', 'in', 'er', 'an', 're', 'ed', 'nd', 'on', 'en', 'at', 'ou', 'it', 'is', 'or', 'ti', 'hi', 'st', 'io', 'le', 'as', 'ar', 'ri', 'ro',
            
            // Popular subjects
            'math', 'science', 'history', 'art', 'music', 'cook', 'travel', 'business', 'tech', 'self',
            'python', 'java', 'javascript', 'react', 'node', 'web', 'mobile', 'data', 'machine', 'learn',
            'fiction', 'novel', 'romance', 'mystery', 'fantasy', 'thriller', 'horror', 'adventure',
            'health', 'fitness', 'diet', 'mind', 'brain', 'psychology', 'philosophy', 'religion',
        ];
    }

    /**
     * Get all search terms including prefixes
     */
    private function getAllSearchTerms(): array
    {
        $popular = $this->getPopularSearchTerms();
        
        // Add common prefixes
        $prefixes = [];
        $subjects = ['programming', 'mathematics', 'psychology', 'philosophy', 'science', 'history', 'business', 'technology'];
        
        foreach ($subjects as $subject) {
            for ($i = 1; $i <= strlen($subject); $i++) {
                $prefixes[] = substr($subject, 0, $i);
            }
        }
        
        return array_merge($popular, $prefixes);
    }

    /**
     * Show cache statistics
     */
    private function showCacheStats(): void
    {
        $this->info("\n📊 Cache Statistics:");
        
        // Count cached suggestion entries
        $cacheKeys = [
            'suggestions' => 0,
            'prefix_suggestions' => 0,
        ];
        
        // Note: This is a simplified view - in production you'd need Redis or another cache driver with key enumeration
        $this->info("Cache warming completed. Suggestions should now be instant for popular terms!");
        $this->info("Popular single-letter and two-letter queries are pre-cached for maximum speed.");
    }
}
