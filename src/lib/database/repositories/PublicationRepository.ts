import { BaseRepository } from './BaseRepository'
import {
  Publication,
  CreatePublicationData,
  UpdatePublicationData,
  PublicationFilters,
  SocialNetwork,
  QueryOptions,
} from '../types'

/**
 * Repository for managing publications with calendar optimization and status tracking
 */
export class PublicationRepository extends BaseRepository<
  Publication,
  CreatePublicationData,
  UpdatePublicationData,
  PublicationFilters
> {
  constructor() {
    super('publications')
  }

  /**
   * Convert database row to Publication entity
   */
  protected mapRowToEntity(row: any): Publication {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      templateId: row.template_id,
      resourceId: row.resource_id,
      socialNetwork: row.social_network,
      content: row.content,
      imageUrl: row.image_url,
      scheduledDate: new Date(row.scheduled_date),
      status: row.status,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      errorMessage: row.error_message,
      externalPostId: row.external_post_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * Convert Publication entity to database row
   */
  protected mapEntityToRow(
    data: CreatePublicationData | UpdatePublicationData
  ): any {
    const row: any = {}

    if ('campaignId' in data) row.campaign_id = data.campaignId
    if ('templateId' in data) row.template_id = data.templateId
    if ('resourceId' in data) row.resource_id = data.resourceId
    if ('socialNetwork' in data) row.social_network = data.socialNetwork
    if ('content' in data) row.content = data.content
    if ('imageUrl' in data) row.image_url = data.imageUrl
    if ('scheduledDate' in data)
      row.scheduled_date = data.scheduledDate?.toISOString()
    if ('status' in data) row.status = data.status
    if ('publishedAt' in data)
      row.published_at = data.publishedAt?.toISOString()
    if ('errorMessage' in data) row.error_message = data.errorMessage
    if ('externalPostId' in data) row.external_post_id = data.externalPostId

    return row
  }

  /**
   * Create new publication
   */
  public create(data: CreatePublicationData): Publication {
    const id = this.generateId()
    const now = new Date().toISOString()

    const row = this.mapEntityToRow(data)

    const stmt = this.getStatement(
      'create',
      `
      INSERT INTO publications (
        id, campaign_id, template_id, resource_id, social_network,
        content, image_url, scheduled_date, status, published_at,
        error_message, external_post_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )

    stmt.run(
      id,
      row.campaign_id,
      row.template_id,
      row.resource_id,
      row.social_network,
      row.content,
      row.image_url,
      row.scheduled_date,
      row.status || 'scheduled',
      row.published_at || null,
      row.error_message || null,
      row.external_post_id || null,
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Update publication by ID
   */
  public update(id: string, data: UpdatePublicationData): Publication | null {
    if (!this.exists(id)) {
      return null
    }

    const row = this.mapEntityToRow(data)
    const updates: string[] = []
    const params: any[] = []

    Object.entries(row).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`)
        params.push(value)
      }
    })

    if (updates.length === 0) {
      return this.findById(id)
    }

    updates.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    const stmt = this.getStatement(
      `update_${updates.join('_')}`,
      `
      UPDATE publications SET ${updates.join(', ')} WHERE id = ?
    `
    )

    stmt.run(...params)
    return this.findById(id)
  }

  /**
   * Find publications by campaign ID
   */
  public findByCampaignId(
    campaignId: string,
    options?: QueryOptions
  ): Publication[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByCampaignId_${JSON.stringify(options)}`,
      `
      SELECT * FROM publications WHERE campaign_id = ? ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(campaignId, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find publications by date range for calendar view
   */
  public findByDateRange(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    options?: QueryOptions
  ): Array<
    Publication & {
      campaignName: string
      workspaceName: string
    }
  > {
    const orderClause =
      this.buildOrderClause(options) || 'ORDER BY scheduled_date ASC'
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByDateRange_${JSON.stringify(options)}`,
      `
      SELECT 
        p.*,
        c.name as campaign_name,
        w.name as workspace_name
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE w.id = ?
      AND p.scheduled_date >= ?
      AND p.scheduled_date <= ?
      AND p.status IN ('scheduled', 'published')
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(
      workspaceId,
      startDate.toISOString(),
      endDate.toISOString(),
      ...limitParams
    )

    return rows.map((row: any) => ({
      ...this.mapRowToEntity(row),
      campaignName: row.campaign_name,
      workspaceName: row.workspace_name,
    }))
  }

  /**
   * Find publications by status
   */
  public findByStatus(
    campaignId: string,
    status: Publication['status'],
    options?: QueryOptions
  ): Publication[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByStatus_${status}_${JSON.stringify(options)}`,
      `
      SELECT * FROM publications 
      WHERE campaign_id = ? AND status = ?
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(campaignId, status, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find publications by social network
   */
  public findBySocialNetwork(
    campaignId: string,
    socialNetwork: SocialNetwork,
    options?: QueryOptions
  ): Publication[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findBySocialNetwork_${socialNetwork}_${JSON.stringify(options)}`,
      `
      SELECT * FROM publications 
      WHERE campaign_id = ? AND social_network = ?
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(campaignId, socialNetwork, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Get calendar view data grouped by date
   */
  public getCalendarData(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Array<{
    date: string
    publicationCount: number
    publishedCount: number
    scheduledCount: number
    failedCount: number
  }> {
    const stmt = this.getStatement(
      'getCalendarData',
      `
      SELECT 
        DATE(p.scheduled_date) as date,
        COUNT(*) as publication_count,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as published_count,
        COUNT(CASE WHEN p.status = 'scheduled' THEN 1 END) as scheduled_count,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_count
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE w.id = ?
      AND p.scheduled_date >= ?
      AND p.scheduled_date <= ?
      GROUP BY DATE(p.scheduled_date)
      ORDER BY date
    `
    )

    const rows = stmt.all(
      workspaceId,
      startDate.toISOString(),
      endDate.toISOString()
    )

    return rows.map((row: any) => ({
      date: row.date,
      publicationCount: row.publication_count || 0,
      publishedCount: row.published_count || 0,
      scheduledCount: row.scheduled_count || 0,
      failedCount: row.failed_count || 0,
    }))
  }

  /**
   * Update publication status with timestamp
   */
  public updateStatus(
    id: string,
    status: Publication['status'],
    errorMessage?: string
  ): Publication | null {
    if (!this.exists(id)) {
      return null
    }

    const now = new Date().toISOString()
    let publishedAt = null

    if (status === 'published') {
      publishedAt = now
    }

    const stmt = this.getStatement(
      'updateStatus',
      `
      UPDATE publications 
      SET status = ?, published_at = ?, error_message = ?, updated_at = ?
      WHERE id = ?
    `
    )

    stmt.run(status, publishedAt, errorMessage || null, now, id)
    return this.findById(id)
  }

  /**
   * Mark publication as published with external post ID
   */
  public markAsPublished(
    id: string,
    externalPostId: string
  ): Publication | null {
    if (!this.exists(id)) {
      return null
    }

    const now = new Date().toISOString()

    const stmt = this.getStatement(
      'markAsPublished',
      `
      UPDATE publications 
      SET status = 'published', published_at = ?, external_post_id = ?, error_message = NULL, updated_at = ?
      WHERE id = ?
    `
    )

    stmt.run(now, externalPostId, now, id)
    return this.findById(id)
  }

  /**
   * Mark publication as failed with error message
   */
  public markAsFailed(id: string, errorMessage: string): Publication | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'markAsFailed',
      `
      UPDATE publications 
      SET status = 'failed', error_message = ?, updated_at = ?
      WHERE id = ?
    `
    )

    stmt.run(errorMessage, new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Reschedule publication
   */
  public reschedule(id: string, newScheduledDate: Date): Publication | null {
    if (!this.exists(id)) {
      return null
    }

    const publication = this.findById(id)
    if (!publication || publication.status !== 'scheduled') {
      throw new Error('Can only reschedule publications with scheduled status')
    }

    const stmt = this.getStatement(
      'reschedule',
      `
      UPDATE publications 
      SET scheduled_date = ?, updated_at = ?
      WHERE id = ?
    `
    )

    stmt.run(newScheduledDate.toISOString(), new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Cancel scheduled publication
   */
  public cancel(id: string): Publication | null {
    if (!this.exists(id)) {
      return null
    }

    const publication = this.findById(id)
    if (!publication || publication.status !== 'scheduled') {
      throw new Error('Can only cancel publications with scheduled status')
    }

    return this.updateStatus(id, 'cancelled')
  }

  /**
   * Get publications due for publishing
   */
  public findDueForPublishing(beforeDate?: Date): Publication[] {
    const cutoffDate = beforeDate || new Date()

    const stmt = this.getStatement(
      'findDueForPublishing',
      `
      SELECT * FROM publications 
      WHERE status = 'scheduled' 
      AND scheduled_date <= ?
      ORDER BY scheduled_date ASC
    `
    )

    const rows = stmt.all(cutoffDate.toISOString())
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Get publication with campaign and workspace info
   */
  public findByIdWithContext(id: string):
    | (Publication & {
        campaign: { id: string; name: string; workspaceId: string }
        workspace: { id: string; name: string; agencyId: string }
      })
    | null {
    const stmt = this.getStatement(
      'findByIdWithContext',
      `
      SELECT 
        p.*,
        c.id as campaign_id_ref,
        c.name as campaign_name,
        c.workspace_id as campaign_workspace_id,
        w.id as workspace_id_ref,
        w.name as workspace_name,
        w.agency_id as workspace_agency_id
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE p.id = ?
    `
    )

    const row = stmt.get(id) as any
    if (!row) return null

    const publication = this.mapRowToEntity(row)
    return {
      ...publication,
      campaign: {
        id: row.campaign_id_ref,
        name: row.campaign_name,
        workspaceId: row.campaign_workspace_id,
      },
      workspace: {
        id: row.workspace_id_ref,
        name: row.workspace_name,
        agencyId: row.workspace_agency_id,
      },
    }
  }

  /**
   * Get publication statistics for campaign
   */
  public getCampaignStatistics(campaignId: string): {
    totalPublications: number
    scheduledPublications: number
    publishedPublications: number
    failedPublications: number
    cancelledPublications: number
    byNetwork: Record<SocialNetwork, number>
  } {
    const stmt = this.getStatement(
      'getCampaignStatistics',
      `
      SELECT 
        COUNT(*) as total_publications,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_publications,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_publications,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_publications,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_publications,
        COUNT(CASE WHEN social_network = 'facebook' THEN 1 END) as facebook_count,
        COUNT(CASE WHEN social_network = 'instagram' THEN 1 END) as instagram_count,
        COUNT(CASE WHEN social_network = 'twitter' THEN 1 END) as twitter_count,
        COUNT(CASE WHEN social_network = 'linkedin' THEN 1 END) as linkedin_count
      FROM publications 
      WHERE campaign_id = ?
    `
    )

    const result = stmt.get(campaignId) as any

    return {
      totalPublications: result.total_publications || 0,
      scheduledPublications: result.scheduled_publications || 0,
      publishedPublications: result.published_publications || 0,
      failedPublications: result.failed_publications || 0,
      cancelledPublications: result.cancelled_publications || 0,
      byNetwork: {
        facebook: result.facebook_count || 0,
        instagram: result.instagram_count || 0,
        twitter: result.twitter_count || 0,
        linkedin: result.linkedin_count || 0,
      },
    }
  }

  /**
   * Bulk create publications
   */
  public bulkCreate(publications: CreatePublicationData[]): Publication[] {
    return this.transaction(() => {
      const createdPublications: Publication[] = []

      for (const publicationData of publications) {
        const publication = this.create(publicationData)
        createdPublications.push(publication)
      }

      return createdPublications
    })
  }

  /**
   * Delete publication with validation
   */
  public delete(id: string): boolean {
    if (!this.exists(id)) {
      return false
    }

    const publication = this.findById(id)
    if (!publication) return false

    // Can only delete scheduled or failed publications
    if (!['scheduled', 'failed', 'cancelled'].includes(publication.status)) {
      throw new Error(
        'Can only delete scheduled, failed, or cancelled publications'
      )
    }

    const stmt = this.getStatement(
      'delete',
      'DELETE FROM publications WHERE id = ?'
    )
    const result = stmt.run(id)

    return result.changes > 0
  }

  /**
   * Count publications by campaign
   */
  public countByCampaign(campaignId: string): number {
    const stmt = this.getStatement(
      'countByCampaign',
      `
      SELECT COUNT(*) as count FROM publications WHERE campaign_id = ?
    `
    )

    const result = stmt.get(campaignId) as { count: number }
    return result.count
  }

  /**
   * Get workspace publication statistics
   */
  public getWorkspaceStatistics(workspaceId: string): {
    totalPublications: number
    scheduledPublications: number
    publishedPublications: number
    failedPublications: number
    publicationsThisMonth: number
  } {
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const stmt = this.getStatement(
      'getWorkspaceStatistics',
      `
      SELECT 
        COUNT(*) as total_publications,
        COUNT(CASE WHEN p.status = 'scheduled' THEN 1 END) as scheduled_publications,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as published_publications,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_publications,
        COUNT(CASE WHEN p.created_at >= ? THEN 1 END) as publications_this_month
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE c.workspace_id = ?
    `
    )

    const result = stmt.get(thisMonth.toISOString(), workspaceId) as any

    return {
      totalPublications: result.total_publications || 0,
      scheduledPublications: result.scheduled_publications || 0,
      publishedPublications: result.published_publications || 0,
      failedPublications: result.failed_publications || 0,
      publicationsThisMonth: result.publications_this_month || 0,
    }
  }
}
