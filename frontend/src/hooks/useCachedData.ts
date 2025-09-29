import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheManager } from '../services/cache';

interface UseCachedDataOptions<T> {
  cacheKey: string;
  fetcher: () => Promise<T>;
  ttl?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

interface UseCachedDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
  isCached: boolean;
}

export function useCachedData<T>({
  cacheKey,
  fetcher,
  ttl = 5 * 60 * 1000, // 5 minutes default
  enabled = true,
  onError,
  onSuccess,
}: UseCachedDataOptions<T>): UseCachedDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isCached, setIsCached] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = cacheManager.get<T>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setIsCached(true);
        setError(null);
        onSuccess?.(cachedData);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setIsCached(false);

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const result = await fetcher();
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Cache the result
      cacheManager.set(cacheKey, result, ttl);
      
      setData(result);
      setError(null);
      onSuccess?.(result);
    } catch (err) {
      // Don't set error if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher, ttl, enabled, onError, onSuccess]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  const clearCache = useCallback(() => {
    cacheManager.clearByPattern(cacheKey);
    setIsCached(false);
  }, [cacheKey]);

  // Initial fetch
  useEffect(() => {
    fetchData();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
    isCached,
  };
}

export default useCachedData;
