export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: number;
  google_books_id: string;
  title: string;
  authors: string[];
  description?: string;
  publisher?: string;
  published_date?: string;
  page_count?: number;
  categories: string[];
  language?: string;
  isbn_10?: string;
  isbn_13?: string;
  thumbnail?: string;
  small_thumbnail?: string;
  average_rating?: number;
  ratings_count?: number;
  preview_link?: string;
  info_link?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  books: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
