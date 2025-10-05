import { EnhancedBaseRepository } from './EnhancedBaseRepository'
import {
  Workspace,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  WorkspaceFilters,
} from '../types'
import { DatabaseValidations } from '../validations/DatabaseValidations'
import {
  ValidationError,
  AccessDeniedError,
  BusinessRuleError,
} from '../errors'

/**
 * Enhanced repository for managing workspaces with integrated validation and error handling
 */
export class EnhancedWorkspaceRepository extends EnhancedBaseRepository<
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
   * Validate data for creating a workspace
   */
  protected getCreateValidationErrors(data: CreateWorkspaceData): string[] {
    const errors: string[] = []

    // Required fields validation
    if (!data.agencyId?.trim()) {
      errors.push('Agency ID is required')
    }

    if (!data.name?.trim()) {
      errors.push('Workspace name is required')
    } else if (data.name.length > 100) {
      errors.push('Workspace name cannot exceed 100 characters')
    }

    // Validate branding if provided
    if (data.branding) {
      const brandingValidation = DatabaseValidations.validateBranding(
        data.branding
      )
      if (!brandingValidation.isValid) {
        errors.push(...brandingValidation.errors)
      }
    }

    // Check if agency exists
    if (data.agencyId) {
      const agencyExists = this.executeQuery(
        this.getStatement('checkAgency', 'SELECT 1 FROM agencies WHERE id = ?'),
        [data.agencyId],
        'checkAgency'
      )

      if (!agencyExists) {
        errors.push('Agency does not exist')
      }
    }

    // Check for duplicate workspace name within agency
    if (data.agencyId && data.name) {
      const duplicateExists = this.executeQuery(
        this.getStatement(
          'checkDuplicate',
          'SELECT 1 FROM workspaces WHERE agency_id = ? AND name = ?'
        ),
        [data.agencyId, data.name],
        'checkDuplicate'
      )

      if (duplicateExists) {
        errors.push('A workspace with this name already exists in the agency')
      }
    }

    return errors
  }

  /**
   * Validate data for updating a workspace
   */
  protected getUpdateValidationErrors(data: UpdateWorkspaceData): string[] {
    const errors: string[] = []

    // Name validation if provided
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        errors.push('Workspace name cannot be empty')
      } else if (data.name.length > 100) {
        errors.push('Workspace name cannot exceed 100 characters')
      }
    }

    // Validate branding if provided
    if (data.branding) {
      const brandingValidation = DatabaseValidations.validateBranding(
        data.branding
      )
      if (!brandingValidation.isValid) {
        errors.push(...brandingValidation.errors)
      }
    }

    return errors
  }

  /**
   * Validate workspace deletion
   */
  protected validateDeletion(id: string): void {
    const validation = DatabaseValidations.validateWorkspaceDeletion(id)

    if (!validation.canDelete) {
      throw new BusinessRuleError(
        `Cannot delete workspace: ${validation.errors.join(', ')}`,
        { workspaceId: id, errors: validation.errors }
      )
    }
  }

  /**
   * Find workspaces by agency with access validation
   */
  findByAgency(agencyId: string, currentUserAgencyId: string): Workspace[] {
    // Validate access - user can only see workspaces from their agency
    if (agencyId !== currentUserAgencyId) {
      throw new AccessDeniedError('workspaces', 'read', undefined, {
        requestedAgencyId: agencyId,
        userAgencyId: currentUserAgencyId,
      })
    }

    this.logger.debug('Finding workspaces by agency', { agencyId })

    const statement = this.getStatement(
      'findByAgency',
      'SELECT * FROM workspaces WHERE agency_id = ? ORDER BY name ASC'
    )

    const rows = this.executeQueryAll(statement, [agencyId], 'findByAgency')
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Update workspace with access validation
   */
  updateWithAccessValidation(
    id: string,
    data: UpdateWorkspaceData,
    userAgencyId: string
  ): Workspace {
    // Validate workspace access
    if (!DatabaseValidations.validateWorkspaceAccess(id, userAgencyId)) {
      throw new AccessDeniedError('workspace', 'update', undefined, {
        workspaceId: id,
        userAgencyId,
      })
    }

    // Check for name conflicts if name is being updated
    if (data.name) {
      const existingWorkspace = this.findByIdOrThrow(id)

      if (data.name !== existingWorkspace.name) {
        const duplicateExists = this.executeQuery(
          this.getStatement(
            'checkNameConflict',
            'SELECT 1 FROM workspaces WHERE agency_id = ? AND name = ? AND id != ?'
          ),
          [userAgencyId, data.name, id],
          'checkNameConflict'
        )

        if (duplicateExists) {
          throw new ValidationError(
            ['A workspace with this name already exists in the agency'],
            {
              workspaceId: id,
              name: data.name,
            }
          )
        }
      }
    }

    return this.update(id, data)
  }

  /**
   * Delete workspace with access validation
   */
  deleteWithAccessValidation(id: string, userAgencyId: string): boolean {
    // Validate workspace access
    if (!DatabaseValidations.validateWorkspaceAccess(id, userAgencyId)) {
      throw new AccessDeniedError('workspace', 'delete', undefined, {
        workspaceId: id,
        userAgencyId,
      })
    }

    return this.delete(id)
  }

  /**
   * Get workspace statistics
   */
  getWorkspaceStats(
    id: string,
    userAgencyId: string
  ): {
    campaignCount: number
    resourceCount: number
    templateCount: number
    socialAccountCount: number
  } {
    // Validate workspace access
    if (!DatabaseValidations.validateWorkspaceAccess(id, userAgencyId)) {
      throw new AccessDeniedError('workspace', 'read', undefined, {
        workspaceId: id,
        userAgencyId,
      })
    }

    this.logger.debug('Getting workspace statistics', { workspaceId: id })

    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM campaigns WHERE workspace_id = ?) as campaign_count,
        (SELECT COUNT(*) FROM resources WHERE workspace_id = ?) as resource_count,
        (SELECT COUNT(*) FROM templates WHERE workspace_id = ?) as template_count,
        (SELECT COUNT(*) FROM social_accounts WHERE workspace_id = ?) as social_account_count
    `

    const statement = this.getStatement('getStats', statsQuery)
    const result = this.executeQuery(statement, [id, id, id, id], 'getStats')

    return {
      campaignCount: result.campaign_count || 0,
      resourceCount: result.resource_count || 0,
      templateCount: result.template_count || 0,
      socialAccountCount: result.social_account_count || 0,
    }
  }

  /**
   * Search workspaces by name within agency
   */
  searchByName(
    agencyId: string,
    searchTerm: string,
    userAgencyId: string
  ): Workspace[] {
    // Validate access
    if (agencyId !== userAgencyId) {
      throw new AccessDeniedError('workspaces', 'search', undefined, {
        requestedAgencyId: agencyId,
        userAgencyId,
      })
    }

    if (!searchTerm?.trim()) {
      return this.findByAgency(agencyId, userAgencyId)
    }

    this.logger.debug('Searching workspaces by name', { agencyId, searchTerm })

    const statement = this.getStatement(
      'searchByName',
      'SELECT * FROM workspaces WHERE agency_id = ? AND name LIKE ? ORDER BY name ASC'
    )

    const rows = this.executeQueryAll(
      statement,
      [agencyId, `%${searchTerm}%`],
      'searchByName'
    )

    return rows.map(row => this.mapRowToEntity(row))
  }
}
