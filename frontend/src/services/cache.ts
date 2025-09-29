interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private rateLimits = new Map<string, RateLimitEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 30;

  /**
   * Get data from cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: ttl,
    });
  }

  /**
   * Check if a request is rate limited
   */
  isRateLimited(endpoint: string): boolean {
    const now = Date.now();
    const rateLimitKey = `rate_limit:${endpoint}`;
    const entry = this.rateLimits.get(rateLimitKey);

    if (!entry) {
      this.rateLimits.set(rateLimitKey, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return false;
    }

    // Reset if window has passed
    if (now > entry.resetTime) {
      this.rateLimits.set(rateLimitKey, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return false;
    }

    // Check if limit exceeded
    if (entry.count >= this.MAX_REQUESTS_PER_MINUTE) {
      return true;
    }

    // Increment counter
    entry.count++;
    return false;
  }

  /**
   * Get time until rate limit resets
   */
  getRateLimitResetTime(endpoint: string): number {
    const rateLimitKey = `rate_limit:${endpoint}`;
    const entry = this.rateLimits.get(rateLimitKey);
    
    if (!entry) {
      return 0;
    }

    return Math.max(0, entry.resetTime - Date.now());
  }

  /**
   * Clear expired entries from cache
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean cache
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.expiresIn) {
        this.cache.delete(key);
      }
    }

    // Clean rate limits
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries by pattern
   */
  clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; rateLimits: number } {
    return {
      size: this.cache.size,
      rateLimits: this.rateLimits.size,
    };
  }
}

// Create singleton instance
export const cacheManager = new CacheManager();

// Cleanup every 5 minutes
setInterval(() => {
  cacheManager.cleanup();
}, 5 * 60 * 1000);

// Cache key generators
export const CacheKeys = {
  featuredBooks: () => 'featured_books',
  searchResults: (query: string, page: number, perPage: number) => 
    `search:${query}:${page}:${perPage}`,
  bookDetails: (id: string) => `book:${id}`,
  suggestions: (query: string) => `suggestions:${query}`,
  userFavorites: (page: number, perPage: number) => `favorites:${page}:${perPage}`,
  booksList: (page: number, perPage: number, sort: string, order: string) => 
    `books:${page}:${perPage}:${sort}:${order}`,
};

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  FEATURED_BOOKS: 30 * 60 * 1000, // 30 minutes
  SEARCH_RESULTS: 10 * 60 * 1000, // 10 minutes
  BOOK_DETAILS: 60 * 60 * 1000, // 1 hour
  SUGGESTIONS: 15 * 60 * 1000, // 15 minutes
  USER_FAVORITES: 5 * 60 * 1000, // 5 minutes
  BOOKS_LIST: 10 * 60 * 1000, // 10 minutes
};

export default cacheManager;
