import React, { useState, useEffect } from 'react';
import { favoritesAPI } from '../services/api';
import type { Book } from '../types';
import BookCard from '../components/BookCard';

const Favorites: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  });

  useEffect(() => {
    fetchFavorites(1);
  }, []);

  const fetchFavorites = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await favoritesAPI.getFavorites({
        page,
        per_page: 20,
      });

      if (response.data.success && response.data.data) {
        setBooks(response.data.data.books);
        setPagination({
          ...response.data.data.pagination,
          current_page: parseInt(response.data.data.pagination.current_page, 10),
          per_page: parseInt(response.data.data.pagination.per_page, 10),
          total: parseInt(response.data.data.pagination.total, 10),
          total_pages: parseInt(response.data.data.pagination.total_pages, 10),
        });
      } else {
        setError('Failed to load favorites');
      }
    } catch (err: any) {
      setError('Failed to load favorites');
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteChange = (bookId: number, isFavorited: boolean) => {
    if (!isFavorited) {
      // Remove book from the list when unfavorited
      setBooks(books.filter(book => book.id !== bookId));
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1,
      }));
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchFavorites(newPage);
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
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/20 p-6 border border-transparent dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Favorites</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Books you've saved for later reading
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            {pagination.total > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {pagination.total} book{pagination.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Favorites List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-300 dark:bg-gray-600 h-64 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Favorites</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchFavorites(pagination.current_page)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : books.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book) => (
              <BookCard 
                key={book.id} 
                book={book} 
                isFavorited={true}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
          {renderPagination()}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No favorites yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Start exploring books and add them to your favorites to see them here.
          </p>
          <div className="space-x-4">
            <a
              href="/search"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors inline-block"
            >
              Search Books
            </a>
            <a
              href="/"
              className="text-primary-600 hover:text-primary-700 font-medium inline-block"
            >
              Browse Featured
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorites;
