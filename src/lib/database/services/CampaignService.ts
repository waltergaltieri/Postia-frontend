import { CampaignRepository } from '../repositories/CampaignRepository'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import { ResourceRepository } from '../repositories/ResourceRepository'
import { TemplateRepository } from '../repositories/TemplateRepository'
import { PublicationRepository } from '../repositories/PublicationRepository'
import { SocialAccountRepository } from '../repositories/SocialAccountRepository'
import {
  Campaign,
  CreateCampaignData,
  UpdateCampaignData,
  CreatePublicationData,
  SocialNetwork,
  OptimizationSettings,
} from '../types'

/**
 * Business service for campaign management with complex validation and publication generation
 */
export class CampaignService {
  private campaignRepo: CampaignRepository
  private workspaceRepo: WorkspaceRepository
  private resourceRepo: ResourceRepository
  private templateRepo: TemplateRepository
  private publicationRepo: PublicationRepository
  private socialAccountRepo: SocialAccountRepository

  constructor() {
    this.campaignRepo = new CampaignRepository()
    this.workspaceRepo = new WorkspaceRepository()
    this.resourceRepo = new ResourceRepository()
    this.templateRepo = new TemplateRepository()
    this.publicationRepo = new PublicationRepository()
    this.socialAccountRepo = new SocialAccountRepository()
  }

