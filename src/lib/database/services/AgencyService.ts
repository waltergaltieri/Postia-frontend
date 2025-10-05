import { AgencyRepository } from '../repositories/AgencyRepository'
import { UserRepository } from '../repositories/UserRepository'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import { CampaignRepository } from '../repositories/CampaignRepository'
import { ResourceRepository } from '../repositories/ResourceRepository'
import { PublicationRepository } from '../repositories/PublicationRepository'
import {
  Agency,
  CreateAgencyData,
  UpdateAgencyData,
  CreateUserData,
  User,
} from '../types'

/**
 * Business service for agency management with complex validations and orchestration
 */
export class AgencyService {
  private agencyRepo: AgencyRepository
  private userRepo: UserRepository
  private workspaceRepo: WorkspaceRepository
  private campaignRepo: CampaignRepository
  private resourceRepo: ResourceRepository
  private publicationRepo: PublicationRepository

  constructor() {
    this.agencyRepo = new AgencyRepository()
    this.userRepo = new UserRepository()
    this.workspaceRepo = new WorkspaceRepository()
    this.campaignRepo = new CampaignRepository()
    this.resourceRepo = new ResourceRepository()
    this.publicationRepo = new PublicationRepository()
  }

  /**
   * Register a new agency with admin user
   */
  public registerAgency(
    agencyData: CreateAgencyData,
    adminUserData: Omit<CreateUserData, 'agencyId' | 'role'>
  ): { agency: Agency; adminUser: User } {
    // Use database transaction through repository
    const agency = this.agencyRepo.create(agencyData)

    // Validate email uniqueness
    const existingUser = this.userRepo.findByEmail(adminUserData.email)
    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Create admin user
    const adminUser = this.userRepo.create({
      ...adminUserData,
      agencyId: agency.id,
      role: 'admin',
    })

    return { agency, adminUser }
    // Validate email uniqueness
    const existingAgency = this.agencyRepo.findByEmail(agencyData.email)
    if (existingAgency) {
      throw new Error('Agency with this email already exists')
    }
  }

  /**
   * Update agency configuration with validation
   */
  public updateAgencyConfiguration(
    agencyId: string,
    updates: UpdateAgencyData
  ): Agency {
    const agency = this.agencyRepo.findById(agencyId)
    if (!agency) {
      throw new Error('Agency not found')
    }

    // Validate email uniqueness if changing email
    if (updates.email && updates.email !== agency.email) {
      const existingAgency = this.agencyRepo.findByEmail(updates.email)
      if (existingAgency) {
        throw new Error('Agency with this email already exists')
      }
    }

    // Validate plan upgrade/downgrade
    if (updates.plan && updates.plan !== agency.plan) {
      this.validatePlanChange(agency, updates.plan)
    }

    const updatedAgency = this.agencyRepo.update(agencyId, updates)
    if (!updatedAgency) {
      throw new Error('Failed to update agency')
    }

    return updatedAgency
  }

  /**
   * Manage agency credits with validation
   */
  public manageCredits(
    agencyId: string,
    operation: 'add' | 'subtract' | 'set',
    amount: number,
    reason?: string
  ): Agency {
    if (amount < 0) {
      throw new Error('Credit amount must be positive')
    }

    const agency = this.agencyRepo.findById(agencyId)
    if (!agency) {
      throw new Error('Agency not found')
    }

    let updatedAgency: Agency | null = null

    switch (operation) {
      case 'add':
        updatedAgency = this.agencyRepo.addCredits(agencyId, amount)
        break
      case 'subtract':
        if (agency.credits < amount) {
          throw new Error('Insufficient credits')
        }
        updatedAgency = this.agencyRepo.subtractCredits(agencyId, amount)
        break
      case 'set':
        updatedAgency = this.agencyRepo.updateCredits(agencyId, amount)
        break
    }

    if (!updatedAgency) {
      throw new Error('Failed to update credits')
    }

    // TODO: Log credit transaction for audit trail
    // this.logCreditTransaction(agencyId, operation, amount, reason);

    return updatedAgency
  }

