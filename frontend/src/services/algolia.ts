import { searchClient, isAlgoliaConfigured, ALGOLIA_CONFIG, formatAlgoliaResults, createSearchState } from '../config/algolia';
import { booksAPI } from './api';
import type { Book } from '../types';

export interface SearchFilters {
  categories?: string[];
  authors?: string[];
  publisher?: string[];
  language?: string[];
  published_year?: string[];
  rating_range?: string[];
}

export interface AlgoliaSearchResult {
  books: Book[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  facets: Record<string, Record<string, number>>;
  processingTimeMS: number;
  source: string;
}

export interface SearchOptions {
  page?: number;
  hitsPerPage?: number;
  filters?: SearchFilters;
  forceBackend?: boolean;
}

/**
 * Algolia Search Service
 * Handles search operations with fallback to backend API
 */
class AlgoliaSearchService {
  /**
   * Search books using Algolia or fallback to backend
   */
  async searchBooks(
    query: string, 
    options: SearchOptions = {}
  ): Promise<AlgoliaSearchResult> {
    const {
      page = 1,
      hitsPerPage = 20,
      filters = {},
      forceBackend = false
    } = options;

    // If Algolia is not configured or force backend, use API
    if (!isAlgoliaConfigured || forceBackend || !searchClient) {
      return this.searchViaBackend(query, page, hitsPerPage, filters);
    }

    try {
      // Prepare search parameters
      const searchParams = createSearchState(query, page);
      searchParams.hitsPerPage = hitsPerPage;

      // Add filters if provided
      if (Object.keys(filters).length > 0) {
        const facetFilters: string[][] = [];
        
        Object.entries(filters).forEach(([facet, values]) => {
          if (values && values.length > 0) {
            // For OR within a facet, use array of strings
            // For AND between facets, use separate arrays
            facetFilters.push(values.map((value: string) => `${facet}:${value}`));
          }
        });

        if (facetFilters.length > 0) {
          (searchParams as any).facetFilters = facetFilters;
        }
      }

      // Perform search
      const results = await searchClient.searchSingleIndex({
        indexName: ALGOLIA_CONFIG.indexName,
        searchParams: {
          ...searchParams,
        }
      });

      return formatAlgoliaResults(results);

    } catch (error) {
      console.warn('Algolia search failed, falling back to backend:', error);
      return this.searchViaBackend(query, page, hitsPerPage, filters);
    }
  }

