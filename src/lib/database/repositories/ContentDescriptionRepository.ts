import { BaseRepository } from './BaseRepository'
import {
  ContentDescription,
  CreateContentDescriptionData,
  UpdateContentDescriptionData,
  ContentDescriptionFilters,
  QueryOptions,
  SocialNetwork
} from '../types'

export class ContentDescriptionRepository extends BaseRepository<
  ContentDescription,
  CreateContentDescriptionData,
  UpdateContentDescriptionData,
  ContentDescriptionFilters
> {
  constructor() {
    super('content_descriptions')
  }

  /**
   * Create a new content description
   */
  create(data: CreateContentDescriptionData): ContentDescription {
    const id = this.generateId()
    const now = new Date().toISOString()

    const stmt = this.getStatement(
      'create',
      `INSERT INTO ${this.tableName} (
        id, campaign_id, platform, scheduled_date, content_type, 
        description, template_id, resource_ids, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const row = this.mapEntityToRow(data)
    stmt.run(
      id,
      row.campaign_id,
      row.platform,
      row.scheduled_date,
      row.content_type,
      row.description,
      row.template_id,
      row.resource_ids,
      row.status,
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Find content description by ID
   */
  findById(id: string): ContentDescription | null {
    const stmt = this.getStatement(
      'findById',
      `SELECT * FROM ${this.tableName} WHERE id = ?`
    )

    const row = stmt.get(id)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Find content descriptions by campaign ID
   */
  findByCampaignId(
    campaignId: string,
    options: QueryOptions = {}
  ): ContentDescription[] {
    const { limit = 50, offset = 0, orderBy = 'scheduled_date', orderDirection = 'ASC' } = options

    const stmt = this.getStatement(
      'findByCampaignId',
      `SELECT * FROM ${this.tableName} 
       WHERE campaign_id = ? 
       ORDER BY ${orderBy} ${orderDirection}
       LIMIT ? OFFSET ?`
    )

    const rows = stmt.all(campaignId, limit, offset)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find content descriptions with filters
   */
  findWithFilters(
    filters: ContentDescriptionFilters,
    options: QueryOptions = {}
  ): ContentDescription[] {
    const { limit = 50, offset = 0, orderBy = 'scheduled_date', orderDirection = 'ASC' } = options

    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`
    const params: any[] = []

    if (filters.campaignId) {
      sql += ' AND campaign_id = ?'
      params.push(filters.campaignId)
    }

    if (filters.platform) {
      sql += ' AND platform = ?'
      params.push(filters.platform)
    }

    if (filters.contentType) {
      sql += ' AND content_type = ?'
      params.push(filters.contentType)
    }

    if (filters.status) {
      sql += ' AND status = ?'
      params.push(filters.status)
    }

    if (filters.scheduledDateFrom) {
      sql += ' AND scheduled_date >= ?'
      params.push(filters.scheduledDateFrom.toISOString())
    }

    if (filters.scheduledDateTo) {
      sql += ' AND scheduled_date <= ?'
      params.push(filters.scheduledDateTo.toISOString())
    }

    sql += ` ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...params)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Update content description
   */
  update(id: string, data: UpdateContentDescriptionData): ContentDescription {
    const now = new Date().toISOString()
    const updates: string[] = []
    const params: any[] = []

    if (data.platform !== undefined) {
      updates.push('platform = ?')
      params.push(data.platform)
    }

    if (data.scheduledDate !== undefined) {
      updates.push('scheduled_date = ?')
      params.push(data.scheduledDate.toISOString())
    }

    if (data.contentType !== undefined) {
      updates.push('content_type = ?')
      params.push(data.contentType)
    }

    if (data.description !== undefined) {
      updates.push('description = ?')
      params.push(data.description)
    }

    if (data.templateId !== undefined) {
      updates.push('template_id = ?')
      params.push(data.templateId)
    }

    if (data.resourceIds !== undefined) {
      updates.push('resource_ids = ?')
      params.push(JSON.stringify(data.resourceIds))
    }

    if (data.status !== undefined) {
      updates.push('status = ?')
      params.push(data.status)
    }

    updates.push('updated_at = ?')
    params.push(now)
    params.push(id)

    const sql = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`
    const stmt = this.db.prepare(sql)
    stmt.run(...params)

    return this.findById(id)!
  }

  /**
   * Delete content description
   */
  delete(id: string): boolean {
    const stmt = this.getStatement(
      'delete',
      `DELETE FROM ${this.tableName} WHERE id = ?`
    )

    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Delete all content descriptions for a campaign
   */
  deleteByCampaignId(campaignId: string): number {
    const stmt = this.getStatement(
      'deleteByCampaignId',
      `DELETE FROM ${this.tableName} WHERE campaign_id = ?`
    )

    const result = stmt.run(campaignId)
    return result.changes
  }

  /**
   * Count content descriptions by campaign
   */
  countByCampaignId(campaignId: string): number {
    const stmt = this.getStatement(
      'countByCampaignId',
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE campaign_id = ?`
    )

    const result = stmt.get(campaignId) as { count: number }
    return result.count
  }

  /**
   * Bulk create content descriptions
   */
  bulkCreate(descriptions: CreateContentDescriptionData[]): ContentDescription[] {
    const transaction = this.db.transaction(() => {
      const createdDescriptions: ContentDescription[] = []
      
      for (const description of descriptions) {
        const created = this.create(description)
        createdDescriptions.push(created)
      }
      
      return createdDescriptions
    })

    return transaction()
  }

  /**
   * Update status for multiple descriptions
   */
  bulkUpdateStatus(
    ids: string[], 
    status: 'pending' | 'approved' | 'regenerating' | 'generated'
  ): number {
    if (ids.length === 0) return 0

    const placeholders = ids.map(() => '?').join(',')
    const sql = `UPDATE ${this.tableName} 
                 SET status = ?, updated_at = ? 
                 WHERE id IN (${placeholders})`
    
    const stmt = this.db.prepare(sql)
    const result = stmt.run(status, new Date().toISOString(), ...ids)
    return result.changes
  }

  /**
   * Map database row to ContentDescription entity
   */
  protected mapRowToEntity(row: any): ContentDescription {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      platform: row.platform as SocialNetwork,
      scheduledDate: new Date(row.scheduled_date),
      contentType: row.content_type,
      description: row.description,
      templateId: row.template_id || undefined,
      resourceIds: row.resource_ids ? JSON.parse(row.resource_ids) : [],
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  /**
   * Map entity data to database row
   */
  protected mapEntityToRow(data: CreateContentDescriptionData | UpdateContentDescriptionData): any {
    return {
      campaign_id: (data as CreateContentDescriptionData).campaignId,
      platform: data.platform,
      scheduled_date: data.scheduledDate?.toISOString(),
      content_type: data.contentType,
      description: data.description,
      template_id: data.templateId || null,
      resource_ids: data.resourceIds ? JSON.stringify(data.resourceIds) : '[]',
      status: data.status || 'pending'
    }
  }
}