  /**
   * Update agency subscription plan with validation
   */
  public updateSubscriptionPlan(
    agencyId: string,
    newPlan: 'free' | 'pro' | 'enterprise'
  ): Agency {
    const agency = this.agencyRepo.findById(agencyId)
    if (!agency) {
      throw new Error('Agency not found')
    }

    if (agency.plan === newPlan) {
      return agency // No change needed
    }

    this.validatePlanChange(agency, newPlan)

    const updatedAgency = this.agencyRepo.updatePlan(agencyId, newPlan)
    if (!updatedAgency) {
      throw new Error('Failed to update subscription plan')
    }

    // Apply plan-specific credit adjustments
    this.applyPlanCredits(updatedAgency, newPlan)

    return this.agencyRepo.findById(agencyId)!
  }

  /**
   * Get comprehensive agency metrics
   */
  public getAgencyMetrics(agencyId: string): {
    agency: Agency
    statistics: {
      totalWorkspaces: number
      totalCampaigns: number
      totalResources: number
      totalPublications: number
      activeCampaigns: number
      scheduledPublications: number
      publishedThisMonth: number
    }
    usage: {
      creditsUsed: number
      storageUsed: number
      planLimits: {
        maxWorkspaces: number
        maxCampaigns: number
        maxResources: number
      }
    }
  } {
    const agency = this.agencyRepo.findById(agencyId)
    if (!agency) {
      throw new Error('Agency not found')
    }

    const basicStats = this.agencyRepo.getStatistics(agencyId)
    if (!basicStats) {
      throw new Error('Failed to get agency statistics')
    }

    // Get additional metrics
    const activeCampaigns = this.campaignRepo
      .findAll({ status: 'active' } as any, { limit: 1000 })
      .filter((campaign: any) => {
        const workspace = this.workspaceRepo.findById(campaign.workspaceId)
        return workspace?.agencyId === agencyId
      }).length

    const scheduledPublications = this.getScheduledPublicationsCount(agencyId)
    const publishedThisMonth = this.getPublishedThisMonthCount(agencyId)
    const storageUsed = this.calculateStorageUsage(agencyId)
    const planLimits = this.getPlanLimits(agency.plan)

    return {
      agency,
      statistics: {
        ...basicStats,
        activeCampaigns,
        scheduledPublications,
        publishedThisMonth,
      },
      usage: {
        creditsUsed: this.calculateCreditsUsed(agencyId),
        storageUsed,
        planLimits,
      },
    }
  }

  /**
   * Delete agency with comprehensive validation
   */
  public deleteAgency(agencyId: string): boolean {
    const agency = this.agencyRepo.findById(agencyId)
    if (!agency) {
      throw new Error('Agency not found')
    }

    // Check for active campaigns
    const workspaces = this.workspaceRepo.findAll({ agencyId } as any, {
      limit: 1000,
    })

    for (const workspace of workspaces) {
      const activeCampaigns = this.campaignRepo.findAll(
        { workspaceId: workspace.id, status: 'active' } as any,
        { limit: 1 }
      )

      if (activeCampaigns.length > 0) {
        throw new Error('Cannot delete agency with active campaigns')
      }
    }

    // Check for scheduled publications
    const scheduledCount = this.getScheduledPublicationsCount(agencyId)
    if (scheduledCount > 0) {
      throw new Error('Cannot delete agency with scheduled publications')
    }

    return this.agencyRepo.delete(agencyId)
  }

  /**
   * Get agencies by plan with enhanced metrics
   */
  public getAgenciesByPlan(plan: 'free' | 'pro' | 'enterprise'): Array<
    Agency & {
      workspaceCount: number
      campaignCount: number
      activeCampaignCount: number
      lastActivity: Date | null
    }
  > {
    const agencies = this.agencyRepo.getAgenciesByPlan(plan)

    return agencies.map(agency => {
      const activeCampaigns = this.campaignRepo
        .findAll({ status: 'active' } as any, { limit: 1000 })
        .filter((campaign: any) => {
          const workspace = this.workspaceRepo.findById(campaign.workspaceId)
          return workspace?.agencyId === agency.id
        })

      const lastActivity = this.getLastActivityDate(agency.id)

      return {
        ...agency,
        activeCampaignCount: activeCampaigns.length,
        lastActivity,
      }
    })
  }

  // Private helper methods

