import { BaseRepository } from './BaseRepository'
import {
  Workspace,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  WorkspaceFilters,
} from '../types'

/**
 * Repository for managing workspaces with branding and agency validation
 */
export class WorkspaceRepository extends BaseRepository<
  Workspace,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  WorkspaceFilters
> {
  constructor() {
    super('workspaces')
  }

  /**
   * Convert database row to Workspace entity
   */
  protected mapRowToEntity(row: any): Workspace {
    return {
      id: row.id,
      agencyId: row.agency_id,
      name: row.name,
      branding: {
        primaryColor: row.branding_primary_color,
        secondaryColor: row.branding_secondary_color,
        logo: row.branding_logo,
        slogan: row.branding_slogan,
        description: row.branding_description,
        whatsapp: row.branding_whatsapp,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * Convert Workspace entity to database row
   */
  protected mapEntityToRow(
    data: CreateWorkspaceData | UpdateWorkspaceData
  ): any {
    const row: any = {}

    if ('agencyId' in data) row.agency_id = data.agencyId
    if ('name' in data) row.name = data.name

    if ('branding' in data && data.branding) {
      if (data.branding.primaryColor !== undefined) {
        row.branding_primary_color = data.branding.primaryColor
      }
      if (data.branding.secondaryColor !== undefined) {
        row.branding_secondary_color = data.branding.secondaryColor
      }
      if (data.branding.logo !== undefined) {
        row.branding_logo = data.branding.logo
      }
      if (data.branding.slogan !== undefined) {
        row.branding_slogan = data.branding.slogan
      }
      if (data.branding.description !== undefined) {
        row.branding_description = data.branding.description
      }
      if (data.branding.whatsapp !== undefined) {
        row.branding_whatsapp = data.branding.whatsapp
      }
    }

    return row
  }

  /**
   * Create new workspace
   */
  public create(data: CreateWorkspaceData): Workspace {
    const id = this.generateId()
    const now = new Date().toISOString()

    const row = this.mapEntityToRow(data)

    const stmt = this.getStatement(
      'create',
      `
      INSERT INTO workspaces (
        id, agency_id, name,
        branding_primary_color, branding_secondary_color, branding_logo,
        branding_slogan, branding_description, branding_whatsapp,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )

    stmt.run(
      id,
      row.agency_id,
      row.name,
      row.branding_primary_color || '#9333ea',
      row.branding_secondary_color || '#737373',
      row.branding_logo || null,
      row.branding_slogan || '',
      row.branding_description || '',
      row.branding_whatsapp || '',
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Update workspace by ID
   */
  public update(id: string, data: UpdateWorkspaceData): Workspace | null {
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
      UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?
    `
    )

    stmt.run(...params)
    return this.findById(id)
  }

  /**
   * Find workspaces by agency ID
   */
  public findByAgencyId(agencyId: string): Workspace[] {
    const stmt = this.getStatement(
      'findByAgencyId',
      `
      SELECT * FROM workspaces WHERE agency_id = ? ORDER BY created_at DESC
    `
    )
    const rows = stmt.all(agencyId)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find workspace by name within agency
   */
  public findByAgencyAndName(agencyId: string, name: string): Workspace | null {
    const stmt = this.getStatement(
      'findByAgencyAndName',
      `
      SELECT * FROM workspaces WHERE agency_id = ? AND name = ?
    `
    )
    const row = stmt.get(agencyId, name)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Validate workspace belongs to agency
   */
  public validateAgencyOwnership(
    workspaceId: string,
    agencyId: string
  ): boolean {
    const stmt = this.getStatement(
      'validateAgencyOwnership',
      `
      SELECT 1 FROM workspaces WHERE id = ? AND agency_id = ? LIMIT 1
    `
    )

    return !!stmt.get(workspaceId, agencyId)
  }

  /**
   * Update workspace branding
   */
  public updateBranding(
    id: string,
    branding: Partial<Workspace['branding']>
  ): Workspace | null {
    if (!this.exists(id)) {
      return null
    }

    const updates: string[] = []
    const params: any[] = []

    if (branding.primaryColor !== undefined) {
      updates.push('branding_primary_color = ?')
      params.push(branding.primaryColor)
    }

    if (branding.secondaryColor !== undefined) {
      updates.push('branding_secondary_color = ?')
      params.push(branding.secondaryColor)
    }

    if (branding.logo !== undefined) {
      updates.push('branding_logo = ?')
      params.push(branding.logo)
    }

    if (branding.slogan !== undefined) {
      updates.push('branding_slogan = ?')
      params.push(branding.slogan)
    }

    if (branding.description !== undefined) {
      updates.push('branding_description = ?')
      params.push(branding.description)
    }

    if (branding.whatsapp !== undefined) {
      updates.push('branding_whatsapp = ?')
      params.push(branding.whatsapp)
    }

    if (updates.length === 0) {
      return this.findById(id)
    }

    updates.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    const stmt = this.getStatement(
      `updateBranding_${updates.length}`,
      `
      UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?
    `
    )

    stmt.run(...params)
    return this.findById(id)
  }

  /**
   * Get workspace statistics
   */
  public getStatistics(id: string): {
    totalCampaigns: number
    activeCampaigns: number
    totalResources: number
    totalTemplates: number
    totalPublications: number
    connectedAccounts: number
  } | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'getStatistics',
      `
      SELECT 
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_campaigns,
        COUNT(DISTINCT r.id) as total_resources,
        COUNT(DISTINCT t.id) as total_templates,
        COUNT(DISTINCT p.id) as total_publications,
        COUNT(DISTINCT CASE WHEN sa.is_connected = 1 THEN sa.id END) as connected_accounts
      FROM workspaces w
      LEFT JOIN campaigns c ON w.id = c.workspace_id
      LEFT JOIN resources r ON w.id = r.workspace_id
      LEFT JOIN templates t ON w.id = t.workspace_id
      LEFT JOIN publications p ON c.id = p.campaign_id
      LEFT JOIN social_accounts sa ON w.id = sa.workspace_id
      WHERE w.id = ?
    `
    )

    const result = stmt.get(id) as any

    return {
      totalCampaigns: result.total_campaigns || 0,
      activeCampaigns: result.active_campaigns || 0,
      totalResources: result.total_resources || 0,
      totalTemplates: result.total_templates || 0,
      totalPublications: result.total_publications || 0,
      connectedAccounts: result.connected_accounts || 0,
    }
  }

  /**
   * Get workspaces with campaign counts for agency
   */
  public getWorkspacesWithCampaignCounts(agencyId: string): Array<
    Workspace & {
      campaignCount: number
      activeCampaignCount: number
    }
  > {
    const stmt = this.getStatement(
      'getWorkspacesWithCampaignCounts',
      `
      SELECT 
        w.*,
        COUNT(DISTINCT c.id) as campaign_count,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_campaign_count
      FROM workspaces w
      LEFT JOIN campaigns c ON w.id = c.workspace_id
      WHERE w.agency_id = ?
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `
    )

    const rows = stmt.all(agencyId)

    return rows.map((row: any) => ({
      ...this.mapRowToEntity(row),
      campaignCount: row.campaign_count || 0,
      activeCampaignCount: row.active_campaign_count || 0,
    }))
  }

  /**
   * Check if workspace name is available within agency
   */
  public isNameAvailable(
    agencyId: string,
    name: string,
    excludeWorkspaceId?: string
  ): boolean {
    let stmt
    let params: any[]

    if (excludeWorkspaceId) {
      stmt = this.getStatement(
        'isNameAvailableExclude',
        `
        SELECT 1 FROM workspaces 
        WHERE agency_id = ? AND name = ? AND id != ? 
        LIMIT 1
      `
      )
      params = [agencyId, name, excludeWorkspaceId]
    } else {
      stmt = this.getStatement(
        'isNameAvailable',
        `
        SELECT 1 FROM workspaces 
        WHERE agency_id = ? AND name = ? 
        LIMIT 1
      `
      )
      params = [agencyId, name]
    }

    return !stmt.get(...params)
  }

  /**
   * Get workspace with agency information
   */
  public findByIdWithAgency(
    id: string
  ): (Workspace & { agency: { name: string; plan: string } }) | null {
    const stmt = this.getStatement(
      'findByIdWithAgency',
      `
      SELECT 
        w.*,
        a.name as agency_name,
        a.plan as agency_plan
      FROM workspaces w
      JOIN agencies a ON w.agency_id = a.id
      WHERE w.id = ?
    `
    )

    const row = stmt.get(id) as any
    if (!row) return null

    const workspace = this.mapRowToEntity(row)
    return {
      ...workspace,
      agency: {
        name: row.agency_name,
        plan: row.agency_plan,
      },
    }
  }

  /**
   * Delete workspace with dependency validation
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
        SELECT COUNT(*) as count FROM campaigns 
        WHERE workspace_id = ? AND status = 'active'
      `
      )

      const activeCampaigns = activeCampaignsStmt.get(id) as { count: number }

      if (activeCampaigns.count > 0) {
        throw new Error('Cannot delete workspace with active campaigns')
      }

      // Check for scheduled publications
      const scheduledPublicationsStmt = this.getStatement(
        'checkScheduledPublications',
        `
        SELECT COUNT(*) as count FROM publications p
        JOIN campaigns c ON p.campaign_id = c.id
        WHERE c.workspace_id = ? AND p.status = 'scheduled'
      `
      )

      const scheduledPublications = scheduledPublicationsStmt.get(id) as {
        count: number
      }

      if (scheduledPublications.count > 0) {
        throw new Error('Cannot delete workspace with scheduled publications')
      }

      // Delete workspace (cascade will handle related data)
      const deleteStmt = this.getStatement(
        'delete',
        'DELETE FROM workspaces WHERE id = ?'
      )
      const result = deleteStmt.run(id)

      return result.changes > 0
    })
  }

  /**
   * Count workspaces by agency
   */
  public countByAgency(agencyId: string): number {
    const stmt = this.getStatement(
      'countByAgency',
      `
      SELECT COUNT(*) as count FROM workspaces WHERE agency_id = ?
    `
    )

    const result = stmt.get(agencyId) as { count: number }
    return result.count
  }
}
