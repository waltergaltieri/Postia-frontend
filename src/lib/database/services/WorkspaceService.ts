import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import { AgencyRepository } from '../repositories/AgencyRepository'
import { CampaignRepository } from '../repositories/CampaignRepository'
import { ResourceRepository } from '../repositories/ResourceRepository'
import { TemplateRepository } from '../repositories/TemplateRepository'
import { SocialAccountRepository } from '../repositories/SocialAccountRepository'
import { PublicationRepository } from '../repositories/PublicationRepository'
import {
  Workspace,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  Agency,
} from '../types'

/**
 * Business service for workspace management with validation and branding
 */
export class WorkspaceService {
  private workspaceRepo: WorkspaceRepository
  private agencyRepo: AgencyRepository
  private campaignRepo: CampaignRepository
  private resourceRepo: ResourceRepository
  private templateRepo: TemplateRepository
  private socialAccountRepo: SocialAccountRepository
  private publicationRepo: PublicationRepository

  constructor() {
    this.workspaceRepo = new WorkspaceRepository()
    this.agencyRepo = new AgencyRepository()
    this.campaignRepo = new CampaignRepository()
    this.resourceRepo = new ResourceRepository()
    this.templateRepo = new TemplateRepository()
    this.socialAccountRepo = new SocialAccountRepository()
    this.publicationRepo = new PublicationRepository()
  }

  /**
   * Create workspace with comprehensive validation
   */
  public createWorkspace(
    workspaceData: CreateWorkspaceData,
    userId: string
  ): Workspace {
    // Validate agency exists and user has access
    const agency = this.agencyRepo.findById(workspaceData.agencyId)
    if (!agency) {
      throw new Error('Agency not found')
    }

    // Validate workspace name uniqueness within agency
    if (
      !this.workspaceRepo.isNameAvailable(
        workspaceData.agencyId,
        workspaceData.name
      )
    ) {
      throw new Error('Workspace name already exists in this agency')
    }

    // Check agency plan limits
    this.validateAgencyLimits(agency)

    // Validate branding data
    this.validateBrandingData(workspaceData.branding)

    // Create workspace
    const workspace = this.workspaceRepo.create(workspaceData)

    return workspace
  }

  /**
   * Update workspace with validation
   */
  public updateWorkspace(
    workspaceId: string,
    updates: UpdateWorkspaceData,
    agencyId: string
  ): Workspace {
    // Validate workspace exists and belongs to agency
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('Workspace not found or access denied')
    }

    // Validate name uniqueness if changing name
    if (updates.name) {
      if (
        !this.workspaceRepo.isNameAvailable(agencyId, updates.name, workspaceId)
      ) {
        throw new Error('Workspace name already exists in this agency')
      }
    }

    // Validate branding data if updating branding
    if (updates.branding) {
      this.validateBrandingData(updates.branding)
    }

    const updatedWorkspace = this.workspaceRepo.update(workspaceId, updates)
    if (!updatedWorkspace) {
      throw new Error('Failed to update workspace')
    }

