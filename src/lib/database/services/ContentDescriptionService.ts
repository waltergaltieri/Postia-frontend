import { ContentDescriptionRepository } from '../repositories/ContentDescriptionRepository'
import { BrandManualRepository } from '../repositories/BrandManualRepository'
import { CampaignRepository } from '../repositories/CampaignRepository'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import {
  ContentDescription,
  CreateContentDescriptionData,
  UpdateContentDescriptionData,
  ContentDescriptionFilters,
  BrandManual,
  Campaign,
  QueryOptions
} from '../types'
import { ContentGenerationService, GenerateDescriptionsParams } from '../../ai/ContentGenerationService'
import { createContentGenerationService } from '../../ai'

/**
 * Business service for content description management with AI integration
 */
export class ContentDescriptionService {
  private contentDescriptionRepo: ContentDescriptionRepository
  private brandManualRepo: BrandManualRepository
  private campaignRepo: CampaignRepository
  private workspaceRepo: WorkspaceRepository
  private aiService: ContentGenerationService

  constructor() {
    this.contentDescriptionRepo = new ContentDescriptionRepository()
    this.brandManualRepo = new BrandManualRepository()
    this.campaignRepo = new CampaignRepository()
    this.workspaceRepo = new WorkspaceRepository()
    this.aiService = createContentGenerationService()
  }

  /**
   * Generate content descriptions for a campaign using AI
   */
  async generateDescriptionsForCampaign(
    campaignId: string,
    agencyId: string,
    onProgress?: (status: string, progress?: number) => void
  ): Promise<ContentDescription[]> {
    // Get campaign and validate access
    const campaign = this.campaignRepo.findById(campaignId)
    if (!campaign) {
      throw new Error('Campaña no encontrada')
    }

    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(campaign.workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a esta campaña')
    }

    // Validate campaign has required AI fields
    if (!campaign.shortPrompt || !campaign.longPrompt) {
      throw new Error('La campaña debe tener configurados los prompts de IA')
    }

    if (!campaign.platformDistribution) {
      throw new Error('La campaña debe tener configurada la distribución de plataformas')
    }

    // Get or create brand manual for workspace
    const brandManual = this.brandManualRepo.getOrCreateDefault(campaign.workspaceId)

    // Prepare generation parameters
    const generationParams: GenerateDescriptionsParams = {
      campaignId: campaign.id,
      campaignObjective: campaign.shortPrompt,
      campaignInstructions: campaign.longPrompt,
      brandManual,
      platformDistribution: campaign.platformDistribution,
      dateRange: {
        start: campaign.startDate,
        end: campaign.endDate
      },
      publicationsPerDay: campaign.publicationsPerDay || 1,
      selectedResources: campaign.selectedResources || [],
      selectedTemplates: campaign.selectedTemplates || []
    }

    // Generate descriptions using AI
    const result = await this.aiService.generateDescriptions(generationParams, onProgress)

    if (!result.success || !result.descriptions) {
      throw new Error(result.error || 'Error generando descripciones de contenido')
    }

    // Delete existing descriptions for this campaign
    this.contentDescriptionRepo.deleteByCampaignId(campaignId)

    // Save new descriptions to database
    const savedDescriptions = this.contentDescriptionRepo.bulkCreate(
      result.descriptions.map(desc => ({
        campaignId: desc.campaignId,
        platform: desc.platform,
        scheduledDate: desc.scheduledDate,
        contentType: desc.contentType,
        description: desc.description,
        templateId: desc.templateId,
        resourceIds: desc.resourceIds,
        status: desc.status
      }))
    )

    // Update campaign status
    this.campaignRepo.update(campaignId, {
      generationStatus: 'descriptions_generated'
    })

    return savedDescriptions
  }

