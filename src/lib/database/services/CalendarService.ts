/**
 * CalendarService - Optimized queries for calendar views
 *
 * Provides specialized queries for calendar functionality including
 * date-based aggregations, scheduling views, and publication management.
 */

import { getDatabase } from '../connection'
import { cache, CacheKeys } from './CacheService'
import type { SocialNetwork, Publication } from '../types'

export interface CalendarDay {
  date: string // YYYY-MM-DD format
  publicationCount: number
  publishedCount: number
  scheduledCount: number
  failedCount: number
  publications: CalendarPublication[]
}

export interface CalendarPublication {
  id: string
  campaignId: string
  campaignName: string
  workspaceName: string
  socialNetwork: SocialNetwork
  content: string
  imageUrl: string
  scheduledDate: Date
  status: 'scheduled' | 'published' | 'failed' | 'cancelled'
  publishedAt?: Date
  errorMessage?: string
  // AI Content Generation fields
  generatedText?: string
  generatedImageUrls?: string[]
  generationStatus: 'pending' | 'generating' | 'completed' | 'failed'
  generationMetadata?: {
    agentUsed: 'text-only' | 'text-image' | 'text-template' | 'carousel'
    textPrompt: string
    imagePrompt?: string
    templateUsed?: string
    resourcesUsed: string[]
    generationTime: Date
    retryCount: number
    processingTimeMs: number
  }
  campaignGenerationStatus?: 'planning' | 'generating' | 'completed' | 'failed'
}

export interface CalendarWeek {
  weekStart: string // YYYY-MM-DD format
  weekEnd: string // YYYY-MM-DD format
  totalPublications: number
  publishedCount: number
  scheduledCount: number
  failedCount: number
  days: CalendarDay[]
}

export interface CalendarMonth {
  month: string // YYYY-MM format
  totalPublications: number
  publishedCount: number
  scheduledCount: number
  failedCount: number
  weeks: CalendarWeek[]
}

export interface CalendarFilters {
  workspaceIds?: string[]
  campaignIds?: string[]
  socialNetworks?: SocialNetwork[]
  statuses?: ('scheduled' | 'published' | 'failed' | 'cancelled')[]
  generationStatuses?: ('pending' | 'generating' | 'completed' | 'failed')[]
  campaignGenerationStatuses?: ('planning' | 'generating' | 'completed' | 'failed')[]
}

export class CalendarService {
  /**
   * Get publications for a specific date range with daily aggregations
   */
  static async getCalendarRange(
    agencyId: string,
    startDate: Date,
    endDate: Date,
    filters?: CalendarFilters
  ): Promise<CalendarDay[]> {
    const filtersHash = filters ? this.hashFilters(filters) : undefined
    const cacheKey = CacheKeys.calendarRange(
      agencyId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      filtersHash
    )

    return (
      (await cache.get(
        cacheKey,
        () => this.fetchCalendarRange(agencyId, startDate, endDate, filters),
        2 * 60 * 1000 // 2 minutes TTL
      )) || this.fetchCalendarRange(agencyId, startDate, endDate, filters)
    )
  }

