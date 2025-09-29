import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { booksAPI, favoritesAPI } from '../services/api';
import type { Book } from '../types';
import { useAuth } from '../contexts/AuthContext';

const BookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);


  useEffect(() => {
    if (id) {
      fetchBookDetails(id);
    }
  }, [id]);

  const fetchBookDetails = async (bookId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await booksAPI.getBook(bookId);
      
      if (response.data.success && response.data.data) {
        setBook(response.data.data.book);
        setIsFavorited(response.data.data.is_favorited);
      } else {
        setError('Book not found');
      }
    } catch (err: any) {
      setError('Failed to load book details');
      console.error('Error fetching book details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!user || !book || favoriteLoading) return;

    try {
      setFavoriteLoading(true);
      const response = await favoritesAPI.toggleFavorite(book.id);
      
      if (response.data.success && response.data.data) {
        setIsFavorited(response.data.data.is_favorited);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const formatAuthors = (authors: string[]) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' & ');
    return `${authors[0]} & ${authors.length - 1} others`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return dateString;
    }
  };

  const getBestImageUrl = (book: Book) => {
    // Google Books API provides different image sizes
    // We can modify the URL to get higher quality images
    if (book.thumbnail) {
      // Replace 'zoom=1' with 'zoom=3' for even higher quality on detail page
      // Replace '&edge=curl' to remove the page curl effect
      return book.thumbnail
        .replace('zoom=1', 'zoom=3')
        .replace('&edge=curl', '')
        .replace('http://', 'https://'); // Use HTTPS for better security
    }
    return null;
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/3">
            <div className="aspect-[3/4] bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
          </div>
          <div className="lg:w-2/3 space-y-4">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Book Not Found</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error || 'The book you are looking for could not be found.'}</p>
        <Link
          to="/search"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Search Books
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-4">
          <li>
            <Link to="/" className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300">
              Home
            </Link>
          </li>
          <li>
            <svg className="flex-shrink-0 h-5 w-5 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </li>
          <li>
            <Link to="/search" className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300">
              Search
            </Link>
          </li>
          <li>
            <svg className="flex-shrink-0 h-5 w-5 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </li>
          <li className="text-gray-500 dark:text-gray-400 truncate max-w-xs">
            {book.title}
          </li>
        </ol>
      </nav>

      {/* Book Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/20 overflow-hidden border border-transparent dark:border-gray-700">
        <div className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Book Cover */}
            <div className="lg:w-1/3">
              <div className="sticky top-8">
                <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {book.thumbnail ? (
                    <img
                      src={getBestImageUrl(book) || book.thumbnail}
                      alt={book.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to original thumbnail if enhanced URL fails
                        const target = e.target as HTMLImageElement;
                        if (target.src !== book.thumbnail) {
                          target.src = book.thumbnail || '';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-600">
                      <svg className="w-16 h-16 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                  {user && (
                    <button
                      onClick={handleFavoriteToggle}
                      disabled={favoriteLoading}
                      className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
                        isFavorited
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <svg className="w-5 h-5 mr-2" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {favoriteLoading ? 'Updating...' : isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                    </button>
                  )}

                  {book.preview_link && (
                    <a
                      href={book.preview_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview Book
                    </a>
                  )}

                  {book.info_link && (
                    <a
                      href={book.info_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View on Google Books
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Book Information */}
            <div className="lg:w-2/3 space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{book.title}</h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">{formatAuthors(book.authors)}</p>

                {/* Rating */}
                {book.average_rating && (
                  <div className="flex items-center mb-4">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <svg
                          key={index}
                          className={`w-5 h-5 ${
                            index < Math.floor(Number(book.average_rating) || 0)
                              ? 'text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-lg font-medium text-gray-900 dark:text-white ml-2">
                      {book.average_rating ? Number(book.average_rating).toFixed(1) : 'N/A'}
                    </span>
                    {book.ratings_count && (
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        ({book.ratings_count.toLocaleString()} ratings)
                      </span>
                    )}
                  </div>
                )}

                {/* Categories */}
                {book.categories && book.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {book.categories.map((category, index) => (
                      <span
                        key={index}
                        className="inline-block px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              {book.description && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Description</h2>
                  <div 
                    className="text-gray-700 dark:text-gray-300 leading-relaxed prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: book.description }}
                  />
                </div>
              )}

              {/* Book Details */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Book Details</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {book.publisher && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Publisher</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{book.publisher}</dd>
                    </div>
                  )}
                  {book.published_date && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Published</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(book.published_date)}</dd>
                    </div>
                  )}
                  {book.page_count && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Pages</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{book.page_count.toLocaleString()}</dd>
                    </div>
                  )}
                  {book.language && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Language</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{book.language.toUpperCase()}</dd>
                    </div>
                  )}
                  {book.isbn_10 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">ISBN-10</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100 font-mono">{book.isbn_10}</dd>
                    </div>
                  )}
                  {book.isbn_13 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">ISBN-13</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100 font-mono">{book.isbn_13}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