    return updatedWorkspace
  }

  /**
   * Update workspace branding with validation
   */
  public updateWorkspaceBranding(
    workspaceId: string,
    branding: Partial<Workspace['branding']>,
    agencyId: string
  ): Workspace {
    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('Workspace not found or access denied')
    }

    // Validate branding data
    this.validateBrandingData(branding)

    const updatedWorkspace = this.workspaceRepo.updateBranding(
      workspaceId,
      branding
    )
    if (!updatedWorkspace) {
      throw new Error('Failed to update workspace branding')
    }

    return updatedWorkspace
  }

  /**
   * Get workspace with comprehensive data
   */
  public getWorkspaceDetails(
    workspaceId: string,
    agencyId: string
  ): {
    workspace: Workspace & { agency: { name: string; plan: string } }
    statistics: {
      totalCampaigns: number
      activeCampaigns: number
      totalResources: number
      totalTemplates: number
      totalPublications: number
      connectedAccounts: number
    }
    recentActivity: {
      recentCampaigns: Array<{
        id: string
        name: string
        status: string
        updatedAt: Date
      }>
      recentPublications: Array<{
        id: string
        content: string
        socialNetwork: string
        scheduledDate: Date
      }>
    }
  } {
    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('Workspace not found or access denied')
    }

    const workspace = this.workspaceRepo.findByIdWithAgency(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const statistics = this.workspaceRepo.getStatistics(workspaceId)
    if (!statistics) {
      throw new Error('Failed to get workspace statistics')
    }

    // Get recent activity
    const recentCampaigns = this.campaignRepo
      .findAll({ workspaceId } as any, {
        limit: 5,
        orderBy: 'updated_at',
        orderDirection: 'DESC',
      })
      .map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        updatedAt: campaign.updatedAt,
      }))

    const recentPublications = this.getRecentPublications(workspaceId, 5)

    return {
      workspace,
      statistics,
      recentActivity: {
        recentCampaigns,
        recentPublications,
      },
    }
  }

  /**
   * Get workspaces for agency with enhanced data
   */
  public getAgencyWorkspaces(agencyId: string): Array<
    Workspace & {
      campaignCount: number
      activeCampaignCount: number
      resourceCount: number
      lastActivity: Date | null
    }
  > {
    const workspacesWithCampaigns =
      this.workspaceRepo.getWorkspacesWithCampaignCounts(agencyId)

    return workspacesWithCampaigns.map(workspace => {
      const resourceCount = this.resourceRepo.findAll(
        { workspaceId: workspace.id } as any,
        { limit: 1000 }
      ).length

      const lastActivity = this.getWorkspaceLastActivity(workspace.id)

      return {
        ...workspace,
        resourceCount,
        lastActivity,
      }
    })
  }

  /**
   * Delete workspace with comprehensive validation
   */
  public deleteWorkspace(workspaceId: string, agencyId: string): boolean {
    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('Workspace not found or access denied')
    }

    // Check for active campaigns
    const activeCampaigns = this.campaignRepo.findAll(
      { workspaceId, status: 'active' } as any,
      { limit: 1 }
    )

    if (activeCampaigns.length > 0) {
      throw new Error(
        'Cannot delete workspace with active campaigns. Please pause or complete all campaigns first.'
      )
    }

    // Check for scheduled publications
    const scheduledPublications = this.getScheduledPublications(workspaceId)
    if (scheduledPublications.length > 0) {
      throw new Error(
        'Cannot delete workspace with scheduled publications. Please cancel or reschedule all publications first.'
      )
    }

    // Check if this is the last workspace for the agency
    const workspaceCount = this.workspaceRepo.countByAgency(agencyId)
    if (workspaceCount <= 1) {
      throw new Error(
        'Cannot delete the last workspace. Each agency must have at least one workspace.'
      )
    }

    return this.workspaceRepo.delete(workspaceId)
  }

  /**
   * Validate workspace name availability
   */
  public validateWorkspaceName(
    agencyId: string,
    name: string,
    excludeWorkspaceId?: string
  ): { isAvailable: boolean; suggestion?: string } {
    const isAvailable = this.workspaceRepo.isNameAvailable(
      agencyId,
      name,
      excludeWorkspaceId
    )

    if (!isAvailable) {
      // Generate suggestion
      let counter = 1
      let suggestion = `${name} ${counter}`

      while (
        !this.workspaceRepo.isNameAvailable(
          agencyId,
          suggestion,
          excludeWorkspaceId
        )
      ) {
        counter++
        suggestion = `${name} ${counter}`

        // Prevent infinite loop
        if (counter > 100) {
          suggestion = `${name} ${Date.now()}`
          break
        }
      }

      return { isAvailable: false, suggestion }
    }

    return { isAvailable: true }
  }

  /**
   * Get workspace usage metrics
   */
  public getWorkspaceUsage(
    workspaceId: string,
    agencyId: string
  ): {
    storage: {
      used: number // in MB
      limit: number // in MB
      percentage: number
    }
    campaigns: {
      used: number
      limit: number
      percentage: number
    }
    resources: {
      used: number
      limit: number
      percentage: number
    }
  } {
    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('Workspace not found or access denied')
    }

    const agency = this.agencyRepo.findById(agencyId)
    if (!agency) {
      throw new Error('Agency not found')
    }

    const limits = this.getPlanLimits(agency.plan)

    // Calculate storage usage
    const resources = this.resourceRepo.findAll({ workspaceId } as any, {
      limit: 1000,
    })

    const storageUsed = Math.round(
      resources.reduce(
        (sum: number, resource: any) => sum + resource.sizeBytes,
        0
      ) /
        (1024 * 1024)
    )

    // Calculate campaign usage
    const campaignCount = this.campaignRepo.findAll({ workspaceId } as any, {
      limit: 1000,
    }).length

    // Calculate resource usage
    const resourceCount = resources.length

    return {
      storage: {
        used: storageUsed,
        limit: limits.maxStorageMB,
        percentage: Math.round((storageUsed / limits.maxStorageMB) * 100),
      },
      campaigns: {
        used: campaignCount,
        limit: limits.maxCampaigns,
        percentage: Math.round((campaignCount / limits.maxCampaigns) * 100),
      },
      resources: {
        used: resourceCount,
        limit: limits.maxResources,
        percentage: Math.round((resourceCount / limits.maxResources) * 100),
      },
    }
  }

  // Private helper methods

  private validateAgencyLimits(agency: Agency): void {
    const workspaceCount = this.workspaceRepo.countByAgency(agency.id)
    const limits = this.getPlanLimits(agency.plan)

    if (workspaceCount >= limits.maxWorkspaces) {
      throw new Error(
        `Agency has reached the maximum number of workspaces (${limits.maxWorkspaces}) for the ${agency.plan} plan`
      )
    }
  }

  private validateBrandingData(branding: Partial<Workspace['branding']>): void {
    if (branding.primaryColor && !this.isValidHexColor(branding.primaryColor)) {
      throw new Error(
        'Invalid primary color format. Please use hex format (#RRGGBB)'
      )
    }

    if (
      branding.secondaryColor &&
      !this.isValidHexColor(branding.secondaryColor)
    ) {
      throw new Error(
        'Invalid secondary color format. Please use hex format (#RRGGBB)'
      )
    }

    if (branding.logo && !this.isValidUrl(branding.logo)) {
      throw new Error('Invalid logo URL format')
    }

    if (
      branding.whatsapp &&
      branding.whatsapp.length > 0 &&
      !this.isValidPhoneNumber(branding.whatsapp)
    ) {
      throw new Error('Invalid WhatsApp number format')
    }

    if (branding.slogan && branding.slogan.length > 100) {
      throw new Error('Slogan must be 100 characters or less')
    }

    if (branding.description && branding.description.length > 500) {
      throw new Error('Description must be 500 characters or less')
    }
  }

  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color)
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation (digits, spaces, +, -, (), allowed)
    return (
      /^[\d\s\+\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10
    )
  }

  private getPlanLimits(plan: 'free' | 'pro' | 'enterprise'): {
    maxWorkspaces: number
    maxCampaigns: number
    maxResources: number
    maxStorageMB: number
  } {
    const limits = {
      free: {
        maxWorkspaces: 1,
        maxCampaigns: 3,
        maxResources: 50,
        maxStorageMB: 100,
      },
      pro: {
        maxWorkspaces: 5,
        maxCampaigns: 20,
        maxResources: 500,
        maxStorageMB: 1000,
      },
      enterprise: {
        maxWorkspaces: 50,
        maxCampaigns: 200,
        maxResources: 5000,
        maxStorageMB: 10000,
      },
    }

    return limits[plan]
  }

  private getRecentPublications(
    workspaceId: string,
    limit: number
  ): Array<{
    id: string
    content: string
    socialNetwork: string
    scheduledDate: Date
  }> {
    const campaigns = this.campaignRepo.findAll({ workspaceId } as any, {
      limit: 1000,
    })

    const publications: Array<{
      id: string
      content: string
      socialNetwork: string
      scheduledDate: Date
    }> = []

    for (const campaign of campaigns) {
      const campaignPublications = this.publicationRepo.findAll(
        { campaignId: campaign.id } as any,
        { limit: 1000 }
      )

      publications.push(
        ...campaignPublications.map((pub: any) => ({
          id: pub.id,
          content:
            pub.content.substring(0, 100) +
            (pub.content.length > 100 ? '...' : ''),
          socialNetwork: pub.socialNetwork,
          scheduledDate: pub.scheduledDate,
        }))
      )
    }

    // Sort by scheduled date and return limited results
    return publications
      .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime())
      .slice(0, limit)
  }

  private getScheduledPublications(
    workspaceId: string
  ): Array<{ id: string; scheduledDate: Date }> {
    const campaigns = this.campaignRepo.findAll({ workspaceId } as any, {
      limit: 1000,
    })

    const scheduledPublications: Array<{ id: string; scheduledDate: Date }> = []

    for (const campaign of campaigns) {
      const publications = this.publicationRepo.findAll(
        { campaignId: campaign.id, status: 'scheduled' } as any,
        { limit: 1000 }
      )

      scheduledPublications.push(
        ...publications.map((pub: any) => ({
          id: pub.id,
          scheduledDate: pub.scheduledDate,
        }))
      )
    }

    return scheduledPublications
  }

  private getWorkspaceLastActivity(workspaceId: string): Date | null {
    const campaigns = this.campaignRepo.findAll({ workspaceId } as any, {
      limit: 1000,
    })

    let lastActivity: Date | null = null

    for (const campaign of campaigns) {
      if (!lastActivity || campaign.updatedAt > lastActivity) {
        lastActivity = campaign.updatedAt
      }

      const publications = this.publicationRepo.findAll(
        { campaignId: campaign.id } as any,
        { limit: 1000 }
      )

      for (const publication of publications) {
        if (
          publication.publishedAt &&
          (!lastActivity || publication.publishedAt > lastActivity)
        ) {
          lastActivity = publication.publishedAt
        }
      }
    }

    return lastActivity
  }
}
