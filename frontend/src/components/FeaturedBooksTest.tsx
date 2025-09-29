import React, { useState } from 'react';
import { cachedApi } from '../services/cachedApi';
import { algoliaSearchService } from '../services/algolia';
import type { Book } from '../types';

const FeaturedBooksTest: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFeaturedBooks = async () => {
    setLoading(true);
    setTestResults([]);
    setBooks([]);

    try {
      addResult('🧪 Testing featured books from Algolia...');
      
      const start = Date.now();
      const featuredBooks = await cachedApi.getFeaturedBooks();
      const time = Date.now() - start;
      
      addResult(`⚡ Got ${featuredBooks.length} books in ${time}ms`);
      
      if (featuredBooks.length === 8) {
        addResult('✅ Perfect! Got exactly 8 books');
      } else {
        addResult(`⚠️ Expected 8 books, got ${featuredBooks.length}`);
      }

      // Check book quality
      const booksWithRatings = featuredBooks.filter(book => book.average_rating && book.average_rating >= 3.5);
      const booksWithThumbnails = featuredBooks.filter(book => book.thumbnail);
      const booksWithAuthors = featuredBooks.filter(book => book.authors && book.authors.length > 0);

      addResult(`📊 Quality check: ${booksWithRatings.length}/8 have good ratings`);
      addResult(`🖼️ Quality check: ${booksWithThumbnails.length}/8 have thumbnails`);
      addResult(`👥 Quality check: ${booksWithAuthors.length}/8 have authors`);

      setBooks(featuredBooks);

      // Test caching
      addResult('🔄 Testing cache hit...');
      const cacheStart = Date.now();
      await cachedApi.getFeaturedBooks();
      const cacheTime = Date.now() - cacheStart;
      addResult(`⚡ Cache hit in ${cacheTime}ms (should be <10ms)`);

    } catch (error) {
      addResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectAlgolia = async () => {
    setLoading(true);
    addResult('🔍 Testing direct Algolia search...');

    try {
      const start = Date.now();
      const randomBooks = await algoliaSearchService.getRandomFeaturedBooks(8);
      const time = Date.now() - start;

      addResult(`⚡ Direct Algolia: ${randomBooks.length} books in ${time}ms`);
      
      if (randomBooks.length > 0) {
        addResult('✅ Direct Algolia working!');
        setBooks(randomBooks);
      } else {
        addResult('❌ Direct Algolia returned no books');
      }
    } catch (error) {
      addResult(`❌ Direct Algolia error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Featured Books Test
        </h2>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={testFeaturedBooks}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Testing...' : 'Test Featured Books'}
          </button>
          
          <button
            onClick={testDirectAlgolia}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Test Direct Algolia
          </button>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 h-48 overflow-y-auto mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Test Results:
          </h3>
          
          {testResults.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              Click a test button to start...
            </p>
          ) : (
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="text-sm font-mono text-gray-800 dark:text-gray-200 p-2 bg-white dark:bg-gray-800 rounded border-l-4 border-blue-500"
                >
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Display books */}
      {books.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Featured Books ({books.length})
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {books.map((book, index) => (
              <div key={book.id || index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                {book.thumbnail && (
                  <img 
                    src={book.thumbnail} 
                    alt={book.title}
                    className="w-full h-48 object-cover rounded mb-2"
                  />
                )}
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 line-clamp-2">
                  {book.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {book.authors?.join(', ')}
                </p>
                {book.average_rating && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    ⭐ {book.average_rating} ({book.ratings_count || 0} reviews)
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeaturedBooksTest;
