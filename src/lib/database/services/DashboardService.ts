/**
 * DashboardService - Optimized queries for dashboard metrics
 *
 * Provides aggregated data and metrics for agency dashboards,
 * workspace overviews, and performance analytics.
 */

import { getDatabase } from '../connection'
import { cache, CacheKeys } from './CacheService'
import type { SocialNetwork } from '../types'

export interface AgencyMetrics {
  totalWorkspaces: number
  totalCampaigns: number
  totalResources: number
  totalPublications: number
  activeCampaigns: number
  scheduledPublications: number
  publishedPublications: number
  failedPublications: number
}

export interface WorkspaceMetrics {
  workspaceId: string
  workspaceName: string
  totalCampaigns: number
  activeCampaigns: number
  totalResources: number
  totalPublications: number
  publishedPublications: number
  scheduledPublications: number
}

export interface CampaignPerformance {
  campaignId: string
  campaignName: string
  workspaceName: string
  totalPublications: number
  publishedPublications: number
  scheduledPublications: number
  failedPublications: number
  successRate: number
  startDate: Date
  endDate: Date
  status: string
}

export interface ResourceUsageStats {
  resourceId: string
  resourceName: string
  resourceType: string
  campaignUsage: number
  publicationUsage: number
  lastUsed?: Date
  createdAt: Date
}

export interface PublicationStats {
  socialNetwork: SocialNetwork
  totalPublications: number
  publishedCount: number
  scheduledCount: number
  failedCount: number
  successRate: number
}

export class DashboardService {
  /**
   * Get comprehensive metrics for an agency
   */
  static async getAgencyMetrics(agencyId: string): Promise<AgencyMetrics> {
    return (
      (await cache.get(
        CacheKeys.agencyMetrics(agencyId),
        () => this.fetchAgencyMetrics(agencyId),
        2 * 60 * 1000 // 2 minutes TTL
      )) || this.fetchAgencyMetrics(agencyId)
    )
  }

  private static fetchAgencyMetrics(agencyId: string): AgencyMetrics {
    const query = getDatabase().prepare(`
      SELECT 
        COUNT(DISTINCT w.id) as totalWorkspaces,
        COUNT(DISTINCT c.id) as totalCampaigns,
        COUNT(DISTINCT r.id) as totalResources,
        COUNT(DISTINCT p.id) as totalPublications,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as activeCampaigns,
        COUNT(DISTINCT CASE WHEN p.status = 'scheduled' THEN p.id END) as scheduledPublications,
        COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) as publishedPublications,
        COUNT(DISTINCT CASE WHEN p.status = 'failed' THEN p.id END) as failedPublications
      FROM agencies a
      LEFT JOIN workspaces w ON a.id = w.agency_id
      LEFT JOIN campaigns c ON w.id = c.workspace_id
      LEFT JOIN resources r ON w.id = r.workspace_id
      LEFT JOIN publications p ON c.id = p.campaign_id
      WHERE a.id = ?
    `)

    const result = query.get(agencyId) as any

    return {
      totalWorkspaces: result.totalWorkspaces || 0,
      totalCampaigns: result.totalCampaigns || 0,
      totalResources: result.totalResources || 0,
      totalPublications: result.totalPublications || 0,
      activeCampaigns: result.activeCampaigns || 0,
      scheduledPublications: result.scheduledPublications || 0,
      publishedPublications: result.publishedPublications || 0,
      failedPublications: result.failedPublications || 0,
    }
  }

  /**
   * Get metrics for each workspace in an agency
   */
  static async getWorkspaceMetrics(
    agencyId: string
  ): Promise<WorkspaceMetrics[]> {
    return (
      (await cache.get(
        CacheKeys.workspaceMetrics(agencyId),
        () => this.fetchWorkspaceMetrics(agencyId),
        3 * 60 * 1000 // 3 minutes TTL
      )) || this.fetchWorkspaceMetrics(agencyId)
    )
  }

  private static fetchWorkspaceMetrics(agencyId: string): WorkspaceMetrics[] {
    const query = getDatabase().prepare(`
      SELECT 
        w.id as workspaceId,
        w.name as workspaceName,
        COUNT(DISTINCT c.id) as totalCampaigns,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as activeCampaigns,
        COUNT(DISTINCT r.id) as totalResources,
        COUNT(DISTINCT p.id) as totalPublications,
        COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) as publishedPublications,
        COUNT(DISTINCT CASE WHEN p.status = 'scheduled' THEN p.id END) as scheduledPublications
      FROM workspaces w
      LEFT JOIN campaigns c ON w.id = c.workspace_id
      LEFT JOIN resources r ON w.id = r.workspace_id
      LEFT JOIN publications p ON c.id = p.campaign_id
      WHERE w.agency_id = ?
      GROUP BY w.id, w.name
      ORDER BY w.name ASC
    `)

    const results = query.all(agencyId) as any[]

    return results.map(result => ({
      workspaceId: result.workspaceId,
      workspaceName: result.workspaceName,
      totalCampaigns: result.totalCampaigns || 0,
      activeCampaigns: result.activeCampaigns || 0,
      totalResources: result.totalResources || 0,
      totalPublications: result.totalPublications || 0,
      publishedPublications: result.publishedPublications || 0,
      scheduledPublications: result.scheduledPublications || 0,
    }))
  }