  /**
   * Regenerate a specific content description
   */
  async regenerateDescription(
    descriptionId: string,
    agencyId: string
  ): Promise<ContentDescription> {
    // Get description and validate access
    const description = this.contentDescriptionRepo.findById(descriptionId)
    if (!description) {
      throw new Error('Descripción de contenido no encontrada')
    }

    // Get campaign and validate access
    const campaign = this.campaignRepo.findById(description.campaignId)
    if (!campaign) {
      throw new Error('Campaña no encontrada')
    }

    if (!this.workspaceRepo.validateAgencyOwnership(campaign.workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a esta descripción')
    }

    // Get brand manual
    const brandManual = this.brandManualRepo.getOrCreateDefault(campaign.workspaceId)

    // Mark as regenerating
    this.contentDescriptionRepo.update(descriptionId, { status: 'regenerating' })

    try {
      // Regenerate using AI
      const result = await this.aiService.regenerateDescription(
        {
          descriptionId,
          campaignData: {
            objective: campaign.shortPrompt || '',
            instructions: campaign.longPrompt || '',
            brandManual
          }
        },
        description
      )

      if (!result.success || !result.descriptions || result.descriptions.length === 0) {
        throw new Error(result.error || 'Error regenerando descripción')
      }

      // Update description with new content
      const regeneratedDescription = result.descriptions[0]
      return this.contentDescriptionRepo.update(descriptionId, {
        description: regeneratedDescription.description,
        contentType: regeneratedDescription.contentType,
        status: 'pending'
      })

    } catch (error) {
      // Mark as error and re-throw
      this.contentDescriptionRepo.update(descriptionId, { status: 'pending' })
      throw error
    }
  }

  /**
   * Get content descriptions for a campaign
   */
  getDescriptionsByCampaign(
    campaignId: string,
    agencyId: string,
    options: QueryOptions = {}
  ): ContentDescription[] {
    // Validate campaign access
    const campaign = this.campaignRepo.findById(campaignId)
    if (!campaign) {
      throw new Error('Campaña no encontrada')
    }

    if (!this.workspaceRepo.validateAgencyOwnership(campaign.workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a esta campaña')
    }

    return this.contentDescriptionRepo.findByCampaignId(campaignId, options)
  }

  /**
   * Get content description by ID
   */
  getDescriptionById(descriptionId: string, agencyId: string): ContentDescription {
    const description = this.contentDescriptionRepo.findById(descriptionId)
    if (!description) {
      throw new Error('Descripción de contenido no encontrada')
    }

    // Validate access through campaign
    const campaign = this.campaignRepo.findById(description.campaignId)
    if (!campaign) {
      throw new Error('Campaña no encontrada')
    }

    if (!this.workspaceRepo.validateAgencyOwnership(campaign.workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a esta descripción')
    }

    return description
  }

  /**
   * Update content description
   */
  updateDescription(
    descriptionId: string,
    data: UpdateContentDescriptionData,
    agencyId: string
  ): ContentDescription {
    // Validate access
    this.getDescriptionById(descriptionId, agencyId)

    return this.contentDescriptionRepo.update(descriptionId, data)
  }

  /**
   * Delete content description
   */
  deleteDescription(descriptionId: string, agencyId: string): boolean {
    // Validate access
    this.getDescriptionById(descriptionId, agencyId)

    return this.contentDescriptionRepo.delete(descriptionId)
  }

  /**
   * Approve content descriptions (mark as ready for content generation)
   */
  approveDescriptions(descriptionIds: string[], agencyId: string): number {
    // Validate access for all descriptions
    for (const id of descriptionIds) {
      this.getDescriptionById(id, agencyId)
    }

    return this.contentDescriptionRepo.bulkUpdateStatus(descriptionIds, 'approved')
  }

  /**
   * Get content descriptions with filters
   */
  getDescriptionsWithFilters(
    filters: ContentDescriptionFilters,
    agencyId: string,
    options: QueryOptions = {}
  ): ContentDescription[] {
    // If campaignId is provided, validate access
    if (filters.campaignId) {
      const campaign = this.campaignRepo.findById(filters.campaignId)
      if (!campaign) {
        throw new Error('Campaña no encontrada')
      }

      if (!this.workspaceRepo.validateAgencyOwnership(campaign.workspaceId, agencyId)) {
        throw new Error('No tienes permisos para acceder a esta campaña')
      }
    }

    return this.contentDescriptionRepo.findWithFilters(filters, options)
  }

  /**
   * Count descriptions by campaign
   */
  countDescriptionsByCampaign(campaignId: string, agencyId: string): number {
    // Validate access
    const campaign = this.campaignRepo.findById(campaignId)
    if (!campaign) {
      throw new Error('Campaña no encontrada')
    }

    if (!this.workspaceRepo.validateAgencyOwnership(campaign.workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a esta campaña')
    }

    return this.contentDescriptionRepo.countByCampaignId(campaignId)
  }

  /**
   * Delete all descriptions for a campaign
   */
  deleteDescriptionsByCampaign(campaignId: string, agencyId: string): number {
    // Validate access
    const campaign = this.campaignRepo.findById(campaignId)
    if (!campaign) {
      throw new Error('Campaña no encontrada')
    }

    if (!this.workspaceRepo.validateAgencyOwnership(campaign.workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a esta campaña')
    }

    return this.contentDescriptionRepo.deleteByCampaignId(campaignId)
  }
}

// Singleton instance
let contentDescriptionServiceInstance: ContentDescriptionService | null = null

export function getContentDescriptionService(): ContentDescriptionService {
  if (!contentDescriptionServiceInstance) {
    contentDescriptionServiceInstance = new ContentDescriptionService()
  }
  return contentDescriptionServiceInstance
}