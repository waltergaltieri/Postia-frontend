import { BaseRepository } from './BaseRepository'
import {
  Agency,
  CreateAgencyData,
  UpdateAgencyData,
  AgencyFilters,
} from '../types'

/**
 * Repository for managing agencies with CRUD operations and business logic
 */
export class AgencyRepository extends BaseRepository<
  Agency,
  CreateAgencyData,
  UpdateAgencyData,
  AgencyFilters
> {
  constructor() {
    super('agencies')
  }

  /**
   * Convert database row to Agency entity
   */
  protected mapRowToEntity(row: any): Agency {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      credits: row.credits,
      plan: row.plan,
      settings: {
        notifications: Boolean(row.settings_notifications),
        timezone: row.settings_timezone,
        language: row.settings_language,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * Convert Agency entity to database row
   */
  protected mapEntityToRow(data: CreateAgencyData | UpdateAgencyData): any {
    const row: any = {}

    if ('name' in data) row.name = data.name
    if ('email' in data) row.email = data.email
    if ('credits' in data) row.credits = data.credits
    if ('plan' in data) row.plan = data.plan

    if ('settings' in data && data.settings) {
      if (data.settings.notifications !== undefined) {
        row.settings_notifications = data.settings.notifications
      }
      if (data.settings.timezone !== undefined) {
        row.settings_timezone = data.settings.timezone
      }
      if (data.settings.language !== undefined) {
        row.settings_language = data.settings.language
      }
    }

    return row
  }

  /**
   * Create new agency
   */
  public create(data: CreateAgencyData): Agency {
    const id = this.generateId()
    const now = new Date().toISOString()

    const row = this.mapEntityToRow(data)

    const stmt = this.getStatement(
      'create',
      `
      INSERT INTO agencies (
        id, name, email, credits, plan,
        settings_notifications, settings_timezone, settings_language,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )

    stmt.run(
      id,
      row.name,
      row.email,
      row.credits || 0,
      row.plan || 'free',
      row.settings_notifications !== undefined
        ? row.settings_notifications
        : true,
      row.settings_timezone || 'UTC',
      row.settings_language || 'es',
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Update agency by ID
   */
  public update(id: string, data: UpdateAgencyData): Agency | null {
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
      UPDATE agencies SET ${updates.join(', ')} WHERE id = ?
    `
    )

    stmt.run(...params)
    return this.findById(id)
  }

  /**
   * Find agency by email
   */
  public findByEmail(email: string): Agency | null {
    const stmt = this.getStatement(
      'findByEmail',
      'SELECT * FROM agencies WHERE email = ?'
    )
    const row = stmt.get(email)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Update agency credits
   */
  public updateCredits(id: string, credits: number): Agency | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'updateCredits',
      `
      UPDATE agencies SET credits = ?, updated_at = ? WHERE id = ?
    `
    )

    stmt.run(credits, new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Add credits to agency
   */
  public addCredits(id: string, amount: number): Agency | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'addCredits',
      `
      UPDATE agencies SET credits = credits + ?, updated_at = ? WHERE id = ?
    `
    )

    stmt.run(amount, new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Subtract credits from agency
   */
  public subtractCredits(id: string, amount: number): Agency | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'subtractCredits',
      `
      UPDATE agencies SET credits = MAX(0, credits - ?), updated_at = ? WHERE id = ?
    `
    )

    stmt.run(amount, new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Update agency plan
   */
  public updatePlan(
    id: string,
    plan: 'free' | 'pro' | 'enterprise'
  ): Agency | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'updatePlan',
      `
      UPDATE agencies SET plan = ?, updated_at = ? WHERE id = ?
    `
    )

    stmt.run(plan, new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Update agency settings
   */
  public updateSettings(
    id: string,
    settings: Partial<Agency['settings']>
  ): Agency | null {
    if (!this.exists(id)) {
      return null
    }

    const updates: string[] = []
    const params: any[] = []

    if (settings.notifications !== undefined) {
      updates.push('settings_notifications = ?')
      params.push(settings.notifications)
    }

    if (settings.timezone !== undefined) {
      updates.push('settings_timezone = ?')
      params.push(settings.timezone)
    }

    if (settings.language !== undefined) {
      updates.push('settings_language = ?')
      params.push(settings.language)
    }

    if (updates.length === 0) {
      return this.findById(id)
    }

    updates.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    const stmt = this.getStatement(
      `updateSettings_${updates.length}`,
      `
      UPDATE agencies SET ${updates.join(', ')} WHERE id = ?
    `
    )

    stmt.run(...params)
    return this.findById(id)
  }

  /**
   * Get agency statistics
   */
  public getStatistics(id: string): {
    totalWorkspaces: number
    totalCampaigns: number
    totalResources: number
    totalPublications: number
  } | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'getStatistics',
      `
      SELECT 
        COUNT(DISTINCT w.id) as total_workspaces,
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT r.id) as total_resources,
        COUNT(DISTINCT p.id) as total_publications
      FROM agencies a
      LEFT JOIN workspaces w ON a.id = w.agency_id
      LEFT JOIN campaigns c ON w.id = c.workspace_id
      LEFT JOIN resources r ON w.id = r.workspace_id
      LEFT JOIN publications p ON c.id = p.campaign_id
      WHERE a.id = ?
    `
    )

    const result = stmt.get(id) as any

    return {
      totalWorkspaces: result.total_workspaces || 0,
      totalCampaigns: result.total_campaigns || 0,
      totalResources: result.total_resources || 0,
      totalPublications: result.total_publications || 0,
    }
  }

  /**
   * Get agencies by plan with usage metrics
   */
  public getAgenciesByPlan(plan: 'free' | 'pro' | 'enterprise'): Array<
    Agency & {
      workspaceCount: number
      campaignCount: number
    }
  > {
    const stmt = this.getStatement(
      'getAgenciesByPlan',
      `
      SELECT 
        a.*,
        COUNT(DISTINCT w.id) as workspace_count,
        COUNT(DISTINCT c.id) as campaign_count
      FROM agencies a
      LEFT JOIN workspaces w ON a.id = w.agency_id
      LEFT JOIN campaigns c ON w.id = c.workspace_id
      WHERE a.plan = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `
    )

    const rows = stmt.all(plan)

    return rows.map((row: any) => ({
      ...this.mapRowToEntity(row),
      workspaceCount: row.workspace_count || 0,
      campaignCount: row.campaign_count || 0,
    }))
  }

  /**
   * Delete agency with cascade validation
   */
  public delete(id: string): boolean {
    if (!this.exists(id)) {
      return false
    }

    return this.transaction(() => {
      // Check for active campaigns
      const activeCampaignsStmt = this.getStatement(
        'checkActiveCampaigns',
        `
        SELECT COUNT(*) as count FROM campaigns c
        JOIN workspaces w ON c.workspace_id = w.id
        WHERE w.agency_id = ? AND c.status = 'active'
      `
      )

      const activeCampaigns = activeCampaignsStmt.get(id) as { count: number }

      if (activeCampaigns.count > 0) {
        throw new Error('Cannot delete agency with active campaigns')
      }

      // Delete agency (cascade will handle related data)
      const deleteStmt = this.getStatement(
        'delete',
        'DELETE FROM agencies WHERE id = ?'
      )
      const result = deleteStmt.run(id)

      return result.changes > 0
    })
  }
}