  /**
   * Get performance metrics for campaigns in an agency
   */
  static async getCampaignPerformance(
    agencyId: string,
    limit: number = 10
  ): Promise<CampaignPerformance[]> {
    return (
      (await cache.get(
        CacheKeys.campaignPerformance(agencyId, limit),
        () => this.fetchCampaignPerformance(agencyId, limit),
        5 * 60 * 1000 // 5 minutes TTL
      )) || this.fetchCampaignPerformance(agencyId, limit)
    )
  }

  private static fetchCampaignPerformance(
    agencyId: string,
    limit: number = 10
  ): CampaignPerformance[] {
    const query = getDatabase().prepare(`
      SELECT 
        c.id as campaignId,
        c.name as campaignName,
        w.name as workspaceName,
        COUNT(p.id) as totalPublications,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as publishedPublications,
        COUNT(CASE WHEN p.status = 'scheduled' THEN 1 END) as scheduledPublications,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failedPublications,
        CASE 
          WHEN COUNT(p.id) > 0 
          THEN ROUND((COUNT(CASE WHEN p.status = 'published' THEN 1 END) * 100.0) / COUNT(p.id), 2)
          ELSE 0 
        END as successRate,
        c.start_date as startDate,
        c.end_date as endDate,
        c.status
      FROM campaigns c
      JOIN workspaces w ON c.workspace_id = w.id
      LEFT JOIN publications p ON c.id = p.campaign_id
      WHERE w.agency_id = ?
      GROUP BY c.id, c.name, w.name, c.start_date, c.end_date, c.status
      ORDER BY c.created_at DESC
      LIMIT ?
    `)

    const results = query.all(agencyId, limit) as any[]

    return results.map(result => ({
      campaignId: result.campaignId,
      campaignName: result.campaignName,
      workspaceName: result.workspaceName,
      totalPublications: result.totalPublications || 0,
      publishedPublications: result.publishedPublications || 0,
      scheduledPublications: result.scheduledPublications || 0,
      failedPublications: result.failedPublications || 0,
      successRate: result.successRate || 0,
      startDate: new Date(result.startDate),
      endDate: new Date(result.endDate),
      status: result.status,
    }))
  }

  /**
   * Get resource usage statistics for an agency
   */
  static async getResourceUsageStats(
    agencyId: string,
    limit: number = 20
  ): Promise<ResourceUsageStats[]> {
    return (
      (await cache.get(
        CacheKeys.resourceUsage(agencyId, limit),
        () => this.fetchResourceUsageStats(agencyId, limit),
        10 * 60 * 1000 // 10 minutes TTL
      )) || this.fetchResourceUsageStats(agencyId, limit)
    )
  }

  private static fetchResourceUsageStats(
    agencyId: string,
    limit: number = 20
  ): ResourceUsageStats[] {
    const query = getDatabase().prepare(`
      SELECT 
        r.id as resourceId,
        r.name as resourceName,
        r.type as resourceType,
        COUNT(DISTINCT cr.campaign_id) as campaignUsage,
        COUNT(DISTINCT p.id) as publicationUsage,
        MAX(p.created_at) as lastUsed,
        r.created_at as createdAt
      FROM resources r
      JOIN workspaces w ON r.workspace_id = w.id
      LEFT JOIN campaign_resources cr ON r.id = cr.resource_id
      LEFT JOIN publications p ON r.id = p.resource_id
      WHERE w.agency_id = ?
      GROUP BY r.id, r.name, r.type, r.created_at
      ORDER BY campaignUsage DESC, publicationUsage DESC, r.created_at DESC
      LIMIT ?
    `)

    const results = query.all(agencyId, limit) as any[]

    return results.map(result => ({
      resourceId: result.resourceId,
      resourceName: result.resourceName,
      resourceType: result.resourceType,
      campaignUsage: result.campaignUsage || 0,
      publicationUsage: result.publicationUsage || 0,
      lastUsed: result.lastUsed ? new Date(result.lastUsed) : undefined,
      createdAt: new Date(result.createdAt),
    }))
  }

  /**
   * Get publication statistics by social network for an agency
   */
  static async getPublicationStatsByNetwork(
    agencyId: string
  ): Promise<PublicationStats[]> {
    return (
      (await cache.get(
        CacheKeys.publicationStats(agencyId),
        () => this.fetchPublicationStatsByNetwork(agencyId),
        5 * 60 * 1000 // 5 minutes TTL
      )) || this.fetchPublicationStatsByNetwork(agencyId)
    )
  }

