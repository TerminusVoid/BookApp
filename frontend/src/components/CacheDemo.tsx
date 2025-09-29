import React, { useState } from 'react';
import { cachedApi } from '../services/cachedApi';
import { cacheManager } from '../services/cache';

const CacheDemo: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runCacheTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addResult('🧪 Starting cache and rate limiting test...');
      
      // Test 1: First search (should be cache MISS)
      addResult('📡 Making first search request...');
      const start1 = Date.now();
      await cachedApi.searchBooks({ q: 'javascript', per_page: 5 });
      const time1 = Date.now() - start1;
      addResult(`✅ First search completed in ${time1}ms (Cache MISS expected)`);
      
      // Test 2: Second search (should be cache HIT)
      addResult('⚡ Making second search request (same query)...');
      const start2 = Date.now();
      await cachedApi.searchBooks({ q: 'javascript', per_page: 5 });
      const time2 = Date.now() - start2;
      addResult(`✅ Second search completed in ${time2}ms (Cache HIT expected)`);
      
      const speedImprovement = ((time1 - time2) / time1 * 100).toFixed(1);
      addResult(`🚀 Speed improvement: ${speedImprovement}%`);
      
      // Test 3: Cache stats
      const stats = cachedApi.getCacheStats();
      addResult(`📊 Cache stats: ${stats.size} items cached, ${stats.rateLimits} rate limits`);
      
      // Test 4: Rate limiting test
      addResult('🔄 Testing rate limiting (making multiple rapid requests)...');
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          cachedApi.searchBooks({ q: `test${i}`, per_page: 1 })
            .then(() => addResult(`✅ Request ${i + 1} succeeded`))
            .catch((err) => addResult(`❌ Request ${i + 1} failed: ${err.message}`))
        );
      }
      
      await Promise.allSettled(promises);
      
      // Test 5: Featured books caching
      addResult('🌟 Testing featured books caching...');
      const featuredStart = Date.now();
      await cachedApi.getFeaturedBooks();
      const featuredTime = Date.now() - featuredStart;
      addResult(`✅ Featured books loaded in ${featuredTime}ms`);
      
      // Test featured books cache hit
      const featuredStart2 = Date.now();
      await cachedApi.getFeaturedBooks();
      const featuredTime2 = Date.now() - featuredStart2;
      addResult(`⚡ Featured books (cached) loaded in ${featuredTime2}ms`);
      
      addResult('🎉 All tests completed!');
      
    } catch (error) {
      addResult(`❌ Test failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearCache = () => {
    cacheManager.clear();
    addResult('🗑️ Cache cleared');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Cache & Rate Limiting Demo
        </h2>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={runCacheTest}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {isRunning ? 'Running Tests...' : 'Run Cache Test'}
          </button>
          
          <button
            onClick={clearCache}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Clear Cache
          </button>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Test Results:
          </h3>
          
          {testResults.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              Click "Run Cache Test" to start testing...
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
        
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <h4 className="font-semibold mb-2">What this test demonstrates:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Cache MISS vs Cache HIT performance difference</li>
            <li>Rate limiting protection (max 30 requests per minute)</li>
            <li>Automatic cache management and cleanup</li>
            <li>Featured books caching with 30-minute TTL</li>
            <li>Search results caching with 10-minute TTL</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CacheDemo;
