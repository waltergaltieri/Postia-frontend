/**
 * PerformanceMonitor - Query performance tracking and metrics
 *
 * Monitors database query performance, tracks slow queries,
 * and provides insights for optimization.
 */

export interface QueryMetric {
  query: string
  duration: number
  timestamp: number
  params?: any[]
  stackTrace?: string
}

export interface PerformanceStats {
  totalQueries: number
  averageDuration: number
  slowestQuery: QueryMetric | null
  fastestQuery: QueryMetric | null
  slowQueries: QueryMetric[] // Queries over threshold
  queryFrequency: Map<string, number>
  timeRange: {
    start: number
    end: number
  }
}

export interface PerformanceOptions {
  slowQueryThreshold?: number // milliseconds
  maxMetrics?: number // maximum metrics to store
  enableStackTrace?: boolean
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: QueryMetric[] = []
  private options: Required<PerformanceOptions>
  private startTime: number

  private constructor(options: PerformanceOptions = {}) {
    this.options = {
      slowQueryThreshold: options.slowQueryThreshold || 100, // 100ms
      maxMetrics: options.maxMetrics || 1000,
      enableStackTrace: options.enableStackTrace || false,
    }
    this.startTime = Date.now()
  }

  static getInstance(options?: PerformanceOptions): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(options)
    }
    return PerformanceMonitor.instance
  }

  /**
   * Record a query execution
   */
  recordQuery(query: string, duration: number, params?: any[]): void {
    const metric: QueryMetric = {
      query: this.normalizeQuery(query),
      duration,
      timestamp: Date.now(),
      params: this.options.enableStackTrace ? params : undefined,
      stackTrace: this.options.enableStackTrace
        ? this.getStackTrace()
        : undefined,
    }

    this.metrics.push(metric)

    // Keep only the most recent metrics
    if (this.metrics.length > this.options.maxMetrics) {
      this.metrics = this.metrics.slice(-this.options.maxMetrics)
    }
  }

  /**
   * Measure and record query execution
   */
  async measureQuery<T>(
    queryName: string,
    queryFn: () => T | Promise<T>,
    params?: any[]
  ): Promise<T> {
    const start = performance.now()

    try {
      const result = await queryFn()
      const duration = performance.now() - start
      this.recordQuery(queryName, duration, params)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordQuery(`${queryName} (ERROR)`, duration, params)
      throw error
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeRangeMs?: number): PerformanceStats {
    const now = Date.now()
    const cutoff = timeRangeMs ? now - timeRangeMs : this.startTime

    const relevantMetrics = this.metrics.filter(m => m.timestamp >= cutoff)

    if (relevantMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowestQuery: null,
        fastestQuery: null,
        slowQueries: [],
        queryFrequency: new Map(),
        timeRange: { start: cutoff, end: now },
      }
    }

    const durations = relevantMetrics.map(m => m.duration)
    const averageDuration =
      durations.reduce((sum, d) => sum + d, 0) / durations.length

    const slowestQuery = relevantMetrics.reduce((slowest, current) =>
      current.duration > slowest.duration ? current : slowest
    )

    const fastestQuery = relevantMetrics.reduce((fastest, current) =>
      current.duration < fastest.duration ? current : fastest
    )

    const slowQueries = relevantMetrics.filter(
      m => m.duration > this.options.slowQueryThreshold
    )

    const queryFrequency = new Map<string, number>()
    relevantMetrics.forEach(m => {
      const count = queryFrequency.get(m.query) || 0
      queryFrequency.set(m.query, count + 1)
    })

    return {
      totalQueries: relevantMetrics.length,
      averageDuration,
      slowestQuery,
      fastestQuery,
      slowQueries,
      queryFrequency,
      timeRange: { start: cutoff, end: now },
    }
  }

  /**
   * Get slow queries report
   */
  getSlowQueries(limit: number = 10): QueryMetric[] {
    return this.metrics
      .filter(m => m.duration > this.options.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  /**
   * Get most frequent queries
   */
  getMostFrequentQueries(
    limit: number = 10
  ): Array<{ query: string; count: number; avgDuration: number }> {
    const queryStats = new Map<
      string,
      { count: number; totalDuration: number }
    >()

    this.metrics.forEach(m => {
      const stats = queryStats.get(m.query) || { count: 0, totalDuration: 0 }
      stats.count++
      stats.totalDuration += m.duration
      queryStats.set(m.query, stats)
    })

    return Array.from(queryStats.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
    this.startTime = Date.now()
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): QueryMetric[] {
    return [...this.metrics]
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalQueries: number
    averageDuration: number
    slowQueryCount: number
    topSlowQueries: string[]
    topFrequentQueries: string[]
  } {
    const stats = this.getStats()
    const slowQueries = this.getSlowQueries(5)
    const frequentQueries = this.getMostFrequentQueries(5)

    return {
      totalQueries: stats.totalQueries,
      averageDuration: Math.round(stats.averageDuration * 100) / 100,
      slowQueryCount: stats.slowQueries.length,
      topSlowQueries: slowQueries.map(q => q.query),
      topFrequentQueries: frequentQueries.map(q => q.query),
    }
  }

  private normalizeQuery(query: string): string {
    // Remove extra whitespace and normalize for grouping
    return query
      .replace(/\s+/g, ' ')
      .replace(/\?/g, '?') // Keep parameter placeholders
      .trim()
  }

  private getStackTrace(): string {
    const stack = new Error().stack
    if (!stack) return ''

    // Remove the first few lines (this function and Error constructor)
    const lines = stack.split('\n').slice(3)
    return lines.join('\n')
  }
}

/**
 * Decorator for automatic query performance monitoring
 */
export function MonitorPerformance(queryName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const monitor = PerformanceMonitor.getInstance()

    descriptor.value = async function (...args: any[]) {
      const name = queryName || `${target.constructor.name}.${propertyKey}`
      return await monitor.measureQuery(
        name,
        () => originalMethod.apply(this, args),
        args
      )
    }

    return descriptor
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance({
  slowQueryThreshold: 100, // 100ms
  maxMetrics: 1000,
  enableStackTrace: process.env.NODE_ENV === 'development',
})
