import { BaseRepository } from './BaseRepository'
import {
  Template,
  CreateTemplateData,
  UpdateTemplateData,
  TemplateFilters,
  SocialNetwork,
  QueryOptions,
} from '../types'

/**
 * Repository for managing templates with JSON support and campaign dependencies
 */
export class TemplateRepository extends BaseRepository<
  Template,
  CreateTemplateData,
  UpdateTemplateData,
  TemplateFilters
> {
  constructor() {
    super('templates')
  }

  /**
   * Convert database row to Template entity
   */
  protected mapRowToEntity(row: any): Template {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      type: row.type,
      images: JSON.parse(row.images),
      socialNetworks: JSON.parse(row.social_networks),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * Convert Template entity to database row
   */
  protected mapEntityToRow(data: CreateTemplateData | UpdateTemplateData): any {
    const row: any = {}

    if ('workspaceId' in data) row.workspace_id = data.workspaceId
    if ('name' in data) row.name = data.name
    if ('type' in data) row.type = data.type
    if ('images' in data) row.images = JSON.stringify(data.images)
    if ('socialNetworks' in data)
      row.social_networks = JSON.stringify(data.socialNetworks)

    return row
  }

  /**
   * Create new template
   */
  public create(data: CreateTemplateData): Template {
    const id = this.generateId()
    const now = new Date().toISOString()

    const row = this.mapEntityToRow(data)

    const stmt = this.getStatement(
      'create',
      `
      INSERT INTO templates (
        id, workspace_id, name, type, images, social_networks,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    )

    stmt.run(
      id,
      row.workspace_id,
      row.name,
      row.type || 'single',
      row.images,
      row.social_networks,
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Update template by ID
   */
  public update(id: string, data: UpdateTemplateData): Template | null {
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
      UPDATE templates SET ${updates.join(', ')} WHERE id = ?
    `
    )

    stmt.run(...params)
    return this.findById(id)
  }

  /**
   * Find templates by workspace ID
   */
  public findByWorkspaceId(
    workspaceId: string,
    options?: QueryOptions
  ): Template[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByWorkspaceId_${JSON.stringify(options)}`,
      `
      SELECT * FROM templates WHERE workspace_id = ? ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find templates by type within workspace
   */
  public findByType(
    workspaceId: string,
    type: 'single' | 'carousel',
    options?: QueryOptions
  ): Template[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByType_${type}_${JSON.stringify(options)}`,
      `
      SELECT * FROM templates 
      WHERE workspace_id = ? AND type = ?
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, type, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find templates by supported social networks
   */
  public findBySocialNetwork(
    workspaceId: string,
    socialNetwork: SocialNetwork,
    options?: QueryOptions
  ): Template[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findBySocialNetwork_${socialNetwork}_${JSON.stringify(options)}`,
      `
      SELECT * FROM templates 
      WHERE workspace_id = ? AND json_extract(social_networks, '$') LIKE '%"' || ? || '"%'
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, socialNetwork, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find templates supporting multiple social networks
   */
  public findByMultipleSocialNetworks(
    workspaceId: string,
    socialNetworks: SocialNetwork[],
    options?: QueryOptions
  ): Template[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    // Build conditions for each social network
    const conditions = socialNetworks
      .map(() => `json_extract(social_networks, '$') LIKE '%"' || ? || '"%'`)
      .join(' AND ')

    const stmt = this.getStatement(
      `findByMultipleSocialNetworks_${socialNetworks.join('_')}_${JSON.stringify(options)}`,
      `
      SELECT * FROM templates 
      WHERE workspace_id = ? AND ${conditions}
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, ...socialNetworks, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Search templates by name within workspace
   */
  public searchByName(
    workspaceId: string,
    searchTerm: string,
    options?: QueryOptions
  ): Template[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `searchByName_${JSON.stringify(options)}`,
      `
      SELECT * FROM templates 
      WHERE workspace_id = ? AND name LIKE '%' || ? || '%'
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, searchTerm, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Get templates with usage information
   */
  public findWithUsageInfo(
    workspaceId: string,
    options?: QueryOptions
  ): Array<
    Template & {
      campaignUsage: number
      publicationUsage: number
      isInUse: boolean
    }
  > {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findWithUsageInfo_${JSON.stringify(options)}`,
      `
      SELECT 
        t.*,
        COUNT(DISTINCT ct.campaign_id) as campaign_usage,
        COUNT(DISTINCT p.id) as publication_usage,
        CASE WHEN COUNT(DISTINCT ct.campaign_id) > 0 OR COUNT(DISTINCT p.id) > 0 THEN 1 ELSE 0 END as is_in_use
      FROM templates t
      LEFT JOIN campaign_templates ct ON t.id = ct.template_id
      LEFT JOIN publications p ON t.id = p.template_id
      WHERE t.workspace_id = ?
      GROUP BY t.id
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, ...limitParams)

    return rows.map((row: any) => ({
      ...this.mapRowToEntity(row),
      campaignUsage: row.campaign_usage || 0,
      publicationUsage: row.publication_usage || 0,
      isInUse: Boolean(row.is_in_use),
    }))
  }

  /**
   * Check if template is being used in campaigns
   */
  public isTemplateInUse(id: string): boolean {
    const stmt = this.getStatement(
      'isTemplateInUse',
      `
      SELECT 1 FROM (
        SELECT 1 FROM campaign_templates WHERE template_id = ?
        UNION
        SELECT 1 FROM publications WHERE template_id = ? AND status IN ('scheduled', 'published')
      ) LIMIT 1
    `
    )

    return !!stmt.get(id, id)
  }

  /**
   * Get template usage details
   */
  public getUsageDetails(id: string): {
    campaigns: Array<{ id: string; name: string; status: string }>
    publications: Array<{
      id: string
      content: string
      status: string
      scheduledDate: Date
    }>
  } | null {
    if (!this.exists(id)) {
      return null
    }

    // Get campaigns using this template
    const campaignsStmt = this.getStatement(
      'getUsageCampaigns',
      `
      SELECT c.id, c.name, c.status
      FROM campaigns c
      JOIN campaign_templates ct ON c.id = ct.campaign_id
      WHERE ct.template_id = ?
    `
    )

    const campaigns = campaignsStmt.all(id).map((row: any) => ({
      id: row.id,
      name: row.name,
      status: row.status,
    }))

    // Get publications using this template
    const publicationsStmt = this.getStatement(
      'getUsagePublications',
      `
      SELECT p.id, p.content, p.status, p.scheduled_date
      FROM publications p
      WHERE p.template_id = ?
      ORDER BY p.scheduled_date DESC
    `
    )

    const publications = publicationsStmt.all(id).map((row: any) => ({
      id: row.id,
      content: row.content,
      status: row.status,
      scheduledDate: new Date(row.scheduled_date),
    }))

    return { campaigns, publications }
  }

  /**
   * Update template images
   */
  public updateImages(id: string, images: string[]): Template | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'updateImages',
      `
      UPDATE templates SET images = ?, updated_at = ? WHERE id = ?
    `
    )

    stmt.run(JSON.stringify(images), new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Update template social networks
   */
  public updateSocialNetworks(
    id: string,
    socialNetworks: SocialNetwork[]
  ): Template | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'updateSocialNetworks',
      `
      UPDATE templates SET social_networks = ?, updated_at = ? WHERE id = ?
    `
    )

    stmt.run(JSON.stringify(socialNetworks), new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Find templates by name within workspace (exact match)
   */
  public findByName(workspaceId: string, name: string): Template | null {
    const stmt = this.getStatement(
      'findByName',
      `
      SELECT * FROM templates WHERE workspace_id = ? AND name = ?
    `
    )
    const row = stmt.get(workspaceId, name)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Check if template name is available within workspace
   */
  public isNameAvailable(
    workspaceId: string,
    name: string,
    excludeTemplateId?: string
  ): boolean {
    let stmt
    let params: any[]

    if (excludeTemplateId) {
      stmt = this.getStatement(
        'isNameAvailableExclude',
        `
        SELECT 1 FROM templates 
        WHERE workspace_id = ? AND name = ? AND id != ? 
        LIMIT 1
      `
      )
      params = [workspaceId, name, excludeTemplateId]
    } else {
      stmt = this.getStatement(
        'isNameAvailable',
        `
        SELECT 1 FROM templates 
        WHERE workspace_id = ? AND name = ? 
        LIMIT 1
      `
      )
      params = [workspaceId, name]
    }

    return !stmt.get(...params)
  }

  /**
   * Get template statistics for workspace
   */
  public getWorkspaceStats(workspaceId: string): {
    totalTemplates: number
    singleTemplates: number
    carouselTemplates: number
    templatesInUse: number
  } {
    const stmt = this.getStatement(
      'getWorkspaceStats',
      `
      SELECT 
        COUNT(*) as total_templates,
        COUNT(CASE WHEN type = 'single' THEN 1 END) as single_templates,
        COUNT(CASE WHEN type = 'carousel' THEN 1 END) as carousel_templates,
        COUNT(CASE WHEN EXISTS(
          SELECT 1 FROM campaign_templates ct WHERE ct.template_id = t.id
        ) OR EXISTS(
          SELECT 1 FROM publications p WHERE p.template_id = t.id
        ) THEN 1 END) as templates_in_use
      FROM templates t
      WHERE workspace_id = ?
    `
    )

    const result = stmt.get(workspaceId) as any

    return {
      totalTemplates: result.total_templates || 0,
      singleTemplates: result.single_templates || 0,
      carouselTemplates: result.carousel_templates || 0,
      templatesInUse: result.templates_in_use || 0,
    }
  }

  /**
   * Delete template with dependency validation
   */
  public delete(id: string): boolean {
    if (!this.exists(id)) {
      return false
    }

    return this.transaction(() => {
      // Check if template is in use
      if (this.isTemplateInUse(id)) {
        throw new Error(
          'Cannot delete template that is being used in campaigns or publications'
        )
      }

      // Delete template
      const stmt = this.getStatement(
        'delete',
        'DELETE FROM templates WHERE id = ?'
      )
      const result = stmt.run(id)

      return result.changes > 0
    })
  }

  /**
   * Bulk delete unused templates
   */
  public deleteUnusedTemplates(workspaceId: string): number {
    return this.transaction(() => {
      const stmt = this.getStatement(
        'deleteUnusedTemplates',
        `
        DELETE FROM templates 
        WHERE workspace_id = ? 
        AND id NOT IN (
          SELECT DISTINCT template_id FROM campaign_templates
          UNION
          SELECT DISTINCT template_id FROM publications WHERE status IN ('scheduled', 'published')
        )
      `
      )

      const result = stmt.run(workspaceId)
      return result.changes
    })
  }

  /**
   * Count templates by workspace
   */
  public countByWorkspace(workspaceId: string): number {
    const stmt = this.getStatement(
      'countByWorkspace',
      `
      SELECT COUNT(*) as count FROM templates WHERE workspace_id = ?
    `
    )

    const result = stmt.get(workspaceId) as { count: number }
    return result.count
  }
}
