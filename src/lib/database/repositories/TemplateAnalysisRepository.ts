import { BaseRepository } from './BaseRepository'

export interface TemplateAnalysisRecord {
  id: string
  templateId: string
  workspaceId: string
  campaignId?: string
  semanticAnalysis: string // JSON string
  analysisVersion: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTemplateAnalysisData {
  templateId: string
  workspaceId: string
  campaignId?: string
  semanticAnalysis: any
  analysisVersion: string
}

export interface UpdateTemplateAnalysisData {
  semanticAnalysis?: any
  analysisVersion?: string
}

export class TemplateAnalysisRepository extends BaseRepository<
  TemplateAnalysisRecord,
  CreateTemplateAnalysisData,
  UpdateTemplateAnalysisData,
  any
> {
  constructor() {
    super('template_analyses')
  }

  /**
   * Create a new template analysis
   */
  create(data: CreateTemplateAnalysisData): TemplateAnalysisRecord {
    const id = this.generateId()
    const now = new Date().toISOString()

    const stmt = this.getStatement(
      'create',
      `INSERT INTO ${this.tableName} (
        id, template_id, workspace_id, campaign_id, 
        semantic_analysis, analysis_version,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )

    stmt.run(
      id,
      data.templateId,
      data.workspaceId,
      data.campaignId || null,
      JSON.stringify(data.semanticAnalysis),
      data.analysisVersion,
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Find template analysis by ID
   */
  findById(id: string): TemplateAnalysisRecord | null {
    const stmt = this.getStatement(
      'findById',
      `SELECT * FROM ${this.tableName} WHERE id = ?`
    )

    const row = stmt.get(id)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Find analysis by template ID
   */
  findByTemplateId(templateId: string): TemplateAnalysisRecord | null {
    const stmt = this.getStatement(
      'findByTemplateId',
      `SELECT * FROM ${this.tableName} 
       WHERE template_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`
    )

    const row = stmt.get(templateId)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Find analyses by multiple template IDs
   */
  findByTemplateIds(templateIds: string[]): Record<string, TemplateAnalysisRecord> {
    if (templateIds.length === 0) return {}

    const placeholders = templateIds.map(() => '?').join(',')
    const stmt = this.db.prepare(
      `SELECT * FROM ${this.tableName} 
       WHERE template_id IN (${placeholders})
       ORDER BY created_at DESC`
    )

    const rows = stmt.all(...templateIds)
    const result: Record<string, TemplateAnalysisRecord> = {}

    rows.forEach(row => {
      const analysis = this.mapRowToEntity(row)
      // Keep only the latest analysis per template
      if (!result[analysis.templateId]) {
        result[analysis.templateId] = analysis
      }
    })

    return result
  }

  /**
   * Find analyses by workspace ID
   */
  findByWorkspaceId(workspaceId: string): TemplateAnalysisRecord[] {
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
   * Update template analysis
   */
  update(id: string, data: UpdateTemplateAnalysisData): TemplateAnalysisRecord {
    const now = new Date().toISOString()
    const updates: string[] = []
    const params: any[] = []

    if (data.semanticAnalysis !== undefined) {
      updates.push('semantic_analysis = ?')
      params.push(JSON.stringify(data.semanticAnalysis))
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
   * Delete template analysis
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
   * Delete all analyses for a template
   */
  deleteByTemplateId(templateId: string): number {
    const stmt = this.getStatement(
      'deleteByTemplateId',
      `DELETE FROM ${this.tableName} WHERE template_id = ?`
    )

    const result = stmt.run(templateId)
    return result.changes
  }

  /**
   * Check if template needs analysis
   */
  needsAnalysis(templateId: string, currentVersion: string): boolean {
    const analysis = this.findByTemplateId(templateId)
    
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
  protected mapRowToEntity(row: any): TemplateAnalysisRecord {
    return {
      id: row.id,
      templateId: row.template_id,
      workspaceId: row.workspace_id,
      campaignId: row.campaign_id || undefined,
      semanticAnalysis: row.semantic_analysis ? JSON.parse(row.semantic_analysis) : null,
      analysisVersion: row.analysis_version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  /**
   * Map entity data to database row
   */
  protected mapEntityToRow(data: CreateTemplateAnalysisData | UpdateTemplateAnalysisData): any {
    return {
      template_id: (data as CreateTemplateAnalysisData).templateId,
      workspace_id: (data as CreateTemplateAnalysisData).workspaceId,
      campaign_id: (data as CreateTemplateAnalysisData).campaignId || null,
      semantic_analysis: data.semanticAnalysis ? JSON.stringify(data.semanticAnalysis) : null,
      analysis_version: data.analysisVersion
    }
  }
}