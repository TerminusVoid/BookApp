import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cachedApi } from '../services/cachedApi';
import { algoliaSearchService, isAlgoliaConfigured } from '../services/algolia';
import type { Book } from '../types';
import type { SearchFilters } from '../services/algolia';
import BookCard from '../components/BookCard';
import SearchBar from '../components/SearchBar';

const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'newest'>('relevance');
  const [filters] = useState<SearchFilters>({});
  const [searchSource, setSearchSource] = useState<string>('');
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  });

  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sort = searchParams.get('sort') as 'relevance' | 'newest' || 'relevance';

  useEffect(() => {
    setSortBy(sort);
    if (query) {
      searchBooks(query, page, sort);
    }
  }, [query, page, sort]);

  const searchBooks = async (searchQuery: string, pageNum: number = 1, sortOrder: string = 'relevance') => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      
      // Use Algolia service if available, otherwise fallback to API
      const useAlgolia = isAlgoliaConfigured && algoliaSearchService.isAvailable();
      
      if (useAlgolia) {
        // Search using Algolia
        const startTime = Date.now();
        const results = await algoliaSearchService.searchBooks(searchQuery, {
          page: pageNum,
          hitsPerPage: 20,
          filters,
          forceBackend: sortOrder === 'newest', // Use backend for custom sorting
        });
        
        setProcessingTime(results.processingTimeMS || (Date.now() - startTime));
        setSearchSource(results.source);
        
        let sortedBooks = results.books;
        
        // Apply client-side sorting if needed
        if (sortOrder === 'newest' && results.source !== 'backend') {
          sortedBooks = [...sortedBooks].sort((a, b) => {
            const dateA = new Date(a.published_date || '1900-01-01').getTime();
            const dateB = new Date(b.published_date || '1900-01-01').getTime();
            return dateB - dateA;
          });
        }
        
        setBooks(sortedBooks);
        setPagination({
          current_page: results.pagination.current_page,
          per_page: results.pagination.per_page,
          total: results.pagination.total,
          total_pages: results.pagination.total_pages,
        });
        
      } else {
        // Fallback to cached API search
        const response = await cachedApi.searchBooks({
          q: searchQuery,
          page: pageNum,
          per_page: 20,
        });

        if (response.data.success && response.data.data) {
          let sortedBooks = response.data.data.books;
          
          // Apply client-side sorting
          if (sortOrder === 'newest') {
            sortedBooks = [...sortedBooks].sort((a, b) => {
              const dateA = new Date(a.published_date || '1900-01-01').getTime();
              const dateB = new Date(b.published_date || '1900-01-01').getTime();
              return dateB - dateA;
            });
          }
          // 'relevance' keeps the original order from the API
          
          setBooks(sortedBooks);
          setPagination({
            ...response.data.data.pagination,
            current_page: parseInt(String(response.data.data.pagination.current_page), 10),
            per_page: parseInt(String(response.data.data.pagination.per_page), 10),
            total: parseInt(String(response.data.data.pagination.total), 10),
            total_pages: parseInt(String(response.data.data.pagination.total_pages), 10),
          });
          setSearchSource('cached_api');
          setProcessingTime(0);
        } else {
          setError('Search failed. Please try again.');
        }
      }
      
    } catch (err: any) {
      setError('Failed to search books. Please try again.');
      console.error('Search error:', err);
      setSearchSource('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (newQuery: string) => {
    navigate(`/search?q=${encodeURIComponent(newQuery)}`);
  };

  const handleSortChange = (newSort: 'relevance' | 'newest') => {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('sort', newSort);
    navigate(`/search?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    params.set('q', query);
    if (newPage > 1) {
      params.set('page', String(newPage));
    }
    if (sortBy !== 'relevance') {
      params.set('sort', sortBy);
    }
    navigate(`/search?${params.toString()}`);
  };

  const renderPagination = () => {
    if (pagination.total_pages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, pagination.current_page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.total_pages, startPage + maxVisiblePages - 1);

    // Previous button
    if (pagination.current_page > 1) {
      pages.push(
        <button
          key="prev"
          onClick={() => handlePageChange(Number(pagination.current_page) - 1)}
          className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          Previous
        </button>
      );
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 text-sm font-medium border ${
            i === pagination.current_page
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          {i}
        </button>
      );
    }

    // Next button
    if (pagination.current_page < pagination.total_pages) {
      pages.push(
        <button
          key="next"
          onClick={() => handlePageChange(Number(pagination.current_page) + 1)}
          className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-r-md hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          Next
        </button>
      );
    }

    return (
      <div className="flex justify-center mt-8">
        <nav className="flex" aria-label="Pagination">
          {pages}
        </nav>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/20 p-6 border border-transparent dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Search Books</h1>
        <SearchBar 
          onSearch={handleSearch}
          initialValue={query}
          placeholder="Search for books by title, author, or topic..."
          clearOnRouteChange={false}
        />
      </div>

      {/* Search Results */}
      {query && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Search Results for "{query}"
              </h2>
              {searchSource && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {searchSource === 'algolia' && '⚡ Powered by Algolia'}
                    {searchSource === 'algolia_updated' && '⚡ Algolia + Google Books'}
                    {searchSource === 'google_books' && '📚 Google Books API'}
                    {searchSource === 'api' && '📚 Google Books API'}
                    {searchSource === 'backend' && '🔍 Enhanced Search'}
                    {searchSource === 'algolia_fallback' && '⚡ Algolia (Limited)'}
                    {searchSource === 'google_books_fallback' && '📚 Google Books (Fallback)'}
                  </span>
                  {processingTime > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      ({processingTime}ms)
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Sort Filter */}
              <div className="flex items-center gap-2">
                <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort by:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as 'relevance' | 'newest')}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
              {pagination.total > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((pagination.current_page - 1) * pagination.per_page) + 1} - {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} results
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-gray-300 h-64 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Search Error</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={() => searchBooks(query, page, sortBy)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : books.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
              {renderPagination()}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No books found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try searching with different keywords or check your spelling.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Default state when no search query */}
      {!query && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Start your search</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Enter a book title, author name, or topic to find your next great read.
          </p>
        </div>
      )}
    </div>
  );
};

export default Search;
