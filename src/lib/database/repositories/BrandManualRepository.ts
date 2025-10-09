import { BaseRepository } from './BaseRepository'
import {
  BrandManual,
  CreateBrandManualData,
  UpdateBrandManualData,
  BrandManualFilters,
  QueryOptions
} from '../types'

export class BrandManualRepository extends BaseRepository<
  BrandManual,
  CreateBrandManualData,
  UpdateBrandManualData,
  BrandManualFilters
> {
  constructor() {
    super('brand_manuals')
  }

  /**
   * Create a new brand manual
   */
  create(data: CreateBrandManualData): BrandManual {
    const id = this.generateId()
    const now = new Date().toISOString()

    const stmt = this.getStatement(
      'create',
      `INSERT INTO ${this.tableName} (
        id, workspace_id, brand_voice, brand_values, target_audience, 
        key_messages, dos_donts, color_palette, typography, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const row = this.mapEntityToRow(data)
    stmt.run(
      id,
      row.workspace_id,
      row.brand_voice,
      row.brand_values,
      row.target_audience,
      row.key_messages,
      row.dos_donts,
      row.color_palette,
      row.typography,
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Find brand manual by ID
   */
  findById(id: string): BrandManual | null {
    const stmt = this.getStatement(
      'findById',
      `SELECT * FROM ${this.tableName} WHERE id = ?`
    )

    const row = stmt.get(id)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Find brand manual by workspace ID
   */
  findByWorkspaceId(workspaceId: string): BrandManual | null {
    const stmt = this.getStatement(
      'findByWorkspaceId',
      `SELECT * FROM ${this.tableName} WHERE workspace_id = ?`
    )

    const row = stmt.get(workspaceId)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Find brand manuals with filters
   */
  findWithFilters(
    filters: BrandManualFilters,
    options: QueryOptions = {}
  ): BrandManual[] {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options

    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`
    const params: any[] = []

    if (filters.workspaceId) {
      sql += ' AND workspace_id = ?'
      params.push(filters.workspaceId)
    }

    sql += ` ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...params)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Update brand manual
   */
  update(id: string, data: UpdateBrandManualData): BrandManual {
    const now = new Date().toISOString()
    const updates: string[] = []
    const params: any[] = []

    if (data.brandVoice !== undefined) {
      updates.push('brand_voice = ?')
      params.push(data.brandVoice)
    }

    if (data.brandValues !== undefined) {
      updates.push('brand_values = ?')
      params.push(JSON.stringify(data.brandValues))
    }

    if (data.targetAudience !== undefined) {
      updates.push('target_audience = ?')
      params.push(data.targetAudience)
    }

    if (data.keyMessages !== undefined) {
      updates.push('key_messages = ?')
      params.push(JSON.stringify(data.keyMessages))
    }

    if (data.dosDonts !== undefined) {
      updates.push('dos_donts = ?')
      params.push(JSON.stringify(data.dosDonts))
    }

    if (data.colorPalette !== undefined) {
      updates.push('color_palette = ?')
      params.push(JSON.stringify(data.colorPalette))
    }

    if (data.typography !== undefined) {
      updates.push('typography = ?')
      params.push(data.typography)
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
   * Update or create brand manual for workspace (upsert)
   */
  upsertByWorkspaceId(workspaceId: string, data: CreateBrandManualData | UpdateBrandManualData): BrandManual {
    const existing = this.findByWorkspaceId(workspaceId)
    
    if (existing) {
      return this.update(existing.id, data as UpdateBrandManualData)
    } else {
      return this.create({ ...data, workspaceId } as CreateBrandManualData)
    }
  }

  /**
   * Delete brand manual
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
   * Delete brand manual by workspace ID
   */
  deleteByWorkspaceId(workspaceId: string): boolean {
    const stmt = this.getStatement(
      'deleteByWorkspaceId',
      `DELETE FROM ${this.tableName} WHERE workspace_id = ?`
    )

    const result = stmt.run(workspaceId)
    return result.changes > 0
  }

  /**
   * Get default brand manual for workspace (creates if doesn't exist)
   */
  getOrCreateDefault(workspaceId: string): BrandManual {
    const existing = this.findByWorkspaceId(workspaceId)
    
    if (existing) {
      return existing
    }

    // Create default brand manual
    const defaultData: CreateBrandManualData = {
      workspaceId,
      brandVoice: 'Profesional y cercano',
      brandValues: ['Calidad', 'Innovación', 'Confianza'],
      targetAudience: 'Profesionales y empresas que buscan soluciones de calidad',
      keyMessages: ['Excelencia en el servicio', 'Resultados garantizados'],
      dosDonts: {
        dos: ['Usar un tono profesional', 'Incluir llamadas a la acción claras', 'Mantener coherencia visual'],
        donts: ['Usar jerga técnica excesiva', 'Hacer promesas irreales', 'Ignorar la identidad de marca']
      },
      colorPalette: ['#007bff', '#28a745', '#ffc107'],
      typography: 'Sans-serif moderna y legible'
    }

    return this.create(defaultData)
  }

  /**
   * Map database row to BrandManual entity
   */
  protected mapRowToEntity(row: any): BrandManual {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      brandVoice: row.brand_voice,
      brandValues: row.brand_values ? JSON.parse(row.brand_values) : [],
      targetAudience: row.target_audience,
      keyMessages: row.key_messages ? JSON.parse(row.key_messages) : [],
      dosDonts: row.dos_donts ? JSON.parse(row.dos_donts) : { dos: [], donts: [] },
      colorPalette: row.color_palette ? JSON.parse(row.color_palette) : [],
      typography: row.typography || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  /**
   * Map entity data to database row
   */
  protected mapEntityToRow(data: CreateBrandManualData | UpdateBrandManualData): any {
    return {
      workspace_id: (data as CreateBrandManualData).workspaceId,
      brand_voice: data.brandVoice,
      brand_values: data.brandValues ? JSON.stringify(data.brandValues) : null,
      target_audience: data.targetAudience,
      key_messages: data.keyMessages ? JSON.stringify(data.keyMessages) : null,
      dos_donts: data.dosDonts ? JSON.stringify(data.dosDonts) : null,
      color_palette: data.colorPalette ? JSON.stringify(data.colorPalette) : null,
      typography: data.typography || null
    }
  }
}