  private static fetchCalendarRange(
    agencyId: string,
    startDate: Date,
    endDate: Date,
    filters?: CalendarFilters
  ): CalendarDay[] {
    // Build dynamic WHERE clause based on filters
    let whereClause =
      'WHERE w.agency_id = ? AND p.scheduled_date BETWEEN ? AND ?'
    const params: any[] = [
      agencyId,
      startDate.toISOString(),
      endDate.toISOString(),
    ]

    if (filters?.workspaceIds?.length) {
      whereClause += ` AND w.id IN (${filters.workspaceIds.map(() => '?').join(',')})`
      params.push(...filters.workspaceIds)
    }

    if (filters?.campaignIds?.length) {
      whereClause += ` AND c.id IN (${filters.campaignIds.map(() => '?').join(',')})`
      params.push(...filters.campaignIds)
    }

    if (filters?.socialNetworks?.length) {
      whereClause += ` AND p.social_network IN (${filters.socialNetworks.map(() => '?').join(',')})`
      params.push(...filters.socialNetworks)
    }

    if (filters?.statuses?.length) {
      whereClause += ` AND p.status IN (${filters.statuses.map(() => '?').join(',')})`
      params.push(...filters.statuses)
    }

    if (filters?.generationStatuses?.length) {
      whereClause += ` AND p.generation_status IN (${filters.generationStatuses.map(() => '?').join(',')})`
      params.push(...filters.generationStatuses)
    }

    if (filters?.campaignGenerationStatuses?.length) {
      whereClause += ` AND c.generation_status IN (${filters.campaignGenerationStatuses.map(() => '?').join(',')})`
      params.push(...filters.campaignGenerationStatuses)
    }

    // Get daily aggregations
    const aggregationQuery = getDatabase().prepare(`
      SELECT 
        DATE(p.scheduled_date) as date,
        COUNT(*) as publicationCount,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as publishedCount,
        COUNT(CASE WHEN p.status = 'scheduled' THEN 1 END) as scheduledCount,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failedCount
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      ${whereClause}
      GROUP BY DATE(p.scheduled_date)
      ORDER BY date ASC
    `)

    // Get detailed publications
    const publicationsQuery = getDatabase().prepare(`
      SELECT 
        p.id,
        p.campaign_id as campaignId,
        c.name as campaignName,
        w.name as workspaceName,
        p.social_network as socialNetwork,
        p.content,
        p.image_url as imageUrl,
        p.scheduled_date as scheduledDate,
        p.status,
        p.published_at as publishedAt,
        p.error_message as errorMessage,
        p.generated_text as generatedText,
        p.generated_image_urls as generatedImageUrls,
        p.generation_status as generationStatus,
        p.generation_metadata as generationMetadata,
        c.generation_status as campaignGenerationStatus,
        DATE(p.scheduled_date) as date
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      ${whereClause}
      ORDER BY p.scheduled_date ASC
    `)

    const aggregations = aggregationQuery.all(...params) as any[]
    const publications = publicationsQuery.all(...params) as any[]

    // Group publications by date
    const publicationsByDate = new Map<string, CalendarPublication[]>()
    publications.forEach(pub => {
      const date = pub.date
      if (!publicationsByDate.has(date)) {
        publicationsByDate.set(date, [])
      }
      publicationsByDate.get(date)!.push({
        id: pub.id,
        campaignId: pub.campaignId,
        campaignName: pub.campaignName,
        workspaceName: pub.workspaceName,
        socialNetwork: pub.socialNetwork,
        content: pub.content,
        imageUrl: pub.imageUrl,
        scheduledDate: new Date(pub.scheduledDate),
        status: pub.status,
        publishedAt: pub.publishedAt ? new Date(pub.publishedAt) : undefined,
        errorMessage: pub.errorMessage,
        generatedText: pub.generatedText,
        generatedImageUrls: pub.generatedImageUrls ? JSON.parse(pub.generatedImageUrls) : undefined,
        generationStatus: pub.generationStatus || 'pending',
        generationMetadata: pub.generationMetadata ? JSON.parse(pub.generationMetadata) : undefined,
        campaignGenerationStatus: pub.campaignGenerationStatus
      })
    })

    // Combine aggregations with publications
    return aggregations.map(agg => ({
      date: agg.date,
      publicationCount: agg.publicationCount || 0,
      publishedCount: agg.publishedCount || 0,
      scheduledCount: agg.scheduledCount || 0,
      failedCount: agg.failedCount || 0,
      publications: publicationsByDate.get(agg.date) || [],
    }))
  }

  /**
   * Get calendar data organized by weeks for a month view
   */
  static async getCalendarMonth(
    agencyId: string,
    year: number,
    month: number,
    filters?: CalendarFilters
  ): Promise<CalendarMonth> {
    const filtersHash = filters ? this.hashFilters(filters) : undefined
    const cacheKey = CacheKeys.calendarMonth(agencyId, year, month, filtersHash)

    return (
      (await cache.get(
        cacheKey,
        () => this.fetchCalendarMonth(agencyId, year, month, filters),
        5 * 60 * 1000 // 5 minutes TTL
      )) || this.fetchCalendarMonth(agencyId, year, month, filters)
    )
  }