  private static fetchPublicationStatsByNetwork(
    agencyId: string
  ): PublicationStats[] {
    const query = getDatabase().prepare(`
      SELECT 
        p.social_network as socialNetwork,
        COUNT(p.id) as totalPublications,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as publishedCount,
        COUNT(CASE WHEN p.status = 'scheduled' THEN 1 END) as scheduledCount,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failedCount,
        CASE 
          WHEN COUNT(p.id) > 0 
          THEN ROUND((COUNT(CASE WHEN p.status = 'published' THEN 1 END) * 100.0) / COUNT(p.id), 2)
          ELSE 0 
        END as successRate
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE w.agency_id = ?
      GROUP BY p.social_network
      ORDER BY totalPublications DESC
    `)

    const results = query.all(agencyId) as any[]

    return results.map(result => ({
      socialNetwork: result.socialNetwork as SocialNetwork,
      totalPublications: result.totalPublications || 0,
      publishedCount: result.publishedCount || 0,
      scheduledCount: result.scheduledCount || 0,
      failedCount: result.failedCount || 0,
      successRate: result.successRate || 0,
    }))
  }

  /**
   * Get recent activity summary for an agency
   */
  static async getRecentActivity(
    agencyId: string,
    days: number = 7
  ): Promise<{
    newCampaigns: number
    newResources: number
    publishedPosts: number
    failedPosts: number
  }> {
    return (
      (await cache.get(
        CacheKeys.recentActivity(agencyId, days),
        () => this.fetchRecentActivity(agencyId, days),
        1 * 60 * 1000 // 1 minute TTL for recent activity
      )) || this.fetchRecentActivity(agencyId, days)
    )
  }

  private static fetchRecentActivity(
    agencyId: string,
    days: number = 7
  ): {
    newCampaigns: number
    newResources: number
    publishedPosts: number
    failedPosts: number
  } {
    const query = getDatabase().prepare(`
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN c.created_at >= datetime('now', '-' || ? || ' days') 
          THEN c.id 
        END) as newCampaigns,
        COUNT(DISTINCT CASE 
          WHEN r.created_at >= datetime('now', '-' || ? || ' days') 
          THEN r.id 
        END) as newResources,
        COUNT(DISTINCT CASE 
          WHEN p.published_at >= datetime('now', '-' || ? || ' days') 
          AND p.status = 'published'
          THEN p.id 
        END) as publishedPosts,
        COUNT(DISTINCT CASE 
          WHEN p.updated_at >= datetime('now', '-' || ? || ' days') 
          AND p.status = 'failed'
          THEN p.id 
        END) as failedPosts
      FROM agencies a
      LEFT JOIN workspaces w ON a.id = w.agency_id
      LEFT JOIN campaigns c ON w.id = c.workspace_id
      LEFT JOIN resources r ON w.id = r.workspace_id
      LEFT JOIN publications p ON c.id = p.campaign_id
      WHERE a.id = ?
    `)

    const result = query.get(days, days, days, days, agencyId) as any

    return {
      newCampaigns: result.newCampaigns || 0,
      newResources: result.newResources || 0,
      publishedPosts: result.publishedPosts || 0,
      failedPosts: result.failedPosts || 0,
    }
  }

  /**
   * Get top performing campaigns by success rate
   */
  static async getTopPerformingCampaigns(
    agencyId: string,
    limit: number = 5
  ): Promise<CampaignPerformance[]> {
    return (
      (await cache.get(
        CacheKeys.topCampaigns(agencyId, limit),
        () => this.fetchTopPerformingCampaigns(agencyId, limit),
        10 * 60 * 1000 // 10 minutes TTL
      )) || this.fetchTopPerformingCampaigns(agencyId, limit)
    )
  }

  private static fetchTopPerformingCampaigns(
    agencyId: string,
    limit: number = 5
  ): CampaignPerformance[] {
    const query = getDatabase().prepare(`
      SELECT 
        c.id as campaignId,
        c.name as campaignName,
        w.name as workspaceName,
        COUNT(p.id) as totalPublications,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as publishedPublications,
        COUNT(CASE WHEN p.status = 'scheduled' THEN 1 END) as scheduledPublications,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failedPublications,
        CASE 
          WHEN COUNT(p.id) > 0 
          THEN ROUND((COUNT(CASE WHEN p.status = 'published' THEN 1 END) * 100.0) / COUNT(p.id), 2)
          ELSE 0 
        END as successRate,
        c.start_date as startDate,
        c.end_date as endDate,
        c.status
      FROM campaigns c
      JOIN workspaces w ON c.workspace_id = w.id
      LEFT JOIN publications p ON c.id = p.campaign_id
      WHERE w.agency_id = ? AND COUNT(p.id) > 0
      GROUP BY c.id, c.name, w.name, c.start_date, c.end_date, c.status
      HAVING COUNT(p.id) >= 3
      ORDER BY successRate DESC, totalPublications DESC
      LIMIT ?
    `)

    const results = query.all(agencyId, limit) as any[]

    return results.map(result => ({
      campaignId: result.campaignId,
      campaignName: result.campaignName,
      workspaceName: result.workspaceName,
      totalPublications: result.totalPublications || 0,
      publishedPublications: result.publishedPublications || 0,
      scheduledPublications: result.scheduledPublications || 0,
      failedPublications: result.failedPublications || 0,
      successRate: result.successRate || 0,
      startDate: new Date(result.startDate),
      endDate: new Date(result.endDate),
      status: result.status,
    }))
  }
}
