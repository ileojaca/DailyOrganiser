/**
 * Caching utility for DailyOrganiser
 * Provides in-memory caching with TTL support and localStorage persistence
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries in memory
  persistToLocalStorage: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100,
  persistToLocalStorage: true,
};

class Cache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Load from localStorage on initialization
    if (this.config.persistToLocalStorage && typeof window !== 'undefined') {
      this.loadFromLocalStorage();
    }
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.saveToLocalStorage();
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Enforce max entries limit
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    this.cache.set(key, entry);
    this.saveToLocalStorage();
  }

  /**
   * Remove a value from the cache
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.saveToLocalStorage();
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.saveToLocalStorage();
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.saveToLocalStorage();
      return false;
    }
    
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxEntries,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    };
  }

  /**
   * Check if an entry has expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict the oldest entry from the cache
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToLocalStorage(): void {
    if (!this.config.persistToLocalStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const entries = Array.from(this.cache.entries());
      localStorage.setItem('dailyorganiser_cache', JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving cache to localStorage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromLocalStorage(): void {
    if (!this.config.persistToLocalStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('dailyorganiser_cache');
      if (stored) {
        const entries = JSON.parse(stored) as [string, CacheEntry<unknown>][];
        this.cache = new Map(entries);
        
        // Clean up expired entries
        for (const [key, entry] of this.cache.entries()) {
          if (this.isExpired(entry)) {
            this.cache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Error loading cache from localStorage:', error);
    }
  }
}

// Create singleton instances for different cache types
export const apiCache = new Cache({
  defaultTTL: 2 * 60 * 1000, // 2 minutes for API responses
  maxEntries: 50,
  persistToLocalStorage: true,
});

export const userCache = new Cache({
  defaultTTL: 15 * 60 * 1000, // 15 minutes for user data
  maxEntries: 20,
  persistToLocalStorage: true,
});

export const staticCache = new Cache({
  defaultTTL: 60 * 60 * 1000, // 1 hour for static data
  maxEntries: 100,
  persistToLocalStorage: true,
});

/**
 * Cache decorator for async functions
 */
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  cache: Cache,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    
    // Check cache first
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Call the function
    const result = await fn(...args);
    
    // Cache the result
    cache.set(key, result, ttl);
    
    return result;
  }) as T;
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  apiCache.clear();
  userCache.clear();
  staticCache.clear();
}
