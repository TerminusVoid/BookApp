import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { favoritesAPI } from '../services/api';
import type { Book } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface BookCardProps {
  book: Book;
  showFavoriteButton?: boolean;
  isFavorited?: boolean;
  onFavoriteChange?: (bookId: number, isFavorited: boolean) => void;
}

const BookCard: React.FC<BookCardProps> = ({ 
  book, 
  showFavoriteButton = true,
  isFavorited = false,
  onFavoriteChange 
}) => {
  const { user } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  const [favorited, setFavorited] = useState(isFavorited);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || isToggling) return;

    try {
      setIsToggling(true);
      const response = await favoritesAPI.toggleFavorite(book.id);
      
      if (response.data.success && response.data.data) {
        const newFavoriteStatus = response.data.data.is_favorited;
        setFavorited(newFavoriteStatus);
        onFavoriteChange?.(book.id, newFavoriteStatus);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const formatAuthors = (authors: string[]) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' & ');
    return `${authors[0]} & ${authors.length - 1} others`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getBestImageUrl = (book: Book) => {
    // Google Books API provides different image sizes
    // We can modify the URL to get higher quality images
    if (book.thumbnail) {
      // Replace 'zoom=1' with 'zoom=2' or 'zoom=3' for higher quality
      // Replace '&edge=curl' to remove the page curl effect
      return book.thumbnail
        .replace('zoom=1', 'zoom=2')
        .replace('&edge=curl', '')
        .replace('http://', 'https://'); // Use HTTPS for better security
    }
    return null;
  };

  // Don't render if google_books_id is missing
  if (!book.google_books_id) {
    console.warn('BookCard: Missing google_books_id for book:', book.title);
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md dark:shadow-gray-900/20 transition-shadow duration-200 overflow-hidden group border border-transparent dark:border-gray-700">
      <Link to={`/books/${book.google_books_id}`} className="block">
        <div className="relative">
          {/* Book Cover */}
          <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 overflow-hidden">
            {book.thumbnail ? (
              <img
                src={getBestImageUrl(book) || book.thumbnail}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
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
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
          </div>

          {/* Favorite Button */}
          {showFavoriteButton && user && (
            <button
              onClick={handleFavoriteToggle}
              disabled={isToggling}
              className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
                favorited
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white text-gray-400 hover:text-red-500 hover:bg-gray-50'
              } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className="w-5 h-5" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}
        </div>

        {/* Book Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
            {truncateText(book.title, 60)}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            {formatAuthors(book.authors)}
          </p>
          
          {/* Rating */}
          {book.average_rating && (
            <div className="flex items-center mb-2">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, index) => (
                  <svg
                    key={index}
                    className={`w-4 h-4 ${
                      book.average_rating && index < Math.floor(Number(book.average_rating))
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
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                {book.average_rating ? Number(book.average_rating).toFixed(1) : 'N/A'}
              </span>
              {book.ratings_count && (
                <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">
                  ({book.ratings_count})
                </span>
              )}
            </div>
          )}

          {/* Categories */}
          {book.categories && book.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {book.categories.slice(0, 2).map((category, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full"
                >
                  {category}
                </span>
              ))}
              {book.categories.length > 2 && (
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                  +{book.categories.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default BookCard;