  /**
   * Create campaign with comprehensive validation and resource/template association
   */
  public createCampaign(
    campaignData: CreateCampaignData,
    resourceIds: string[],
    templateIds: string[],
    agencyId: string
  ): Campaign {
    // Validate workspace access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        campaignData.workspaceId,
        agencyId
      )
    ) {
      throw new Error('Workspace not found or access denied')
    }

    // Validate campaign data
    this.validateCampaignData(campaignData)

    // Validate resources belong to workspace
    this.validateResourceAccess(resourceIds, campaignData.workspaceId)

    // Validate templates belong to workspace
    this.validateTemplateAccess(templateIds, campaignData.workspaceId)

    // Validate social network connections
    this.validateSocialNetworkConnections(
      campaignData.socialNetworks,
      campaignData.workspaceId
    )

    // Check workspace campaign limits
    this.validateCampaignLimits(campaignData.workspaceId, agencyId)

    // Create campaign with relations
    const campaign = this.campaignRepo.createWithRelations(
      campaignData,
      resourceIds,
      templateIds
    )

    return campaign
  }

  /**
   * Update campaign with validation
   */
  public updateCampaign(
    campaignId: string,
    updates: UpdateCampaignData,
    agencyId: string
  ): Campaign {
    const campaign = this.campaignRepo.findById(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Validate workspace access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        campaign.workspaceId,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    // Validate status transitions
    if (updates.status && updates.status !== campaign.status) {
      this.validateStatusTransition(campaign.status, updates.status)
    }

    // Validate date changes for active campaigns
    if (
      campaign.status === 'active' &&
      (updates.startDate || updates.endDate)
    ) {
      this.validateActiveCampaignDateChanges(campaign, updates)
    }

    // Validate social network changes
    if (updates.socialNetworks) {
      this.validateSocialNetworkConnections(
        updates.socialNetworks,
        campaign.workspaceId
      )
    }

    const updatedCampaign = this.campaignRepo.update(campaignId, updates)
    if (!updatedCampaign) {
      throw new Error('Failed to update campaign')
    }

    return updatedCampaign
  }

  /**
   * Generate scheduled publications for campaign
   */
  public generatePublications(
    campaignId: string,
    agencyId: string
  ): Array<{ id: string; scheduledDate: Date; socialNetwork: SocialNetwork }> {
    const campaign = this.campaignRepo.findByIdWithRelations(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        campaign.workspaceId,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    // Validate campaign is ready for publication generation
    if (campaign.status !== 'draft') {
      throw new Error('Can only generate publications for draft campaigns')
    }

    if (campaign.resources.length === 0) {
      throw new Error('Campaign must have at least one resource')
    }

    if (campaign.templates.length === 0) {
      throw new Error('Campaign must have at least one template')
    }

    // Clear existing publications if any
    this.clearCampaignPublications(campaignId)

    // Generate publication schedule
    const schedule = this.generatePublicationSchedule(campaign)

    // Create publications
    const publications: Array<{
      id: string
      scheduledDate: Date
      socialNetwork: SocialNetwork
    }> = []

    for (const scheduleItem of schedule) {
      // Select resource and template (round-robin or random)
      const resource =
        campaign.resources[
          scheduleItem.resourceIndex % campaign.resources.length
        ]
      const template =
        campaign.templates[
          scheduleItem.templateIndex % campaign.templates.length
        ]

      // Generate content based on campaign settings
      const content = this.generatePublicationContent(
        campaign,
        scheduleItem.socialNetwork,
        scheduleItem.date
      )

      const publicationData: CreatePublicationData = {
        campaignId: campaign.id,
        templateId: template.id,
        resourceId: resource.id,
        socialNetwork: scheduleItem.socialNetwork,
        content,
        imageUrl: resource.url,
        scheduledDate: scheduleItem.date,
        status: 'scheduled',
      }

      const publication = this.publicationRepo.create(publicationData)
      publications.push({
        id: publication.id,
        scheduledDate: publication.scheduledDate,
        socialNetwork: publication.socialNetwork,
      })
    }

    return publications
  }

  /**
   * Activate campaign and start publication schedule
   */
  public activateCampaign(campaignId: string, agencyId: string): Campaign {
    const campaign = this.campaignRepo.findById(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        campaign.workspaceId,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    // Validate campaign can be activated
    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      throw new Error('Can only activate draft or paused campaigns')
    }

    // Check if campaign has publications
    const publications = this.publicationRepo.findAll(
      { campaignId: campaign.id } as any,
      { limit: 1 }
    )

    if (publications.length === 0) {
      throw new Error(
        'Campaign must have publications before activation. Generate publications first.'
      )
    }

    // Validate start date
    const now = new Date()
    if (campaign.startDate < now) {
      // Update start date to today if it's in the past
      this.campaignRepo.update(campaignId, { startDate: now })
    }

    // Activate campaign
    const activatedCampaign = this.campaignRepo.updateStatus(
      campaignId,
      'active'
    )
    if (!activatedCampaign) {
      throw new Error('Failed to activate campaign')
    }

    return activatedCampaign
  }

  /**
   * Pause campaign and update publication statuses
   */
  public pauseCampaign(campaignId: string, agencyId: string): Campaign {
    const campaign = this.campaignRepo.findById(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        campaign.workspaceId,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    if (campaign.status !== 'active') {
      throw new Error('Can only pause active campaigns')
    }

    // Pause campaign
    const pausedCampaign = this.campaignRepo.updateStatus(campaignId, 'paused')
    if (!pausedCampaign) {
      throw new Error('Failed to pause campaign')
    }

    return pausedCampaign
  }

  /**
   * Complete campaign and finalize all publications
   */
  public completeCampaign(campaignId: string, agencyId: string): Campaign {
    const campaign = this.campaignRepo.findById(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        campaign.workspaceId,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    if (campaign.status !== 'active' && campaign.status !== 'paused') {
      throw new Error('Can only complete active or paused campaigns')
    }

    // Cancel remaining scheduled publications
    const scheduledPublications = this.publicationRepo.findAll(
      { campaignId: campaign.id, status: 'scheduled' } as any,
      { limit: 1000 }
    )

    for (const publication of scheduledPublications) {
      this.publicationRepo.update(publication.id, { status: 'cancelled' })
    }

    // Complete campaign
    const completedCampaign = this.campaignRepo.updateStatus(
      campaignId,
      'completed'
    )
    if (!completedCampaign) {
      throw new Error('Failed to complete campaign')
    }

    return completedCampaign
  }

  /**
   * Get campaign with comprehensive details
   */
  public getCampaignDetails(
    campaignId: string,
    agencyId: string
  ): {
    campaign: Campaign & {
      resources: Array<{ id: string; name: string; url: string; type: string }>
      templates: Array<{ id: string; name: string; type: string }>
    }
    statistics: {
      totalPublications: number
      scheduledPublications: number
      publishedPublications: number
      failedPublications: number
      resourceCount: number
      templateCount: number
    }
    schedule: {
      nextPublication: Date | null
      publicationsThisWeek: number
      estimatedCompletion: Date | null
    }
  } {
    const campaign = this.campaignRepo.findByIdWithRelations(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        campaign.workspaceId,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    const statistics = this.campaignRepo.getStatistics(campaignId)
    if (!statistics) {
      throw new Error('Failed to get campaign statistics')
    }

    // Calculate schedule information
    const schedule = this.calculateCampaignSchedule(campaignId)

    return {
      campaign,
      statistics,
      schedule,
    }
  }

  /**
   * Update campaign optimization settings
   */
  public updateOptimizationSettings(
    campaignId: string,
    settings: OptimizationSettings,
    agencyId: string
  ): Campaign {
    const campaign = this.campaignRepo.findById(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Validate access
    if (
      !this.workspaceRepo.validateAgencyOwnership(
        campaign.workspaceId,
        agencyId
      )
    ) {
      throw new Error('Access denied')
    }

    // Validate settings for each social network
    for (const [network, networkSettings] of Object.entries(settings)) {
      if (!campaign.socialNetworks.includes(network as SocialNetwork)) {
        throw new Error(`Campaign is not configured for ${network}`)
      }

      if (networkSettings && typeof networkSettings.tone !== 'string') {
        throw new Error(`Invalid tone setting for ${network}`)
      }

      if (networkSettings && typeof networkSettings.hashtags !== 'boolean') {
        throw new Error(`Invalid hashtags setting for ${network}`)
      }
    }

    const updatedCampaign = this.campaignRepo.updateOptimizationSettings(
      campaignId,
      settings
    )
    if (!updatedCampaign) {
      throw new Error('Failed to update optimization settings')
    }

    return updatedCampaign
  }

  /**
   * Get campaigns for workspace with filtering
   */
  public getWorkspaceCampaigns(
    workspaceId: string,
    agencyId: string,
    filters?: {
      status?: Campaign['status']
      startDate?: Date
      endDate?: Date
      searchTerm?: string
    }
  ): Array<
    Campaign & { publicationCount: number; nextPublication: Date | null }
  > {
    // Validate access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('Workspace not found or access denied')
    }

    let campaigns: Campaign[] = []

    if (filters?.status) {
      campaigns = this.campaignRepo.findByStatus(workspaceId, filters.status)
    } else if (filters?.startDate && filters?.endDate) {
      campaigns = this.campaignRepo.findByDateRange(
        workspaceId,
        filters.startDate,
        filters.endDate
      )
    } else if (filters?.searchTerm) {
      campaigns = this.campaignRepo.searchByName(
        workspaceId,
        filters.searchTerm
      )
    } else {
      campaigns = this.campaignRepo.findByWorkspaceId(workspaceId)
    }

    // Enhance with additional data
    return campaigns.map(campaign => {
      const publications = this.publicationRepo.findAll(
        { campaignId: campaign.id } as any,
        { limit: 1000 }
      )

      const nextPublication =
        publications
          .filter(
            (pub: any) =>
              pub.status === 'scheduled' && pub.scheduledDate > new Date()
          )
          .sort(
            (a: any, b: any) =>
              a.scheduledDate.getTime() - b.scheduledDate.getTime()
          )[0]?.scheduledDate || null

      return {
        ...campaign,
        publicationCount: publications.length,
        nextPublication,
      }
    })
  }

  // Private helper methods

  private validateCampaignData(data: CreateCampaignData): void {
    if (data.startDate >= data.endDate) {
      throw new Error('End date must be after start date')
    }

    if (data.startDate < new Date()) {
      throw new Error('Start date cannot be in the past')
    }

    if (data.intervalHours < 1 || data.intervalHours > 168) {
      // 1 hour to 1 week
      throw new Error('Interval must be between 1 and 168 hours')
    }

    if (data.socialNetworks.length === 0) {
      throw new Error('Campaign must target at least one social network')
    }

    if (!data.prompt || data.prompt.trim().length < 10) {
      throw new Error('Campaign prompt must be at least 10 characters long')
    }
  }

  private validateResourceAccess(
    resourceIds: string[],
    workspaceId: string
  ): void {
    for (const resourceId of resourceIds) {
      const resource = this.resourceRepo.findById(resourceId)
      if (!resource || resource.workspaceId !== workspaceId) {
        throw new Error(`Resource ${resourceId} not found or access denied`)
      }
    }
  }

  private validateTemplateAccess(
    templateIds: string[],
    workspaceId: string
  ): void {
    for (const templateId of templateIds) {
      const template = this.templateRepo.findById(templateId)
      if (!template || template.workspaceId !== workspaceId) {
        throw new Error(`Template ${templateId} not found or access denied`)
      }
    }
  }

  private validateSocialNetworkConnections(
    networks: SocialNetwork[],
    workspaceId: string
  ): void {
    for (const network of networks) {
      const accounts = this.socialAccountRepo.findAll(
        { workspaceId, platform: network, isConnected: true } as any,
        { limit: 1 }
      )

      if (accounts.length === 0) {
        throw new Error(
          `No connected ${network} account found. Please connect a ${network} account first.`
        )
      }
    }
  }

  private validateCampaignLimits(workspaceId: string, agencyId: string): void {
    // This would check against agency plan limits
    const campaignCount = this.campaignRepo.countByWorkspace(workspaceId)

    // Get agency plan limits (simplified for now)
    const maxCampaigns = 20 // This should come from agency plan

    if (campaignCount >= maxCampaigns) {
      throw new Error(
        `Workspace has reached the maximum number of campaigns (${maxCampaigns})`
      )
    }
  }

  private validateStatusTransition(
    currentStatus: Campaign['status'],
    newStatus: Campaign['status']
  ): void {
    const validTransitions: Record<Campaign['status'], Campaign['status'][]> = {
      draft: ['active', 'paused'],
      active: ['completed', 'paused'],
      paused: ['active', 'completed'],
      completed: [], // Cannot transition from completed
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      )
    }
  }

  private validateActiveCampaignDateChanges(
    campaign: Campaign,
    updates: UpdateCampaignData
  ): void {
    const now = new Date()

    if (updates.startDate && updates.startDate < now) {
      throw new Error('Cannot change start date to past for active campaign')
    }

    if (updates.endDate && updates.endDate <= now) {
      throw new Error(
        'Cannot change end date to past or present for active campaign'
      )
    }
  }

  private generatePublicationSchedule(campaign: any): Array<{
    date: Date
    socialNetwork: SocialNetwork
    resourceIndex: number
    templateIndex: number
  }> {
    const schedule: Array<{
      date: Date
      socialNetwork: SocialNetwork
      resourceIndex: number
      templateIndex: number
    }> = []

    const startDate = new Date(campaign.startDate)
    const endDate = new Date(campaign.endDate)
    const intervalMs = campaign.intervalHours * 60 * 60 * 1000

    let currentDate = new Date(startDate)
    let resourceIndex = 0
    let templateIndex = 0

    while (currentDate <= endDate) {
      for (const socialNetwork of campaign.socialNetworks) {
        if (currentDate <= endDate) {
          schedule.push({
            date: new Date(currentDate),
            socialNetwork,
            resourceIndex: resourceIndex % campaign.resources.length,
            templateIndex: templateIndex % campaign.templates.length,
          })

          resourceIndex++
          templateIndex++
        }
      }

      currentDate = new Date(currentDate.getTime() + intervalMs)
    }

    return schedule
  }

  private generatePublicationContent(
    campaign: any,
    socialNetwork: SocialNetwork,
    scheduledDate: Date
  ): string {
    // This is a simplified content generation
    // In a real implementation, this would use AI/LLM to generate content
    let baseContent = campaign.prompt

    // Apply optimization settings if available
    if (campaign.optimizationSettings?.[socialNetwork]) {
      const settings = campaign.optimizationSettings[socialNetwork]

      if (settings?.tone) {
        baseContent = `[${settings.tone} tone] ${baseContent}`
      }

      if (settings?.hashtags) {
        baseContent += ' #marketing #socialmedia'
      }
    }

    // Add platform-specific formatting
    switch (socialNetwork) {
      case 'twitter':
        baseContent = baseContent.substring(0, 240) // Twitter character limit
        break
      case 'linkedin':
        baseContent += '\n\n#professional #business'
        break
      case 'instagram':
        baseContent += '\n\n📸 #instagram #content'
        break
      case 'facebook':
        baseContent += '\n\nWhat do you think? Let us know in the comments!'
        break
    }

    return baseContent
  }

  private clearCampaignPublications(campaignId: string): void {
    const publications = this.publicationRepo.findAll({ campaignId } as any, {
      limit: 1000,
    })

    for (const publication of publications) {
      if (publication.status === 'scheduled') {
        this.publicationRepo.delete(publication.id)
      }
    }
  }

  private calculateCampaignSchedule(campaignId: string): {
    nextPublication: Date | null
    publicationsThisWeek: number
    estimatedCompletion: Date | null
  } {
    const publications = this.publicationRepo.findAll({ campaignId } as any, {
      limit: 1000,
    })

    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const scheduledPublications = publications.filter(
      (pub: any) => pub.status === 'scheduled'
    )

    const nextPublication =
      scheduledPublications
        .filter((pub: any) => pub.scheduledDate > now)
        .sort(
          (a: any, b: any) =>
            a.scheduledDate.getTime() - b.scheduledDate.getTime()
        )[0]?.scheduledDate || null

    const publicationsThisWeek = scheduledPublications.filter(
      (pub: any) => pub.scheduledDate >= now && pub.scheduledDate <= weekFromNow
    ).length

    const estimatedCompletion =
      scheduledPublications.sort(
        (a: any, b: any) =>
          b.scheduledDate.getTime() - a.scheduledDate.getTime()
      )[0]?.scheduledDate || null

    return {
      nextPublication,
      publicationsThisWeek,
      estimatedCompletion,
    }
  }
}
