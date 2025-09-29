import React, { useState, useEffect } from 'react';
import { cachedApi } from '../services/cachedApi';

interface CacheStatusProps {
  className?: string;
}

const CacheStatus: React.FC<CacheStatusProps> = ({ className = '' }) => {
  const [stats, setStats] = useState({ size: 0, rateLimits: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      const newStats = cachedApi.getCacheStats();
      setStats(newStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const clearCache = () => {
    cachedApi.clearCache();
    setStats({ size: 0, rateLimits: 0 });
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50 ${className}`}
        title="Show cache status"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 min-w-64 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cache Status</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
        <div className="flex justify-between">
          <span>Cached Items:</span>
          <span className="font-mono">{stats.size}</span>
        </div>
        <div className="flex justify-between">
          <span>Rate Limits:</span>
          <span className="font-mono">{stats.rateLimits}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={clearCache}
          className="w-full text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 px-2 py-1 rounded transition-colors"
        >
          Clear Cache
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Cache Active</span>
        </div>
      </div>
    </div>
  );
};

export default CacheStatus;