  private validatePlanChange(
    agency: Agency,
    newPlan: 'free' | 'pro' | 'enterprise'
  ): void {
    const currentLimits = this.getPlanLimits(agency.plan)
    const newLimits = this.getPlanLimits(newPlan)

    // Check if downgrading would exceed new limits
    if (newLimits.maxWorkspaces < currentLimits.maxWorkspaces) {
      const workspaceCount = this.workspaceRepo.findAll(
        { agencyId: agency.id } as any,
        { limit: 1000 }
      ).length

      if (workspaceCount > newLimits.maxWorkspaces) {
        throw new Error(
          `Cannot downgrade: Agency has ${workspaceCount} workspaces, but ${newPlan} plan allows only ${newLimits.maxWorkspaces}`
        )
      }
    }
  }

  private applyPlanCredits(
    agency: Agency,
    newPlan: 'free' | 'pro' | 'enterprise'
  ): void {
    const planCredits = {
      free: 10,
      pro: 100,
      enterprise: 1000,
    }

    // Add bonus credits for plan upgrade
    if (newPlan !== 'free') {
      this.agencyRepo.addCredits(agency.id, planCredits[newPlan])
    }
  }

  private getPlanLimits(plan: 'free' | 'pro' | 'enterprise'): {
    maxWorkspaces: number
    maxCampaigns: number
    maxResources: number
  } {
    const limits = {
      free: { maxWorkspaces: 1, maxCampaigns: 3, maxResources: 50 },
      pro: { maxWorkspaces: 5, maxCampaigns: 20, maxResources: 500 },
      enterprise: { maxWorkspaces: 50, maxCampaigns: 200, maxResources: 5000 },
    }

    return limits[plan]
  }

  private getScheduledPublicationsCount(agencyId: string): number {
    const workspaces = this.workspaceRepo.findAll({ agencyId } as any, {
      limit: 1000,
    })

    let count = 0
    for (const workspace of workspaces) {
      const campaigns = this.campaignRepo.findAll(
        { workspaceId: workspace.id } as any,
        { limit: 1000 }
      )

      for (const campaign of campaigns) {
        const scheduled = this.publicationRepo.findAll(
          { campaignId: campaign.id, status: 'scheduled' } as any,
          { limit: 1000 }
        )
        count += scheduled.length
      }
    }

    return count
  }

  private getPublishedThisMonthCount(agencyId: string): number {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const workspaces = this.workspaceRepo.findAll({ agencyId } as any, {
      limit: 1000,
    })

    let count = 0
    for (const workspace of workspaces) {
      const campaigns = this.campaignRepo.findAll(
        { workspaceId: workspace.id } as any,
        { limit: 1000 }
      )

      for (const campaign of campaigns) {
        const published = this.publicationRepo
          .findAll(
            {
              campaignId: campaign.id,
              status: 'published',
            } as any,
            { limit: 1000 }
          )
          .filter(
            (pub: any) => pub.publishedAt && pub.publishedAt >= startOfMonth
          )

        count += published.length
      }
    }

    return count
  }

  private calculateStorageUsage(agencyId: string): number {
    const workspaces = this.workspaceRepo.findAll({ agencyId } as any, {
      limit: 1000,
    })

    let totalBytes = 0
    for (const workspace of workspaces) {
      const resources = this.resourceRepo.findAll(
        { workspaceId: workspace.id } as any,
        { limit: 1000 }
      )

      totalBytes += resources.reduce(
        (sum: number, resource: any) => sum + resource.sizeBytes,
        0
      )
    }

    return Math.round(totalBytes / (1024 * 1024)) // Convert to MB
  }

  private calculateCreditsUsed(agencyId: string): number {
    // This would typically track credit usage from a separate audit table
    // For now, we'll estimate based on publications
    const publishedCount = this.getPublishedThisMonthCount(agencyId)
    return publishedCount // Assuming 1 credit per publication
  }

  private getLastActivityDate(agencyId: string): Date | null {
    const workspaces = this.workspaceRepo.findAll({ agencyId } as any, {
      limit: 1000,
    })

    let lastActivity: Date | null = null

    for (const workspace of workspaces) {
      const campaigns = this.campaignRepo.findAll(
        { workspaceId: workspace.id } as any,
        { limit: 1000 }
      )

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
    }

    return lastActivity
  }
}
