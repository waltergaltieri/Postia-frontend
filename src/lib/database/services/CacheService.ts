/**
 * CacheService - In-memory cache system for frequent queries
 *
 * Provides intelligent caching with automatic invalidation for
 * frequently accessed data and expensive queries.
 */

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  hits: number
  lastAccessed: number
}

export interface CacheStats {
  totalEntries: number
  totalHits: number
  totalMisses: number
  hitRate: number
  memoryUsage: number // Approximate memory usage in bytes
  oldestEntry?: number
  newestEntry?: number
}

export interface CacheOptions {
  ttl?: number // Default TTL in milliseconds
  maxEntries?: number // Maximum number of entries
  cleanupInterval?: number // Cleanup interval in milliseconds
}

export class CacheService {
  private static instance: CacheService
  private cache = new Map<string, CacheEntry>()
  private stats = {
    hits: 0,
    misses: 0,
  }
  private options: Required<CacheOptions>
  private cleanupTimer?: NodeJS.Timeout

  private constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
      maxEntries: options.maxEntries || 1000,
      cleanupInterval: options.cleanupInterval || 60 * 1000, // 1 minute
    }

    // Start cleanup timer
    this.startCleanup()
  }

  static getInstance(options?: CacheOptions): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(options)
    }
    return CacheService.instance
  }

  /**
   * Get cached data or execute function and cache result
   */
  async get<T>(
    key: string,
    fetchFn?: () => T | Promise<T>,
    ttl?: number
  ): Promise<T | null> {
    const entry = this.cache.get(key)
    const now = Date.now()

    // Check if entry exists and is not expired
    if (entry && now - entry.timestamp < entry.ttl) {
      entry.hits++
      entry.lastAccessed = now
      this.stats.hits++
      return entry.data as T
    }

    // Cache miss
    this.stats.misses++

    // If no fetch function provided, return null
    if (!fetchFn) {
      return null
    }

    // Fetch new data
    try {
      const data = await fetchFn()
      this.set(key, data, ttl)
      return data
    } catch (error) {
      console.error(`Cache fetch error for key ${key}:`, error)
      return null
    }
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const entryTtl = ttl || this.options.ttl

    // Remove oldest entries if at max capacity
    if (this.cache.size >= this.options.maxEntries) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: entryTtl,
      hits: 0,
      lastAccessed: now,
    })
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    let count = 0
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const totalRequests = this.stats.hits + this.stats.misses

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry:
        entries.length > 0
          ? Math.min(...entries.map(e => e.timestamp))
          : undefined,
      newestEntry:
        entries.length > 0
          ? Math.max(...entries.map(e => e.timestamp))
          : undefined,
    }
  }

  /**
   * Get cache entry info
   */
  getEntryInfo(key: string): CacheEntry | null {
    return this.cache.get(key) || null
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    if (now - entry.timestamp >= entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Refresh TTL for existing entry
   */
  touch(key: string, ttl?: number): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    entry.timestamp = Date.now()
    entry.lastAccessed = Date.now()
    if (ttl !== undefined) {
      entry.ttl = ttl
    }

    return true
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.options.cleanupInterval)
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  private estimateMemoryUsage(): number {
    let size = 0

    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + JSON size of data + entry overhead
      size += key.length * 2 // UTF-16 characters
      size += JSON.stringify(entry.data).length * 2
      size += 64 // Estimated overhead for entry object
    }

    return size
  }

  /**
   * Destroy cache service and cleanup
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
  }
}

/**
 * Cache key generators for consistent naming
 */
export class CacheKeys {
  static agencyMetrics(agencyId: string): string {
    return `agency:metrics:${agencyId}`
  }

  static workspaceMetrics(agencyId: string): string {
    return `agency:workspace-metrics:${agencyId}`
  }

  static campaignPerformance(agencyId: string, limit: number): string {
    return `agency:campaign-performance:${agencyId}:${limit}`
  }

  static resourceUsage(agencyId: string, limit: number): string {
    return `agency:resource-usage:${agencyId}:${limit}`
  }

  static publicationStats(agencyId: string): string {
    return `agency:publication-stats:${agencyId}`
  }

  static calendarRange(
    agencyId: string,
    startDate: string,
    endDate: string,
    filtersHash?: string
  ): string {
    const base = `calendar:range:${agencyId}:${startDate}:${endDate}`
    return filtersHash ? `${base}:${filtersHash}` : base
  }

  static calendarMonth(
    agencyId: string,
    year: number,
    month: number,
    filtersHash?: string
  ): string {
    const base = `calendar:month:${agencyId}:${year}:${month}`
    return filtersHash ? `${base}:${filtersHash}` : base
  }

  static upcomingPublications(
    agencyId: string,
    days: number,
    filtersHash?: string
  ): string {
    const base = `calendar:upcoming:${agencyId}:${days}`
    return filtersHash ? `${base}:${filtersHash}` : base
  }

  static recentActivity(agencyId: string, days: number): string {
    return `agency:recent-activity:${agencyId}:${days}`
  }

  static topCampaigns(agencyId: string, limit: number): string {
    return `agency:top-campaigns:${agencyId}:${limit}`
  }

  // Pattern generators for invalidation
  static agencyPattern(agencyId: string): RegExp {
    return new RegExp(`^agency:.*:${agencyId}($|:)`)
  }

  static workspacePattern(workspaceId: string): RegExp {
    return new RegExp(`workspace:.*:${workspaceId}($|:)`)
  }

  static campaignPattern(campaignId: string): RegExp {
    return new RegExp(`campaign:.*:${campaignId}($|:)`)
  }

  static calendarPattern(agencyId: string): RegExp {
    return new RegExp(`^calendar:.*:${agencyId}($|:)`)
  }
}

/**
 * Cache invalidation helpers
 */
export class CacheInvalidation {
  private static cache = CacheService.getInstance()

  /**
   * Invalidate all cache entries for an agency
   */
  static invalidateAgency(agencyId: string): number {
    return this.cache.invalidatePattern(CacheKeys.agencyPattern(agencyId))
  }

  /**
   * Invalidate cache entries when workspace data changes
   */
  static invalidateWorkspace(workspaceId: string, agencyId: string): number {
    let count = 0
    count += this.cache.invalidatePattern(
      CacheKeys.workspacePattern(workspaceId)
    )
    count += this.cache.invalidatePattern(CacheKeys.agencyPattern(agencyId))
    return count
  }

  /**
   * Invalidate cache entries when campaign data changes
   */
  static invalidateCampaign(campaignId: string, agencyId: string): number {
    let count = 0
    count += this.cache.invalidatePattern(CacheKeys.campaignPattern(campaignId))
    count += this.cache.invalidatePattern(CacheKeys.agencyPattern(agencyId))
    count += this.cache.invalidatePattern(CacheKeys.calendarPattern(agencyId))
    return count
  }

  /**
   * Invalidate cache entries when publication data changes
   */
  static invalidatePublication(agencyId: string): number {
    let count = 0
    count += this.cache.invalidatePattern(CacheKeys.agencyPattern(agencyId))
    count += this.cache.invalidatePattern(CacheKeys.calendarPattern(agencyId))
    return count
  }

  /**
   * Invalidate cache entries when resource data changes
   */
  static invalidateResource(agencyId: string): number {
    return this.cache.invalidatePattern(CacheKeys.agencyPattern(agencyId))
  }
}

// Export singleton instance
export const cache = CacheService.getInstance({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxEntries: 1000,
  cleanupInterval: 60 * 1000, // 1 minute
})
