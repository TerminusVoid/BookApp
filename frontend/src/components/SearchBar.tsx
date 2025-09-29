import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { cachedApi } from '../services/cachedApi';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  clearOnRouteChange?: boolean;
  showSuggestions?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = "Search for books by title or author...",
  initialValue = "",
  clearOnRouteChange = true,
  showSuggestions = true
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const debounceTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Clear search when route changes (except for search page)
  useEffect(() => {
    if (clearOnRouteChange && !location.pathname.startsWith('/search')) {
      setQuery('');
    }
  }, [location.pathname, clearOnRouteChange]);

  // Debounced function to fetch suggestions with local caching
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !showSuggestions) {
      setSuggestions([]);
      setShowSuggestionsList(false);
      return;
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const cacheKey = `suggestions_${normalizedQuery}`;
    
    // Check local storage cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { suggestions: cachedSuggestions, timestamp } = JSON.parse(cached);
        // Use cached results if they're less than 5 minutes old
        if (Date.now() - timestamp < 300000) {
          setSuggestions(cachedSuggestions);
          setShowSuggestionsList(cachedSuggestions.length > 0);
          return;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }

    try {
      setIsLoading(true);
      const response = await cachedApi.getSuggestions({ q: searchQuery.trim(), limit: 5 });
      if (response.data.success && response.data.data) {
        const newSuggestions = response.data.data.suggestions || [];
        setSuggestions(newSuggestions);
        setShowSuggestionsList(newSuggestions.length > 0);
        
        // Cache the results locally (additional layer)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            suggestions: newSuggestions,
            timestamp: Date.now()
          }));
        } catch (e) {
          // Ignore storage errors (quota exceeded, etc.)
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch suggestions:', error);
      
      // Handle rate limiting gracefully
      if (error.message?.includes('Rate limited')) {
        setSuggestions([]);
        setShowSuggestionsList(false);
        // Don't show error to user for suggestions, just fail silently
      } else {
        setSuggestions([]);
        setShowSuggestionsList(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showSuggestions]);

  // Debounce suggestions fetching
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 50); // 50ms debounce for instant feel

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestionsList(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestionsList(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestionsList(false);
    setSelectedSuggestionIndex(-1);
    onSearch(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestionsList || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setShowSuggestionsList(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedSuggestionIndex(-1);
    
    // Show suggestions list when user starts typing
    if (newQuery.trim() && showSuggestions) {
      setShowSuggestionsList(true);
    }
  };

  const handleInputFocus = () => {
    if (query.trim() && suggestions.length > 0 && showSuggestions) {
      setShowSuggestionsList(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          autoComplete="off"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          </div>
        )}

        {/* Search icon */}
        {!isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestionsList && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 mt-1 max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                index === selectedSuggestionIndex
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200'
                  : 'text-gray-900 dark:text-white'
              } ${index === 0 ? 'rounded-t-lg' : ''} ${
                index === suggestions.length - 1 ? 'rounded-b-lg' : ''
              }`}
            >
              <span className="block truncate text-sm">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
};

export default SearchBar;