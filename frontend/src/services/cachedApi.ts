import { booksAPI, authAPI, favoritesAPI } from './api';
import { cacheManager, CacheKeys, CacheTTL } from './cache';
import { algoliaSearchService, isAlgoliaConfigured } from './algolia';
import type { Book } from '../types';

class CachedApiService {
  /**
   * Generic cached request wrapper
   */
  private async cachedRequest<T>(
    cacheKey: string,
    apiCall: () => Promise<T>,
    ttl: number,
    endpoint: string
  ): Promise<T> {
    // Check cache first
    const cached = cacheManager.get<T>(cacheKey);
    if (cached) {
      console.log(`Cache HIT for ${cacheKey}`);
      return cached;
    }

    // Check rate limiting
    if (cacheManager.isRateLimited(endpoint)) {
      const resetTime = cacheManager.getRateLimitResetTime(endpoint);
      throw new Error(`Rate limited. Try again in ${Math.ceil(resetTime / 1000)} seconds.`);
    }

    console.log(`Cache MISS for ${cacheKey} - making API call`);
    
    try {
      const result = await apiCall();
      cacheManager.set(cacheKey, result, ttl);
      return result;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Search books with caching and rate limiting
   */
  async searchBooks(params: { q: string; page?: number; per_page?: number }) {
    const { q, page = 1, per_page = 20 } = params;
    const cacheKey = CacheKeys.searchResults(q, page, per_page);
    
    return this.cachedRequest(
      cacheKey,
      () => booksAPI.search(params),
      CacheTTL.SEARCH_RESULTS,
      'books/search'
    );
  }

  /**
   * Get book details with caching
   */
  async getBook(id: string) {
    const cacheKey = CacheKeys.bookDetails(id);
    
    return this.cachedRequest(
      cacheKey,
      () => booksAPI.getBook(id),
      CacheTTL.BOOK_DETAILS,
      `books/${id}`
    );
  }

  /**
   * Get search suggestions with caching
   */
  async getSuggestions(params: { q: string; limit?: number }) {
    const cacheKey = CacheKeys.suggestions(params.q);
    
    return this.cachedRequest(
      cacheKey,
      () => booksAPI.suggestions(params),
      CacheTTL.SUGGESTIONS,
      'books/suggestions'
    );
  }

  /**
   * Get books list with caching
   */
  async getBooks(params?: { page?: number; per_page?: number; sort?: string; order?: string }) {
    const { page = 1, per_page = 20, sort = 'created_at', order = 'desc' } = params || {};
    const cacheKey = CacheKeys.booksList(page, per_page, sort, order);
    
    return this.cachedRequest(
      cacheKey,
      () => booksAPI.getBooks(params),
      CacheTTL.BOOKS_LIST,
      'books'
    );
  }

  /**
   * Get user favorites with caching
   */
  async getFavorites(params?: { page?: number; per_page?: number }) {
    const { page = 1, per_page = 20 } = params || {};
    const cacheKey = CacheKeys.userFavorites(page, per_page);
    
    return this.cachedRequest(
      cacheKey,
      () => favoritesAPI.getFavorites(params),
      CacheTTL.USER_FAVORITES,
      'favorites'
    );
  }

  /**
   * Add favorite (invalidates favorites cache)
   */
  async addFavorite(book_id: number) {
    const result = await favoritesAPI.addFavorite(book_id);
    
    // Invalidate favorites cache
    cacheManager.clearByPattern('^favorites:');
    
    return result;
  }

  /**
   * Remove favorite (invalidates favorites cache)
   */
  async removeFavorite(bookId: number) {
    const result = await favoritesAPI.removeFavorite(bookId);
    
    // Invalidate favorites cache
    cacheManager.clearByPattern('^favorites:');
    
    return result;
  }

  /**
   * Toggle favorite (invalidates favorites cache)
   */
  async toggleFavorite(book_id: number) {
    const result = await favoritesAPI.toggleFavorite(book_id);
    
    // Invalidate favorites cache
    cacheManager.clearByPattern('^favorites:');
    
    return result;
  }

  /**
   * Get featured books with instant Algolia search and random selection
   */
  async getFeaturedBooks(): Promise<Book[]> {
    const cacheKey = CacheKeys.featuredBooks();
    
    // Check cache first
    const cached = cacheManager.get<Book[]>(cacheKey);
    if (cached && cached.length === 8) {
      console.log('Cache HIT for featured books');
      return cached;
    }

    console.log('Cache MISS for featured books - fetching from Algolia');

    let featuredBooks: Book[] = [];

    try {
      // Use Algolia for instant results if available
      if (isAlgoliaConfigured && algoliaSearchService.isAvailable()) {
        console.log('Using Algolia for instant featured books');
        
        // Use the optimized method to get random featured books directly
        featuredBooks = await algoliaSearchService.getRandomFeaturedBooks(8);
        
        if (featuredBooks.length > 0) {
          console.log(`Got ${featuredBooks.length} featured books instantly from Algolia`);
        }
      }

      // Fallback to API search if Algolia didn't provide enough books
      if (featuredBooks.length < 8) {
        console.log('Algolia insufficient, using API fallback');
        
        // Try different search terms to get variety
        const searchTerms = [
          'bestseller',
          'popular fiction',
          'classic literature',
          'science',
          'history',
          'biography'
        ];

        const allBooks: Book[] = [];

        // Search with different terms to get variety
        for (const term of searchTerms.slice(0, 3)) {
          try {
            const response = await this.searchBooks({
              q: term,
              per_page: 15
            });

            if (response.data.success && response.data.data) {
              const termBooks = response.data.data.books
                .filter(book => 
                  book.average_rating && 
                  book.average_rating >= 3.5 &&
                  book.thumbnail &&
                  book.title &&
                  book.authors
                );
              allBooks.push(...termBooks);
            }
          } catch (termErr) {
            console.warn(`Failed to fetch books for term "${term}":`, termErr);
          }
        }

        if (allBooks.length > 0) {
          // Remove duplicates
          const uniqueBooks = allBooks.filter((book, index, self) => 
            index === self.findIndex(b => b.google_books_id === book.google_books_id)
          );

          // Sort by rating and shuffle
          const topBooks = uniqueBooks
            .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
            .slice(0, 30) // Get top 30
            .sort(() => Math.random() - 0.5); // Shuffle

          // Combine with Algolia results if any, ensuring we get 8 total
          const combined = [...featuredBooks, ...topBooks];
          const uniqueCombined = combined.filter((book, index, self) => 
            index === self.findIndex(b => b.google_books_id === book.google_books_id)
          );

          featuredBooks = uniqueCombined.slice(0, 8);
        }
      }

      // Ensure we have exactly 8 books
      if (featuredBooks.length < 8) {
        console.warn(`Only found ${featuredBooks.length} featured books, expected 8`);
      }

    } catch (error) {
      console.error('Error fetching featured books:', error);
      featuredBooks = [];
    }

    // Cache for 30 minutes only if we have books
    if (featuredBooks.length > 0) {
      cacheManager.set(cacheKey, featuredBooks, CacheTTL.FEATURED_BOOKS);
    }
    
    return featuredBooks;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    cacheManager.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheManager.getStats();
  }
}

// Create singleton instance
export const cachedApi = new CachedApiService();

// Re-export auth API (no caching needed for auth operations)
export { authAPI };

export default cachedApi;
