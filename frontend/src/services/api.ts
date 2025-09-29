import axios from 'axios';
import type { User, Book, ApiResponse, PaginatedResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Important for CSRF cookies
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Re-export types for backward compatibility
export type { User, Book, ApiResponse, PaginatedResponse } from '../types';

// Auth API
export const authAPI = {
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
    api.post<ApiResponse<{ user: User; token: string }>>('/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: User; token: string }>>('/login', data),
  
  logout: () => api.post<ApiResponse<null>>('/logout'),
  
  getUser: () => api.get<ApiResponse<{ user: User }>>('/user'),
  
  deleteAccount: (data: { password: string }) =>
    api.delete<ApiResponse<null>>('/account', { data }),
};

// Books API
export const booksAPI = {
  search: (params: { q: string; page?: number; per_page?: number }) =>
    api.get<ApiResponse<PaginatedResponse<Book>>>('/books/search', { params }),
  
  suggestions: (params: { q: string; limit?: number }) =>
    api.get<ApiResponse<{ suggestions: string[]; query: string }>>('/books/suggestions', { params }),
  
  getBook: (id: string) =>
    api.get<ApiResponse<{ book: Book; is_favorited: boolean }>>(`/books/${id}`),
  
  getBooks: (params?: { page?: number; per_page?: number; sort?: string; order?: string }) =>
    api.get<ApiResponse<PaginatedResponse<Book>>>('/books', { params }),
};

// Favorites API
export const favoritesAPI = {
  getFavorites: (params?: { page?: number; per_page?: number }) =>
    api.get<ApiResponse<PaginatedResponse<Book>>>('/favorites', { params }),
  
  addFavorite: (book_id: number) =>
    api.post<ApiResponse<{ favorite: any; book: Book }>>('/favorites', { book_id }),
  
  removeFavorite: (bookId: number) =>
    api.delete<ApiResponse<null>>(`/favorites/${bookId}`),
  
  toggleFavorite: (book_id: number) =>
    api.post<ApiResponse<{ is_favorited: boolean }>>('/favorites/toggle', { book_id }),
};

export default api;
