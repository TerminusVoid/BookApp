import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cachedApi } from '../services/cachedApi';
import type { Book } from '../types';
import BookCard from '../components/BookCard.tsx';
import SearchBar from '../components/SearchBar';

const Home: React.FC = () => {
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadSource, setLoadSource] = useState<'cache' | 'algolia' | 'api' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeaturedBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const startTime = Date.now();
        const books = await cachedApi.getFeaturedBooks();
        const loadTime = Date.now() - startTime;
        
        // Determine load source based on timing
        if (loadTime < 50) {
          setLoadSource('cache');
        } else if (loadTime < 500) {
          setLoadSource('algolia');
        } else {
          setLoadSource('api');
        }
        
        // Debug: Log the selected books
        console.log(`Featured books loaded: ${books.length}/8 books in ${loadTime}ms`);
        console.log('Featured books:', books.map(book => ({
          title: book.title,
          google_books_id: book.google_books_id,
          id: book.id,
          rating: book.average_rating,
          hasImage: !!book.thumbnail
        })));
        
        setFeaturedBooks(books);
        
        // Show warning if we don't have 8 books
        if (books.length < 8) {
          console.warn(`Expected 8 featured books, got ${books.length}`);
        }
      } catch (err: any) {
        console.error('Error fetching featured books:', err);
        
        // Handle rate limiting gracefully
        if (err.message?.includes('Rate limited')) {
          setError('Too many requests. Please wait a moment and refresh the page.');
        } else {
          setError('Failed to load featured books');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedBooks();
  }, []);

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl text-white">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Discover Your Next Great Read
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-100">
            Search through millions of books and build your personal library
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="[&_input]:text-gray-900 [&_input]:placeholder-gray-500 [&_input]:bg-white dark:[&_input]:bg-white dark:[&_input]:text-gray-900 dark:[&_input]:placeholder-gray-500">
              <SearchBar 
                onSearch={handleSearch}
                placeholder="Search for books, authors, or topics..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* New Books Section */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Instant Search</h3>
          <p className="text-gray-600 dark:text-gray-300">Find books instantly with our powerful search engine powered by Google Books API</p>
        </div>
        
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Save Favorites</h3>
          <p className="text-gray-600 dark:text-gray-300">Create your personal library by saving books you love or want to read</p>
        </div>
        
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Detailed Info</h3>
          <p className="text-gray-600 dark:text-gray-300">Get comprehensive information about books including ratings, descriptions, and more</p>
        </div>
      </section>

      {/* Featured Books Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Featured Books</h2>
            {loadSource && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                loadSource === 'cache' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                  : loadSource === 'algolia'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
              }`}>
                {loadSource === 'cache' && '⚡ Cached'}
                {loadSource === 'algolia' && '🔍 Algolia'}
                {loadSource === 'api' && '📡 API'}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/search')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Search Books →
          </button>
        </div>

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
            <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : featuredBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No books found. Start by searching for some books!</p>
            <button
              onClick={() => navigate('/search')}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Search Books
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