  private static async fetchCalendarMonth(
    agencyId: string,
    year: number,
    month: number,
    filters?: CalendarFilters
  ): Promise<CalendarMonth> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    // Get the first day of the week containing the first day of the month
    const firstDayOfWeek = new Date(startDate)
    firstDayOfWeek.setDate(startDate.getDate() - startDate.getDay())

    // Get the last day of the week containing the last day of the month
    const lastDayOfWeek = new Date(endDate)
    lastDayOfWeek.setDate(endDate.getDate() + (6 - endDate.getDay()))

    const calendarDays = await this.fetchCalendarRange(
      agencyId,
      firstDayOfWeek,
      lastDayOfWeek,
      filters
    )

    // Group days into weeks
    const weeks: CalendarWeek[] = []
    let currentWeek: CalendarDay[] = []
    let weekStart = new Date(firstDayOfWeek)

    calendarDays.forEach(day => {
      const dayDate = new Date(day.date)

      // If we've reached a new week, save the current week and start a new one
      if (currentWeek.length === 7) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)

        weeks.push({
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          totalPublications: currentWeek.reduce(
            (sum, d) => sum + d.publicationCount,
            0
          ),
          publishedCount: currentWeek.reduce(
            (sum, d) => sum + d.publishedCount,
            0
          ),
          scheduledCount: currentWeek.reduce(
            (sum, d) => sum + d.scheduledCount,
            0
          ),
          failedCount: currentWeek.reduce((sum, d) => sum + d.failedCount, 0),
          days: [...currentWeek],
        })

        currentWeek = []
        weekStart = new Date(dayDate)
      }

