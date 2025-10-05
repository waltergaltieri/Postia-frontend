import { BaseRepository } from './BaseRepository'
import {
  Campaign,
  CreateCampaignData,
  UpdateCampaignData,
  CampaignFilters,
  SocialNetwork,
  OptimizationSettings,
  QueryOptions,
} from '../types'

/**
 * Repository for managing campaigns with complex relationships and transactions
 */
export class CampaignRepository extends BaseRepository<
  Campaign,
  CreateCampaignData,
  UpdateCampaignData,
  CampaignFilters
> {
  constructor() {
    super('campaigns')
  }

  /**
   * Convert database row to Campaign entity
   */
  protected mapRowToEntity(row: any): Campaign {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      objective: row.objective,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      socialNetworks: JSON.parse(row.social_networks),
      intervalHours: row.interval_hours,
      contentType: row.content_type,
      optimizationSettings: row.optimization_settings
        ? JSON.parse(row.optimization_settings)
        : undefined,
      prompt: row.prompt,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * Convert Campaign entity to database row
   */
  protected mapEntityToRow(data: CreateCampaignData | UpdateCampaignData): any {
    const row: any = {}

    if ('workspaceId' in data) row.workspace_id = data.workspaceId
    if ('name' in data) row.name = data.name
    if ('objective' in data) row.objective = data.objective
    if ('startDate' in data)
      row.start_date = data.startDate?.toISOString().split('T')[0]
    if ('endDate' in data)
      row.end_date = data.endDate?.toISOString().split('T')[0]
    if ('socialNetworks' in data)
      row.social_networks = JSON.stringify(data.socialNetworks)
    if ('intervalHours' in data) row.interval_hours = data.intervalHours
    if ('contentType' in data) row.content_type = data.contentType
    if ('optimizationSettings' in data) {
      row.optimization_settings = data.optimizationSettings
        ? JSON.stringify(data.optimizationSettings)
        : null
    }
    if ('prompt' in data) row.prompt = data.prompt
    if ('status' in data) row.status = data.status

    return row
  }

  /**
   * Create new campaign
   */
  public create(data: CreateCampaignData): Campaign {
    const id = this.generateId()
    const now = new Date().toISOString()

    const row = this.mapEntityToRow(data)

    const stmt = this.getStatement(
      'create',
      `
      INSERT INTO campaigns (
        id, workspace_id, name, objective, start_date, end_date,
        social_networks, interval_hours, content_type, optimization_settings,
        prompt, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )

    stmt.run(
      id,
      row.workspace_id,
      row.name,
      row.objective,
      row.start_date,
      row.end_date,
      row.social_networks,
      row.interval_hours || 24,
      row.content_type || 'unified',
      row.optimization_settings || null,
      row.prompt,
      row.status || 'draft',
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Update campaign by ID
   */
  public update(id: string, data: UpdateCampaignData): Campaign | null {
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
      UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?
    `
    )

    stmt.run(...params)
    return this.findById(id)
  }

  /**
   * Create campaign with resources and templates
   */
  public createWithRelations(
    campaignData: CreateCampaignData,
    resourceIds: string[],
    templateIds: string[]
  ): Campaign {
    return this.transaction(() => {
      // Create campaign
      const campaign = this.create(campaignData)

      // Associate resources
      if (resourceIds.length > 0) {
        const insertResource = this.getStatement(
          'insertCampaignResource',
          `
          INSERT INTO campaign_resources (campaign_id, resource_id) VALUES (?, ?)
        `
        )

        for (const resourceId of resourceIds) {
          insertResource.run(campaign.id, resourceId)
        }
      }

      // Associate templates
      if (templateIds.length > 0) {
        const insertTemplate = this.getStatement(
          'insertCampaignTemplate',
          `
          INSERT INTO campaign_templates (campaign_id, template_id) VALUES (?, ?)
        `
        )

        for (const templateId of templateIds) {
          insertTemplate.run(campaign.id, templateId)
        }
      }

      return campaign
    })
  }

  /**
   * Find campaigns by workspace ID
   */
  public findByWorkspaceId(
    workspaceId: string,
    options?: QueryOptions
  ): Campaign[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByWorkspaceId_${JSON.stringify(options)}`,
      `
      SELECT * FROM campaigns WHERE workspace_id = ? ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find campaigns by status
   */
  public findByStatus(
    workspaceId: string,
    status: Campaign['status'],
    options?: QueryOptions
  ): Campaign[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByStatus_${status}_${JSON.stringify(options)}`,
      `
      SELECT * FROM campaigns 
      WHERE workspace_id = ? AND status = ?
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, status, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find campaigns by date range
   */
  public findByDateRange(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    options?: QueryOptions
  ): Campaign[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByDateRange_${JSON.stringify(options)}`,
      `
      SELECT * FROM campaigns 
      WHERE workspace_id = ? 
      AND start_date <= ? 
      AND end_date >= ?
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(
      workspaceId,
      endDate.toISOString().split('T')[0],
      startDate.toISOString().split('T')[0],
      ...limitParams
    )
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find active campaigns
   */
  public findActiveCampaigns(
    workspaceId: string,
    options?: QueryOptions
  ): Campaign[] {
    return this.findByStatus(workspaceId, 'active', options)
  }

  /**
   * Update campaign status
   */
  public updateStatus(id: string, status: Campaign['status']): Campaign | null {
    if (!this.exists(id)) {
      return null
    }

    // Validate status transitions
    const current = this.findById(id)
    if (!current) return null

    const validTransitions: Record<Campaign['status'], Campaign['status'][]> = {
      draft: ['active', 'paused'],
      active: ['completed', 'paused'],
      paused: ['active', 'completed'],
      completed: [], // Cannot transition from completed
    }

    if (!validTransitions[current.status].includes(status)) {
      throw new Error(
        `Invalid status transition from ${current.status} to ${status}`
      )
    }

    const stmt = this.getStatement(
      'updateStatus',
      `
      UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ?
    `
    )

    stmt.run(status, new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Get campaign with associated resources and templates
   */
  public findByIdWithRelations(id: string):
    | (Campaign & {
        resources: Array<{
          id: string
          name: string
          url: string
          type: string
        }>
        templates: Array<{ id: string; name: string; type: string }>
      })
    | null {
    const campaign = this.findById(id)
    if (!campaign) return null

    // Get associated resources
    const resourcesStmt = this.getStatement(
      'getCampaignResources',
      `
      SELECT r.id, r.name, r.url, r.type
      FROM resources r
      JOIN campaign_resources cr ON r.id = cr.resource_id
      WHERE cr.campaign_id = ?
    `
    )

    const resources = resourcesStmt.all(id).map((row: any) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      type: row.type,
    }))

    // Get associated templates
    const templatesStmt = this.getStatement(
      'getCampaignTemplates',
      `
      SELECT t.id, t.name, t.type
      FROM templates t
      JOIN campaign_templates ct ON t.id = ct.template_id
      WHERE ct.campaign_id = ?
    `
    )

    const templates = templatesStmt.all(id).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
    }))

    return {
      ...campaign,
      resources,
      templates,
    }
  }

  /**
   * Add resource to campaign
   */
  public addResource(campaignId: string, resourceId: string): boolean {
    if (!this.exists(campaignId)) {
      return false
    }

    const stmt = this.getStatement(
      'addResource',
      `
      INSERT OR IGNORE INTO campaign_resources (campaign_id, resource_id) VALUES (?, ?)
    `
    )

    const result = stmt.run(campaignId, resourceId)
    return result.changes > 0
  }

  /**
   * Remove resource from campaign
   */
  public removeResource(campaignId: string, resourceId: string): boolean {
    const stmt = this.getStatement(
      'removeResource',
      `
      DELETE FROM campaign_resources WHERE campaign_id = ? AND resource_id = ?
    `
    )

    const result = stmt.run(campaignId, resourceId)
    return result.changes > 0
  }

  /**
   * Add template to campaign
   */
  public addTemplate(campaignId: string, templateId: string): boolean {
    if (!this.exists(campaignId)) {
      return false
    }

    const stmt = this.getStatement(
      'addTemplate',
      `
      INSERT OR IGNORE INTO campaign_templates (campaign_id, template_id) VALUES (?, ?)
    `
    )

    const result = stmt.run(campaignId, templateId)
    return result.changes > 0
  }

  /**
   * Remove template from campaign
   */
  public removeTemplate(campaignId: string, templateId: string): boolean {
    const stmt = this.getStatement(
      'removeTemplate',
      `
      DELETE FROM campaign_templates WHERE campaign_id = ? AND template_id = ?
    `
    )

    const result = stmt.run(campaignId, templateId)
    return result.changes > 0
  }

  /**
   * Get campaign statistics
   */
  public getStatistics(id: string): {
    totalPublications: number
    scheduledPublications: number
    publishedPublications: number
    failedPublications: number
    resourceCount: number
    templateCount: number
  } | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'getStatistics',
      `
      SELECT 
        COUNT(DISTINCT p.id) as total_publications,
        COUNT(DISTINCT CASE WHEN p.status = 'scheduled' THEN p.id END) as scheduled_publications,
        COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) as published_publications,
        COUNT(DISTINCT CASE WHEN p.status = 'failed' THEN p.id END) as failed_publications,
        COUNT(DISTINCT cr.resource_id) as resource_count,
        COUNT(DISTINCT ct.template_id) as template_count
      FROM campaigns c
      LEFT JOIN publications p ON c.id = p.campaign_id
      LEFT JOIN campaign_resources cr ON c.id = cr.campaign_id
      LEFT JOIN campaign_templates ct ON c.id = ct.campaign_id
      WHERE c.id = ?
    `
    )

    const result = stmt.get(id) as any

    return {
      totalPublications: result.total_publications || 0,
      scheduledPublications: result.scheduled_publications || 0,
      publishedPublications: result.published_publications || 0,
      failedPublications: result.failed_publications || 0,
      resourceCount: result.resource_count || 0,
      templateCount: result.template_count || 0,
    }
  }

  /**
   * Search campaigns by name
   */
  public searchByName(
    workspaceId: string,
    searchTerm: string,
    options?: QueryOptions
  ): Campaign[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `searchByName_${JSON.stringify(options)}`,
      `
      SELECT * FROM campaigns 
      WHERE workspace_id = ? AND name LIKE '%' || ? || '%'
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, searchTerm, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Get campaigns ending soon
   */
  public findEndingSoon(workspaceId: string, days: number = 7): Campaign[] {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    const stmt = this.getStatement(
      `findEndingSoon_${days}`,
      `
      SELECT * FROM campaigns 
      WHERE workspace_id = ? 
      AND status = 'active'
      AND end_date <= ?
      ORDER BY end_date ASC
    `
    )

    const rows = stmt.all(workspaceId, endDate.toISOString().split('T')[0])
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Update optimization settings
   */
  public updateOptimizationSettings(
    id: string,
    settings: OptimizationSettings
  ): Campaign | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'updateOptimizationSettings',
      `
      UPDATE campaigns SET optimization_settings = ?, updated_at = ? WHERE id = ?
    `
    )

    stmt.run(JSON.stringify(settings), new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Delete campaign with validation
   */
  public delete(id: string): boolean {
    if (!this.exists(id)) {
      return false
    }

    return this.transaction(() => {
      const campaign = this.findById(id)
      if (!campaign) return false

      // Check if campaign is active
      if (campaign.status === 'active') {
        throw new Error('Cannot delete active campaign')
      }

      // Check for scheduled publications
      const scheduledPublicationsStmt = this.getStatement(
        'checkScheduledPublications',
        `
        SELECT COUNT(*) as count FROM publications 
        WHERE campaign_id = ? AND status = 'scheduled'
      `
      )

      const scheduledPublications = scheduledPublicationsStmt.get(id) as {
        count: number
      }

      if (scheduledPublications.count > 0) {
        throw new Error('Cannot delete campaign with scheduled publications')
      }

      // Delete campaign (cascade will handle related data)
      const deleteStmt = this.getStatement(
        'delete',
        'DELETE FROM campaigns WHERE id = ?'
      )
      const result = deleteStmt.run(id)

      return result.changes > 0
    })
  }

  /**
   * Count campaigns by workspace
   */
  public countByWorkspace(workspaceId: string): number {
    const stmt = this.getStatement(
      'countByWorkspace',
      `
      SELECT COUNT(*) as count FROM campaigns WHERE workspace_id = ?
    `
    )

    const result = stmt.get(workspaceId) as { count: number }
    return result.count
  }

  /**
   * Get workspace campaign statistics
   */
  public getWorkspaceStats(workspaceId: string): {
    totalCampaigns: number
    activeCampaigns: number
    draftCampaigns: number
    completedCampaigns: number
    pausedCampaigns: number
  } {
    const stmt = this.getStatement(
      'getWorkspaceStats',
      `
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_campaigns,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_campaigns,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_campaigns
      FROM campaigns 
      WHERE workspace_id = ?
    `
    )

    const result = stmt.get(workspaceId) as any

    return {
      totalCampaigns: result.total_campaigns || 0,
      activeCampaigns: result.active_campaigns || 0,
      draftCampaigns: result.draft_campaigns || 0,
      completedCampaigns: result.completed_campaigns || 0,
      pausedCampaigns: result.paused_campaigns || 0,
    }
  }
}
