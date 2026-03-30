/**
 * Performance Monitoring Utility
 * 
 * Tracks key performance metrics for the DailyOrganiser application
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    averagePageLoad: number;
    averageApiResponse: number;
    errorRate: number;
    cacheHitRate: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiCalls: Map<string, { start: number; end?: number }> = new Map();
  private errors: number = 0;
  private totalRequests: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  /**
   * Start tracking an API call
   */
  startApiCall(endpoint: string): string {
    const id = `${endpoint}-${Date.now()}`;
    this.apiCalls.set(id, { start: performance.now() });
    this.totalRequests++;
    return id;
  }

  /**
   * End tracking an API call
   */
  endApiCall(id: string, success: boolean = true): void {
    const call = this.apiCalls.get(id);
    if (call) {
      call.end = performance.now();
      const duration = call.end - call.start;
      
      this.addMetric({
        name: 'api_response_time',
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        metadata: { endpoint: id.split('-')[0] },
      });

      if (!success) {
        this.errors++;
      }

      this.apiCalls.delete(id);
    }
  }

  /**
   * Track page load time
   */
  trackPageLoad(pageName: string, loadTime: number): void {
    this.addMetric({
      name: 'page_load',
      value: loadTime,
      unit: 'ms',
      timestamp: new Date(),
      metadata: { page: pageName },
    });
  }

  /**
   * Track cache hit/miss
   */
  trackCacheHit(): void {
    this.cacheHits++;
  }

  trackCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Add a custom metric
   */
  addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get performance report
   */
  getReport(): PerformanceReport {
    const pageLoads = this.metrics.filter(m => m.name === 'page_load');
    const apiCalls = this.metrics.filter(m => m.name === 'api_response_time');

    const averagePageLoad = pageLoads.length > 0
      ? pageLoads.reduce((sum, m) => sum + m.value, 0) / pageLoads.length
      : 0;

    const averageApiResponse = apiCalls.length > 0
      ? apiCalls.reduce((sum, m) => sum + m.value, 0) / apiCalls.length
      : 0;

    const errorRate = this.totalRequests > 0
      ? (this.errors / this.totalRequests) * 100
      : 0;

    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0
      ? (this.cacheHits / totalCacheRequests) * 100
      : 0;

    return {
      metrics: this.metrics,
      summary: {
        averagePageLoad,
        averageApiResponse,
        errorRate,
        cacheHitRate,
      },
    };
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.errors = 0;
    this.totalRequests = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify(this.getReport(), null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for tracking component render time
 */
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now();

  return {
    trackRender: () => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.addMetric({
        name: 'component_render',
        value: renderTime,
        unit: 'ms',
        timestamp: new Date(),
        metadata: { component: componentName },
      });
    },
  };
}

/**
 * Higher-order function for tracking function execution time
 */
export function withPerformanceTracking<T extends (...args: unknown[]) => unknown>(
  fn: T,
  functionName: string
): T {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    const result = fn(...args);
    const executionTime = performance.now() - startTime;

    performanceMonitor.addMetric({
      name: 'function_execution',
      value: executionTime,
      unit: 'ms',
      timestamp: new Date(),
      metadata: { function: functionName },
    });

    return result;
  }) as T;
}