  /**
   * Search using backend API
   */
  private async searchViaBackend(
    query: string,
    page: number,
    hitsPerPage: number,
    filters: SearchFilters
  ): Promise<AlgoliaSearchResult> {
    try {
      const response = await booksAPI.search({
        q: query,
        page,
        per_page: hitsPerPage,
        filters,
      } as any);

      if (response.data.success && response.data.data) {
        return {
          books: response.data.data.books,
          pagination: response.data.data.pagination,
          facets: (response.data.data as any).facets || {},
          processingTimeMS: 0,
          source: (response.data.data as any).source || 'backend',
        };
      } else {
        throw new Error(response.data.message || 'Search failed');
      }
    } catch (error: any) {
      console.error('Backend search failed:', error);
      throw new Error(error.response?.data?.message || error.message || 'Search failed');
    }
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSearchSuggestions(query: string, maxSuggestions: number = 5): Promise<string[]> {
    if (!isAlgoliaConfigured || !searchClient || query.length < 2) {
      return [];
    }

    try {
      const results = await searchClient.searchSingleIndex({
        indexName: ALGOLIA_CONFIG.indexName,
        searchParams: {
          query,
          hitsPerPage: maxSuggestions * 2, // Get more to filter
          attributesToRetrieve: ['title', 'authors'],
          attributesToHighlight: [],
          attributesToSnippet: [],
        }
      });

      // Extract unique suggestions from titles and authors
      const suggestions = new Set<string>();
      
      results.hits.forEach((hit: any) => {
        // Add title if it contains the query
        if (hit.title && hit.title.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(hit.title);
        }
        
        // Add author names if they contain the query
        if (hit.authors && Array.isArray(hit.authors)) {
          hit.authors.forEach((author: string) => {
            if (author.toLowerCase().includes(query.toLowerCase())) {
              suggestions.add(author);
            }
          });
        }
      });

      return Array.from(suggestions).slice(0, maxSuggestions);

    } catch (error) {
      console.warn('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Get facet values for filtering
   */
  async getFacetValues(facetName: string, query: string = ''): Promise<Array<{value: string, count: number}>> {
    if (!isAlgoliaConfigured || !searchClient) {
      return [];
    }

    try {
      const results = await searchClient.searchForFacetValues({
        indexName: ALGOLIA_CONFIG.indexName,
        facetName,
        facetQuery: query,
        maxFacetHits: 20,
      } as any);

      return results.facetHits.map((hit: any) => ({
        value: hit.value,
        count: hit.count,
      }));

    } catch (error) {
      console.warn(`Failed to get facet values for ${facetName}:`, error);
      return [];
    }
  }

  /**
   * Check if Algolia is available
   */
  isAvailable(): boolean {
    return isAlgoliaConfigured && searchClient !== null;
  }

  /**
   * Get search analytics (if using Algolia Insights)
   */
  trackSearchClick(objectID: string, position: number, queryID?: string): void {
    // This would integrate with Algolia Insights for analytics
    // For now, we'll just log it
    console.log('Search click tracked:', { objectID, position, queryID });
  }

  /**
   * Track search conversion (when user favorites a book from search)
   */
  trackSearchConversion(objectID: string, queryID?: string): void {
    // This would integrate with Algolia Insights for analytics
    console.log('Search conversion tracked:', { objectID, queryID });
  }

  /**
   * Get random high-quality books for featured section
   */
  async getRandomFeaturedBooks(count: number = 8): Promise<Book[]> {
    if (!isAlgoliaConfigured || !searchClient) {
      return [];
    }

    try {
      // Search for high-rated books with empty query to get all books
      const results = await searchClient.searchSingleIndex({
        indexName: ALGOLIA_CONFIG.indexName,
        searchParams: {
          query: '', // Empty query to get all books
          hitsPerPage: 200, // Get a large pool for better randomization
          filters: 'average_rating >= 3.5', // Only high-rated books
          attributesToRetrieve: [
            'id', 'google_books_id', 'title', 'authors', 'description',
            'thumbnail', 'average_rating', 'ratings_count', 'published_date',
            'publisher', 'page_count', 'categories', 'language', 'isbn_10', 'isbn_13',
            'preview_link', 'info_link'
          ],
        }
      });

      if (!results.hits || results.hits.length === 0) {
        return [];
      }

      // Filter for quality books with required fields
      const qualityBooks = results.hits
        .filter((hit: any) => 
          hit.title && 
          hit.authors && 
          hit.authors.length > 0 &&
          hit.thumbnail &&
          hit.average_rating >= 3.5
        )
        .map((hit: any) => ({
          id: hit.id || hit.objectID,
          google_books_id: hit.google_books_id || hit.objectID,
          title: hit.title,
          authors: Array.isArray(hit.authors) ? hit.authors : [hit.authors],
          description: hit.description || '',
          thumbnail: hit.thumbnail,
          small_thumbnail: hit.small_thumbnail || hit.thumbnail,
          average_rating: hit.average_rating,
          ratings_count: hit.ratings_count || 0,
          published_date: hit.published_date,
          publisher: hit.publisher || '',
          page_count: hit.page_count || 0,
          categories: Array.isArray(hit.categories) ? hit.categories : (hit.categories ? [hit.categories] : []),
          language: hit.language || 'en',
          isbn_10: hit.isbn_10 || '',
          isbn_13: hit.isbn_13 || '',
          preview_link: hit.preview_link || '',
          info_link: hit.info_link || '',
          created_at: hit.created_at || new Date().toISOString(),
          updated_at: hit.updated_at || new Date().toISOString(),
        })) as Book[];

      // Randomly shuffle and select the requested count
      const shuffled = [...qualityBooks].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);

      console.log(`Selected ${selected.length} random featured books from ${qualityBooks.length} quality books`);
      
      return selected;

    } catch (error) {
      console.error('Failed to get random featured books from Algolia:', error);
      return [];
    }
  }
}

// Export singleton instance
export const algoliaSearchService = new AlgoliaSearchService();

// Export utilities
export { isAlgoliaConfigured };
