import { BaseRepository } from './BaseRepository'

export interface ResourceAnalysisRecord {
  id: string
  resourceId: string
  workspaceId: string
  campaignId?: string
  visualAnalysis: string // JSON string
  semanticAnalysis?: string // JSON string
  analysisVersion: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateResourceAnalysisData {
  resourceId: string
  workspaceId: string
  campaignId?: string
  visualAnalysis: any
  semanticAnalysis?: any
  analysisVersion: string
}

export interface UpdateResourceAnalysisData {
  visualAnalysis?: any
  semanticAnalysis?: any
  analysisVersion?: string
}

export class ResourceAnalysisRepository extends BaseRepository<
  ResourceAnalysisRecord,
  CreateResourceAnalysisData,
  UpdateResourceAnalysisData,
  any
> {
  constructor() {
    super('resource_analyses')
  }

  /**
   * Create a new resource analysis
   */
  create(data: CreateResourceAnalysisData): ResourceAnalysisRecord {
    const id = this.generateId()
    const now = new Date().toISOString()

    const stmt = this.getStatement(
      'create',
      `INSERT INTO ${this.tableName} (
        id, resource_id, workspace_id, campaign_id, 
        visual_analysis, semantic_analysis, analysis_version,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    stmt.run(
      id,
      data.resourceId,
      data.workspaceId,
      data.campaignId || null,
      JSON.stringify(data.visualAnalysis),
      data.semanticAnalysis ? JSON.stringify(data.semanticAnalysis) : null,
      data.analysisVersion,
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Find resource analysis by ID
   */
  findById(id: string): ResourceAnalysisRecord | null {
    const stmt = this.getStatement(
      'findById',
      `SELECT * FROM ${this.tableName} WHERE id = ?`
    )

    const row = stmt.get(id)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Find analysis by resource ID
   */
  findByResourceId(resourceId: string): ResourceAnalysisRecord | null {
    const stmt = this.getStatement(
      'findByResourceId',
      `SELECT * FROM ${this.tableName} 
       WHERE resource_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`
    )

    const row = stmt.get(resourceId)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Find analyses by multiple resource IDs
   */
  findByResourceIds(resourceIds: string[]): Record<string, ResourceAnalysisRecord> {
    if (resourceIds.length === 0) return {}

    const placeholders = resourceIds.map(() => '?').join(',')
    const stmt = this.db.prepare(
      `SELECT * FROM ${this.tableName} 
       WHERE resource_id IN (${placeholders})
       ORDER BY created_at DESC`
    )

    const rows = stmt.all(...resourceIds)
    const result: Record<string, ResourceAnalysisRecord> = {}

    rows.forEach(row => {
      const analysis = this.mapRowToEntity(row)
      // Keep only the latest analysis per resource
      if (!result[analysis.resourceId]) {
        result[analysis.resourceId] = analysis
      }
    })

    return result
  }

  /**
   * Find analyses by workspace ID
   */
  findByWorkspaceId(workspaceId: string): ResourceAnalysisRecord[] {
    const stmt = this.getStatement(
      'findByWorkspaceId',
      `SELECT * FROM ${this.tableName} 
       WHERE workspace_id = ? 
       ORDER BY created_at DESC`
    )

    const rows = stmt.all(workspaceId)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Update resource analysis
   */
  update(id: string, data: UpdateResourceAnalysisData): ResourceAnalysisRecord {
    const now = new Date().toISOString()
    const updates: string[] = []
    const params: any[] = []

    if (data.visualAnalysis !== undefined) {
      updates.push('visual_analysis = ?')
      params.push(JSON.stringify(data.visualAnalysis))
    }

    if (data.semanticAnalysis !== undefined) {
      updates.push('semantic_analysis = ?')
      params.push(data.semanticAnalysis ? JSON.stringify(data.semanticAnalysis) : null)
    }

    if (data.analysisVersion !== undefined) {
      updates.push('analysis_version = ?')
      params.push(data.analysisVersion)
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
   * Delete resource analysis
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
   * Delete all analyses for a resource
   */
  deleteByResourceId(resourceId: string): number {
    const stmt = this.getStatement(
      'deleteByResourceId',
      `DELETE FROM ${this.tableName} WHERE resource_id = ?`
    )

    const result = stmt.run(resourceId)
    return result.changes
  }

  /**
   * Check if resource needs analysis (no analysis or outdated version)
   */
  needsAnalysis(resourceId: string, currentVersion: string): boolean {
    const analysis = this.findByResourceId(resourceId)
    
    if (!analysis) {
      return true // No analysis exists
    }

    if (analysis.analysisVersion !== currentVersion) {
      return true // Analysis is outdated
    }

    return false // Analysis is current
  }

  /**
   * Map database row to entity
   */
  protected mapRowToEntity(row: any): ResourceAnalysisRecord {
    return {
      id: row.id,
      resourceId: row.resource_id,
      workspaceId: row.workspace_id,
      campaignId: row.campaign_id || undefined,
      visualAnalysis: row.visual_analysis ? JSON.parse(row.visual_analysis) : null,
      semanticAnalysis: row.semantic_analysis ? JSON.parse(row.semantic_analysis) : null,
      analysisVersion: row.analysis_version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  /**
   * Map entity data to database row
   */
  protected mapEntityToRow(data: CreateResourceAnalysisData | UpdateResourceAnalysisData): any {
    return {
      resource_id: (data as CreateResourceAnalysisData).resourceId,
      workspace_id: (data as CreateResourceAnalysisData).workspaceId,
      campaign_id: (data as CreateResourceAnalysisData).campaignId || null,
      visual_analysis: data.visualAnalysis ? JSON.stringify(data.visualAnalysis) : null,
      semantic_analysis: data.semanticAnalysis ? JSON.stringify(data.semanticAnalysis) : null,
      analysis_version: data.analysisVersion
    }
  }
}