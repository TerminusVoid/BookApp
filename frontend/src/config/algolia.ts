import { algoliasearch } from 'algoliasearch';

// Algolia configuration
export const ALGOLIA_CONFIG = {
  appId: import.meta.env.VITE_ALGOLIA_APP_ID || '',
  searchApiKey: import.meta.env.VITE_ALGOLIA_SEARCH_KEY || '',
  indexName: import.meta.env.VITE_ALGOLIA_INDEX_NAME || 'books',
};

// Create Algolia search client (only if credentials are available)
export const searchClient = ALGOLIA_CONFIG.appId && ALGOLIA_CONFIG.searchApiKey 
  ? algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.searchApiKey)
  : null;

// Check if Algolia is properly configured
export const isAlgoliaConfigured = Boolean(
  ALGOLIA_CONFIG.appId && 
  ALGOLIA_CONFIG.searchApiKey && 
  ALGOLIA_CONFIG.indexName
);

// Algolia search settings
export const SEARCH_SETTINGS = {
  hitsPerPage: 20,
  maxHitsPerPage: 100,
  attributesToHighlight: ['title', 'authors', 'description'],
  attributesToSnippet: ['description:100'],
  facets: [
    'categories',
    'authors', 
    'publisher',
    'language',
    'published_year',
    'rating_range',
  ],
  filters: {
    categories: {
      label: 'Categories',
      attribute: 'categories',
    },
    authors: {
      label: 'Authors',
      attribute: 'authors',
    },
    publisher: {
      label: 'Publisher', 
      attribute: 'publisher',
    },
    language: {
      label: 'Language',
      attribute: 'language',
    },
    published_year: {
      label: 'Publication Year',
      attribute: 'published_year',
    },
    rating_range: {
      label: 'Rating',
      attribute: 'rating_range',
    },
  },
};

// Helper function to create search state
export const createSearchState = (query: string = '', page: number = 1) => ({
  query,
  page: page - 1, // Algolia uses 0-based pagination
  hitsPerPage: SEARCH_SETTINGS.hitsPerPage,
  attributesToHighlight: SEARCH_SETTINGS.attributesToHighlight,
  attributesToSnippet: SEARCH_SETTINGS.attributesToSnippet,
  facets: SEARCH_SETTINGS.facets,
});

// Helper function to format Algolia results for our app
export const formatAlgoliaResults = (results: any) => {
  return {
    books: results.hits || [],
    pagination: {
      current_page: (results.page || 0) + 1, // Convert back to 1-based
      per_page: results.hitsPerPage || SEARCH_SETTINGS.hitsPerPage,
      total: results.nbHits || 0,
      total_pages: results.nbPages || 0,
    },
    facets: results.facets || {},
    processingTimeMS: results.processingTimeMS || 0,
    source: 'algolia',
  };
};
