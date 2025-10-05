import { BaseRepository } from './BaseRepository'
import {
  Resource,
  CreateResourceData,
  UpdateResourceData,
  ResourceFilters,
  QueryOptions,
} from '../types'

/**
 * Repository for managing multimedia resources with search and usage tracking
 */
export class ResourceRepository extends BaseRepository<
  Resource,
  CreateResourceData,
  UpdateResourceData,
  ResourceFilters
> {
  constructor() {
    super('resources')
  }

  /**
   * Convert database row to Resource entity
   */
  protected mapRowToEntity(row: any): Resource {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      originalName: row.original_name,
      filePath: row.file_path,
      url: row.url,
      type: row.type,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      width: row.width,
      height: row.height,
      durationSeconds: row.duration_seconds,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * Convert Resource entity to database row
   */
  protected mapEntityToRow(data: CreateResourceData | UpdateResourceData): any {
    const row: any = {}

    if ('workspaceId' in data) row.workspace_id = data.workspaceId
    if ('name' in data) row.name = data.name
    if ('originalName' in data) row.original_name = data.originalName
    if ('filePath' in data) row.file_path = data.filePath
    if ('url' in data) row.url = data.url
    if ('type' in data) row.type = data.type
    if ('mimeType' in data) row.mime_type = data.mimeType
    if ('sizeBytes' in data) row.size_bytes = data.sizeBytes
    if ('width' in data) row.width = data.width
    if ('height' in data) row.height = data.height
    if ('durationSeconds' in data) row.duration_seconds = data.durationSeconds

    return row
  }

  /**
   * Create new resource
   */
  public create(data: CreateResourceData): Resource {
    const id = this.generateId()
    const now = new Date().toISOString()

    const row = this.mapEntityToRow(data)

    const stmt = this.getStatement(
      'create',
      `
      INSERT INTO resources (
        id, workspace_id, name, original_name, file_path, url, type,
        mime_type, size_bytes, width, height, duration_seconds,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )

    stmt.run(
      id,
      row.workspace_id,
      row.name,
      row.original_name,
      row.file_path,
      row.url,
      row.type,
      row.mime_type,
      row.size_bytes,
      row.width || null,
      row.height || null,
      row.duration_seconds || null,
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Update resource by ID
   */
  public update(id: string, data: UpdateResourceData): Resource | null {
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
      UPDATE resources SET ${updates.join(', ')} WHERE id = ?
    `
    )

    stmt.run(...params)
    return this.findById(id)
  }

  /**
   * Find resources by workspace ID
   */
  public findByWorkspaceId(
    workspaceId: string,
    options?: QueryOptions
  ): Resource[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByWorkspaceId_${JSON.stringify(options)}`,
      `
      SELECT * FROM resources WHERE workspace_id = ? ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Search resources by name within workspace
   */
  public searchByName(
    workspaceId: string,
    searchTerm: string,
    options?: QueryOptions
  ): Resource[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `searchByName_${JSON.stringify(options)}`,
      `
      SELECT * FROM resources 
      WHERE workspace_id = ? AND name LIKE '%' || ? || '%'
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, searchTerm, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find resources by type within workspace
   */
  public findByType(
    workspaceId: string,
    type: 'image' | 'video',
    options?: QueryOptions
  ): Resource[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByType_${type}_${JSON.stringify(options)}`,
      `
      SELECT * FROM resources 
      WHERE workspace_id = ? AND type = ?
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, type, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Get resources with usage information
   */
  public findWithUsageInfo(
    workspaceId: string,
    options?: QueryOptions
  ): Array<
    Resource & {
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
        r.*,
        COUNT(DISTINCT cr.campaign_id) as campaign_usage,
        COUNT(DISTINCT p.id) as publication_usage,
        CASE WHEN COUNT(DISTINCT cr.campaign_id) > 0 OR COUNT(DISTINCT p.id) > 0 THEN 1 ELSE 0 END as is_in_use
      FROM resources r
      LEFT JOIN campaign_resources cr ON r.id = cr.resource_id
      LEFT JOIN publications p ON r.id = p.resource_id
      WHERE r.workspace_id = ?
      GROUP BY r.id
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
   * Check if resource is being used in campaigns or publications
   */
  public isResourceInUse(id: string): boolean {
    const stmt = this.getStatement(
      'isResourceInUse',
      `
      SELECT 1 FROM (
        SELECT 1 FROM campaign_resources WHERE resource_id = ?
        UNION
        SELECT 1 FROM publications WHERE resource_id = ? AND status IN ('scheduled', 'published')
      ) LIMIT 1
    `
    )

    return !!stmt.get(id, id)
  }

  /**
   * Get resource usage details
   */
  public getUsageDetails(id: string): {
    campaigns: Array<{ id: string; name: string }>
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

    // Get campaigns using this resource
    const campaignsStmt = this.getStatement(
      'getUsageCampaigns',
      `
      SELECT c.id, c.name
      FROM campaigns c
      JOIN campaign_resources cr ON c.id = cr.campaign_id
      WHERE cr.resource_id = ?
    `
    )

    const campaigns = campaignsStmt.all(id).map((row: any) => ({
      id: row.id,
      name: row.name,
    }))

    // Get publications using this resource
    const publicationsStmt = this.getStatement(
      'getUsagePublications',
      `
      SELECT p.id, p.content, p.status, p.scheduled_date
      FROM publications p
      WHERE p.resource_id = ?
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
   * Get resources by file size range
   */
  public findBySizeRange(
    workspaceId: string,
    minBytes?: number,
    maxBytes?: number,
    options?: QueryOptions
  ): Resource[] {
    let whereClause = 'WHERE workspace_id = ?'
    const params: any[] = [workspaceId]

    if (minBytes !== undefined) {
      whereClause += ' AND size_bytes >= ?'
      params.push(minBytes)
    }

    if (maxBytes !== undefined) {
      whereClause += ' AND size_bytes <= ?'
      params.push(maxBytes)
    }

    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findBySizeRange_${minBytes}_${maxBytes}_${JSON.stringify(options)}`,
      `
      SELECT * FROM resources ${whereClause} ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(...params, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Get workspace storage statistics
   */
  public getStorageStats(workspaceId: string): {
    totalResources: number
    totalSizeBytes: number
    imageCount: number
    videoCount: number
    averageSizeBytes: number
  } {
    const stmt = this.getStatement(
      'getStorageStats',
      `
      SELECT 
        COUNT(*) as total_resources,
        SUM(size_bytes) as total_size_bytes,
        COUNT(CASE WHEN type = 'image' THEN 1 END) as image_count,
        COUNT(CASE WHEN type = 'video' THEN 1 END) as video_count,
        AVG(size_bytes) as average_size_bytes
      FROM resources 
      WHERE workspace_id = ?
    `
    )

    const result = stmt.get(workspaceId) as any

    return {
      totalResources: result.total_resources || 0,
      totalSizeBytes: result.total_size_bytes || 0,
      imageCount: result.image_count || 0,
      videoCount: result.video_count || 0,
      averageSizeBytes: result.average_size_bytes || 0,
    }
  }

  /**
   * Find duplicate resources by file hash or name
   */
  public findDuplicatesByName(
    workspaceId: string,
    name: string,
    excludeId?: string
  ): Resource[] {
    let stmt
    let params: any[]

    if (excludeId) {
      stmt = this.getStatement(
        'findDuplicatesByNameExclude',
        `
        SELECT * FROM resources 
        WHERE workspace_id = ? AND name = ? AND id != ?
        ORDER BY created_at DESC
      `
      )
      params = [workspaceId, name, excludeId]
    } else {
      stmt = this.getStatement(
        'findDuplicatesByName',
        `
        SELECT * FROM resources 
        WHERE workspace_id = ? AND name = ?
        ORDER BY created_at DESC
      `
      )
      params = [workspaceId, name]
    }

    const rows = stmt.all(...params)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Delete resource with usage validation
   */
  public delete(id: string): boolean {
    if (!this.exists(id)) {
      return false
    }

    return this.transaction(() => {
      // Check if resource is in use
      if (this.isResourceInUse(id)) {
        throw new Error(
          'Cannot delete resource that is being used in campaigns or publications'
        )
      }

      // Delete resource
      const stmt = this.getStatement(
        'delete',
        'DELETE FROM resources WHERE id = ?'
      )
      const result = stmt.run(id)

      return result.changes > 0
    })
  }

  /**
   * Bulk delete unused resources
   */
  public deleteUnusedResources(workspaceId: string): number {
    return this.transaction(() => {
      const stmt = this.getStatement(
        'deleteUnusedResources',
        `
        DELETE FROM resources 
        WHERE workspace_id = ? 
        AND id NOT IN (
          SELECT DISTINCT resource_id FROM campaign_resources
          UNION
          SELECT DISTINCT resource_id FROM publications WHERE status IN ('scheduled', 'published')
        )
      `
      )

      const result = stmt.run(workspaceId)
      return result.changes
    })
  }

  /**
   * Count resources by workspace
   */
  public countByWorkspace(workspaceId: string): number {
    const stmt = this.getStatement(
      'countByWorkspace',
      `
      SELECT COUNT(*) as count FROM resources WHERE workspace_id = ?
    `
    )

    const result = stmt.get(workspaceId) as { count: number }
    return result.count
  }
}