      currentWeek.push(day)
    })

    // Add the last week if it has days
    if (currentWeek.length > 0) {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      weeks.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalPublications: currentWeek.reduce(
          (sum, d) => sum + d.publicationCount,
          0
        ),
        publishedCount: currentWeek.reduce(
          (sum, d) => sum + d.publishedCount,
          0
        ),
        scheduledCount: currentWeek.reduce(
          (sum, d) => sum + d.scheduledCount,
          0
        ),
        failedCount: currentWeek.reduce((sum, d) => sum + d.failedCount, 0),
        days: currentWeek,
      })
    }

    return {
      month: `${year}-${month.toString().padStart(2, '0')}`,
      totalPublications: weeks.reduce((sum, w) => sum + w.totalPublications, 0),
      publishedCount: weeks.reduce((sum, w) => sum + w.publishedCount, 0),
      scheduledCount: weeks.reduce((sum, w) => sum + w.scheduledCount, 0),
      failedCount: weeks.reduce((sum, w) => sum + w.failedCount, 0),
      weeks,
    }
  }

  /**
   * Get publications for a specific day with detailed information
   */
  static getDayPublications(
    agencyId: string,
    date: Date,
    filters?: CalendarFilters
  ): CalendarPublication[] {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    let whereClause =
      'WHERE w.agency_id = ? AND p.scheduled_date BETWEEN ? AND ?'
    const params: any[] = [
      agencyId,
      startOfDay.toISOString(),
      endOfDay.toISOString(),
    ]

    if (filters?.workspaceIds?.length) {
      whereClause += ` AND w.id IN (${filters.workspaceIds.map(() => '?').join(',')})`
      params.push(...filters.workspaceIds)
    }

    if (filters?.campaignIds?.length) {
      whereClause += ` AND c.id IN (${filters.campaignIds.map(() => '?').join(',')})`
      params.push(...filters.campaignIds)
    }

    if (filters?.socialNetworks?.length) {
      whereClause += ` AND p.social_network IN (${filters.socialNetworks.map(() => '?').join(',')})`
      params.push(...filters.socialNetworks)
    }

    if (filters?.statuses?.length) {
      whereClause += ` AND p.status IN (${filters.statuses.map(() => '?').join(',')})`
      params.push(...filters.statuses)
    }

    const query = getDatabase().prepare(`
      SELECT 
        p.id,
        p.campaign_id as campaignId,
        c.name as campaignName,
        w.name as workspaceName,
        p.social_network as socialNetwork,
        p.content,
        p.image_url as imageUrl,
        p.scheduled_date as scheduledDate,
        p.status,
        p.published_at as publishedAt,
        p.error_message as errorMessage,
        p.generated_text as generatedText,
        p.generated_image_urls as generatedImageUrls,
        p.generation_status as generationStatus,
        p.generation_metadata as generationMetadata,
        c.generation_status as campaignGenerationStatus
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      ${whereClause}
      ORDER BY p.scheduled_date ASC
    `)

    const results = query.all(...params) as any[]

    return results.map(result => ({
      id: result.id,
      campaignId: result.campaignId,
      campaignName: result.campaignName,
      workspaceName: result.workspaceName,
      socialNetwork: result.socialNetwork,
      content: result.content,
      imageUrl: result.imageUrl,
      scheduledDate: new Date(result.scheduledDate),
      status: result.status,
      publishedAt: result.publishedAt
        ? new Date(result.publishedAt)
        : undefined,
      errorMessage: result.errorMessage,
      generatedText: result.generatedText,
      generatedImageUrls: result.generatedImageUrls ? JSON.parse(result.generatedImageUrls) : undefined,
      generationStatus: result.generationStatus || 'pending',
      generationMetadata: result.generationMetadata ? JSON.parse(result.generationMetadata) : undefined,
      campaignGenerationStatus: result.campaignGenerationStatus
    }))
  }

  /**
   * Get upcoming publications (next 7 days)
   */
  static async getUpcomingPublications(
    agencyId: string,
    days: number = 7,
    filters?: CalendarFilters
  ): Promise<CalendarPublication[]> {
    const filtersHash = filters ? this.hashFilters(filters) : undefined
    const cacheKey = CacheKeys.upcomingPublications(agencyId, days, filtersHash)

    return (
      (await cache.get(
        cacheKey,
        () => this.fetchUpcomingPublications(agencyId, days, filters),
        1 * 60 * 1000 // 1 minute TTL for upcoming publications
      )) || this.fetchUpcomingPublications(agencyId, days, filters)
    )
  }

  private static fetchUpcomingPublications(
    agencyId: string,
    days: number = 7,
    filters?: CalendarFilters
  ): CalendarPublication[] {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(now.getDate() + days)

    let whereClause =
      'WHERE w.agency_id = ? AND p.scheduled_date BETWEEN ? AND ? AND p.status = ?'
    const params: any[] = [
      agencyId,
      now.toISOString(),
      futureDate.toISOString(),
      'scheduled',
    ]

    if (filters?.workspaceIds?.length) {
      whereClause += ` AND w.id IN (${filters.workspaceIds.map(() => '?').join(',')})`
      params.push(...filters.workspaceIds)
    }

    if (filters?.campaignIds?.length) {
      whereClause += ` AND c.id IN (${filters.campaignIds.map(() => '?').join(',')})`
      params.push(...filters.campaignIds)
    }

    if (filters?.socialNetworks?.length) {
      whereClause += ` AND p.social_network IN (${filters.socialNetworks.map(() => '?').join(',')})`
      params.push(...filters.socialNetworks)
    }

    const query = getDatabase().prepare(`
      SELECT 
        p.id,
        p.campaign_id as campaignId,
        c.name as campaignName,
        w.name as workspaceName,
        p.social_network as socialNetwork,
        p.content,
        p.image_url as imageUrl,
        p.scheduled_date as scheduledDate,
        p.status,
        p.published_at as publishedAt,
        p.error_message as errorMessage,
        p.generated_text as generatedText,
        p.generated_image_urls as generatedImageUrls,
        p.generation_status as generationStatus,
        p.generation_metadata as generationMetadata,
        c.generation_status as campaignGenerationStatus
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      ${whereClause}
      ORDER BY p.scheduled_date ASC
      LIMIT 50
    `)

    const results = query.all(...params) as any[]

    return results.map(result => ({
      id: result.id,
      campaignId: result.campaignId,
      campaignName: result.campaignName,
      workspaceName: result.workspaceName,
      socialNetwork: result.socialNetwork,
      content: result.content,
      imageUrl: result.imageUrl,
      scheduledDate: new Date(result.scheduledDate),
      status: result.status,
      publishedAt: result.publishedAt
        ? new Date(result.publishedAt)
        : undefined,
      errorMessage: result.errorMessage,
      generatedText: result.generatedText,
      generatedImageUrls: result.generatedImageUrls ? JSON.parse(result.generatedImageUrls) : undefined,
      generationStatus: result.generationStatus || 'pending',
      generationMetadata: result.generationMetadata ? JSON.parse(result.generationMetadata) : undefined,
      campaignGenerationStatus: result.campaignGenerationStatus
    }))
  }

  /**
   * Get publication statistics for a date range grouped by social network
   */
  static getPublicationStatsByNetwork(
    agencyId: string,
    startDate: Date,
    endDate: Date,
    filters?: CalendarFilters
  ): {
    socialNetwork: SocialNetwork
    count: number
    publishedCount: number
    failedCount: number
  }[] {
    let whereClause =
      'WHERE w.agency_id = ? AND p.scheduled_date BETWEEN ? AND ?'
    const params: any[] = [
      agencyId,
      startDate.toISOString(),
      endDate.toISOString(),
    ]

    if (filters?.workspaceIds?.length) {
      whereClause += ` AND w.id IN (${filters.workspaceIds.map(() => '?').join(',')})`
      params.push(...filters.workspaceIds)
    }

    if (filters?.campaignIds?.length) {
      whereClause += ` AND c.id IN (${filters.campaignIds.map(() => '?').join(',')})`
      params.push(...filters.campaignIds)
    }

    if (filters?.socialNetworks?.length) {
      whereClause += ` AND p.social_network IN (${filters.socialNetworks.map(() => '?').join(',')})`
      params.push(...filters.socialNetworks)
    }

    const query = getDatabase().prepare(`
      SELECT 
        p.social_network as socialNetwork,
        COUNT(*) as count,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as publishedCount,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failedCount
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      ${whereClause}
      GROUP BY p.social_network
      ORDER BY count DESC
    `)

    const results = query.all(...params) as any[]

    return results.map(result => ({
      socialNetwork: result.socialNetwork as SocialNetwork,
      count: result.count || 0,
      publishedCount: result.publishedCount || 0,
      failedCount: result.failedCount || 0,
    }))
  }

  /**
   * Reschedule a publication to a new date/time
   */
  static reschedulePublication(
    publicationId: string,
    newScheduledDate: Date
  ): boolean {
    const query = getDatabase().prepare(`
      UPDATE publications 
      SET scheduled_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'scheduled'
    `)

    const result = query.run(newScheduledDate.toISOString(), publicationId)
    return result.changes > 0
  }

  /**
   * Cancel a scheduled publication
   */
  static cancelPublication(publicationId: string): boolean {
    const query = getDatabase().prepare(`
      UPDATE publications 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'scheduled'
    `)

    const result = query.run(publicationId)
    return result.changes > 0
  }

  /**
   * Generate hash for filters to use in cache keys
   */
  private static hashFilters(filters: CalendarFilters): string {
    const filterString = JSON.stringify({
      workspaceIds: filters.workspaceIds?.sort(),
      campaignIds: filters.campaignIds?.sort(),
      socialNetworks: filters.socialNetworks?.sort(),
      statuses: filters.statuses?.sort(),
    })

    // Simple hash function for cache key
    let hash = 0
    for (let i = 0; i < filterString.length; i++) {
      const char = filterString.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}
