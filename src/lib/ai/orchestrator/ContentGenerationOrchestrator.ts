import { 
  createTextOnlyAgent,
  createTextImageAgent,
  createTextTemplateAgent,
  createCarouselAgent,
  type ContentPlanItem,
  type WorkspaceData,
  type ResourceData,
  type TemplateData
} from '../agents'
import type { 
  GenerationProgress, 
  GenerationError, 
  GenerationMetadata,
  Campaign,
  Publication,
  CreatePublicationData
} from '../../database/types'
import { ProgressTrackingService } from './ProgressTrackingService'
import { ErrorHandlingService } from './ErrorHandlingService'
import { DatabaseService } from '../../database/DatabaseService'

export interface ContentGenerationParams {
  campaignId: string
  contentPlan: ContentPlanItem[]
  workspace: WorkspaceData
  resources: ResourceData[]
  templates: TemplateData[]
}

export interface GenerationResult {
  publicationId: string
  success: boolean
  content?: {
    text: string
    imageUrls?: string[]
    metadata: GenerationMetadata
  }
  error?: string
}

/**
 * Orquestador principal para la generación de contenido con IA
 * Coordina todos los agentes especializados y maneja el flujo completo
 */
export class ContentGenerationOrchestrator {
  private progressService: ProgressTrackingService
  private errorService: ErrorHandlingService
  private databaseService: DatabaseService
  private activeGenerations = new Map<string, boolean>()

  constructor() {
    this.progressService = new ProgressTrackingService()
    this.errorService = new ErrorHandlingService()
    this.databaseService = new DatabaseService()
  }

  /**
   * Método principal para generar contenido de toda la campaña
   */
  async generateCampaignContent(params: ContentGenerationParams): Promise<void> {
    const { campaignId, contentPlan, workspace, resources, templates } = params
    
    console.log(`🚀 Starting content generation for campaign ${campaignId}`)
    console.log(`📋 Processing ${contentPlan.length} publications`)

    // Verificar si ya hay una generación activa
    if (this.activeGenerations.has(campaignId)) {
      throw new Error(`Generation already in progress for campaign ${campaignId}`)
    }

    try {
      // Marcar generación como activa
      this.activeGenerations.set(campaignId, true)

      // Actualizar estado de la campaña
      await this.updateCampaignStatus(campaignId, 'generating')

      // Crear tracking de progreso
      const progress = await this.progressService.createProgress(campaignId, contentPlan.length)
      console.log(`📊 Created progress tracking: ${progress.id}`)

      // Procesar cada publicación secuencialmente
      const results: GenerationResult[] = []
      
      for (let i = 0; i < contentPlan.length; i++) {
        const contentItem = contentPlan[i]
        
        // Verificar si la generación fue cancelada
        if (!this.activeGenerations.has(campaignId)) {
          console.log(`⏹️ Generation cancelled for campaign ${campaignId}`)
          break
        }

        console.log(`🔄 Processing publication ${i + 1}/${contentPlan.length}: ${contentItem.title}`)

        // Actualizar progreso actual
        await this.progressService.updateCurrentPublication(progress.id, contentItem.id, this.getAgentType(contentItem))

        try {
          // Generar contenido para esta publicación
          const result = await this.generateSinglePublication({
            contentItem,
            workspace,
            resources,
            templates,
            campaignId
          })

          results.push(result)

          if (result.success) {
            // Actualizar progreso completado
            await this.progressService.incrementCompleted(progress.id)
            console.log(`✅ Publication ${i + 1} completed successfully`)
          } else {
            // Registrar error pero continuar
            const error: GenerationError = {
              publicationId: contentItem.id,
              agentType: this.getAgentType(contentItem),
              errorMessage: result.error || 'Unknown error',
              timestamp: new Date(),
              retryCount: 0
            }
            
            await this.progressService.addError(progress.id, error)
            console.log(`❌ Publication ${i + 1} failed: ${result.error}`)
          }

        } catch (error) {
          console.error(`💥 Error processing publication ${i + 1}:`, error)
          
          // Intentar recuperación automática
          const recoveryResult = await this.errorService.handlePublicationError({
            publicationId: contentItem.id,
            error: error as Error,
            contentItem,
            workspace,
            resources,
            templates,
            campaignId,
            attemptNumber: 1
          })

          if (recoveryResult.success) {
            results.push(recoveryResult)
            await this.progressService.incrementCompleted(progress.id)
            console.log(`🔄 Publication ${i + 1} recovered successfully`)
          } else {
            // Registrar error final
            const generationError: GenerationError = {
              publicationId: contentItem.id,
              agentType: this.getAgentType(contentItem),
              errorMessage: recoveryResult.error || 'Recovery failed',
              timestamp: new Date(),
              retryCount: 1
            }
            
            await this.progressService.addError(progress.id, generationError)
            results.push(recoveryResult)
            console.log(`💀 Publication ${i + 1} failed permanently`)
          }
        }
      }

      // Completar progreso
      await this.progressService.completeProgress(progress.id)

      // Actualizar estado final de la campaña
      const hasErrors = results.some(r => !r.success)
      const finalStatus = hasErrors ? 'failed' : 'completed'
      await this.updateCampaignStatus(campaignId, finalStatus)

      console.log(`🎉 Content generation completed for campaign ${campaignId}`)
      console.log(`📈 Results: ${results.filter(r => r.success).length}/${results.length} successful`)

    } catch (error) {
      console.error(`💥 Fatal error in content generation:`, error)
      
      // Actualizar estado de error
      await this.updateCampaignStatus(campaignId, 'failed')
      
      throw error
    } finally {
      // Limpiar generación activa
      this.activeGenerations.delete(campaignId)
    }
  }

  /**
   * Genera contenido para una sola publicación
   */
  private async generateSinglePublication(params: {
    contentItem: ContentPlanItem
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    campaignId: string
  }): Promise<GenerationResult> {
    const { contentItem, workspace, resources, templates, campaignId } = params
    
    try {
      // Determinar el agente apropiado y generar contenido
      const agentType = this.getAgentType(contentItem)
      let generationResult: any

      switch (agentType) {
        case 'text-only':
          generationResult = await this.generateWithTextOnlyAgent(contentItem, workspace)
          break
          
        case 'text-image':
          generationResult = await this.generateWithTextImageAgent(contentItem, workspace, resources)
          break
          
        case 'text-template':
          generationResult = await this.generateWithTextTemplateAgent(contentItem, workspace, resources, templates)
          break
          
        case 'carousel':
          generationResult = await this.generateWithCarouselAgent(contentItem, workspace, resources, templates)
          break
          
        default:
          throw new Error(`Unsupported agent type: ${agentType}`)
      }

      // Crear publicación en la base de datos
      const publicationId = await this.createPublication({
        campaignId,
        contentItem,
        generationResult
      })

      return {
        publicationId,
        success: true,
        content: {
          text: generationResult.text,
          imageUrls: generationResult.imageUrls || (generationResult.imageUrl ? [generationResult.imageUrl] : []),
          metadata: generationResult.metadata
        }
      }

    } catch (error) {
      console.error(`Error generating single publication:`, error)
      
      return {
        publicationId: contentItem.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Genera contenido usando TextOnlyAgent
   */
  private async generateWithTextOnlyAgent(
    contentItem: ContentPlanItem, 
    workspace: WorkspaceData
  ) {
    const agent = createTextOnlyAgent()
    return await agent.generate({
      contentPlan: contentItem,
      workspace
    })
  }

  /**
   * Genera contenido usando TextImageAgent
   */
  private async generateWithTextImageAgent(
    contentItem: ContentPlanItem,
    workspace: WorkspaceData,
    resources: ResourceData[]
  ) {
    const agent = createTextImageAgent()
    const relevantResources = resources.filter(r => contentItem.resourceIds.includes(r.id))
    
    return await agent.generate({
      contentPlan: contentItem,
      workspace,
      resources: relevantResources
    })
  }

  /**
   * Genera contenido usando TextTemplateAgent
   */
  private async generateWithTextTemplateAgent(
    contentItem: ContentPlanItem,
    workspace: WorkspaceData,
    resources: ResourceData[],
    templates: TemplateData[]
  ) {
    const agent = createTextTemplateAgent()
    const template = templates.find(t => t.id === contentItem.templateId)
    const relevantResources = resources.filter(r => contentItem.resourceIds.includes(r.id))
    
    if (!template) {
      throw new Error(`Template not found: ${contentItem.templateId}`)
    }

    return await agent.generate({
      contentPlan: contentItem,
      workspace,
      resources: relevantResources,
      template
    })
  }

  /**
   * Genera contenido usando CarouselAgent
   */
  private async generateWithCarouselAgent(
    contentItem: ContentPlanItem,
    workspace: WorkspaceData,
    resources: ResourceData[],
    templates: TemplateData[]
  ) {
    const agent = createCarouselAgent()
    const template = templates.find(t => t.id === contentItem.templateId)
    const relevantResources = resources.filter(r => contentItem.resourceIds.includes(r.id))
    
    if (!template) {
      throw new Error(`Carousel template not found: ${contentItem.templateId}`)
    }

    return await agent.generate({
      contentPlan: contentItem,
      workspace,
      resources: relevantResources,
      template
    })
  }

  /**
   * Determina el tipo de agente necesario basado en el contenido
   */
  private getAgentType(contentItem: ContentPlanItem): string {
    if (contentItem.contentType === 'text-only') {
      return 'text-only'
    }
    
    if (contentItem.contentType === 'text-with-image' && !contentItem.templateId) {
      return 'text-image'
    }
    
    if (contentItem.contentType === 'text-with-carousel') {
      return 'carousel'
    }
    
    // Default para contenido con template
    return 'text-template'
  }

  /**
   * Crea una publicación en la base de datos
   */
  private async createPublication(params: {
    campaignId: string
    contentItem: ContentPlanItem
    generationResult: any
  }): Promise<string> {
    const { campaignId, contentItem, generationResult } = params
    
    const publicationData: CreatePublicationData = {
      campaignId,
      templateId: contentItem.templateId || '',
      resourceId: contentItem.resourceIds[0] || '',
      socialNetwork: contentItem.socialNetwork as any,
      content: generationResult.text,
      imageUrl: generationResult.imageUrl || '',
      scheduledDate: new Date(contentItem.scheduledDate),
      status: 'scheduled',
      generatedText: generationResult.text,
      generatedImageUrls: generationResult.imageUrls || (generationResult.imageUrl ? [generationResult.imageUrl] : []),
      generationMetadata: generationResult.metadata,
      generationStatus: 'completed'
    }

    return await this.databaseService.createPublication(publicationData)
  }

  /**
   * Actualiza el estado de la campaña
   */
  private async updateCampaignStatus(campaignId: string, status: Campaign['generationStatus']) {
    await this.databaseService.updateCampaign(campaignId, {
      generationStatus: status
    })
  }

  /**
   * Obtiene el progreso de generación de una campaña
   */
  async getGenerationProgress(campaignId: string): Promise<GenerationProgress | null> {
    return await this.progressService.getProgress(campaignId)
  }

  /**
   * Cancela la generación de una campaña
   */
  async cancelGeneration(campaignId: string): Promise<void> {
    console.log(`🛑 Cancelling generation for campaign ${campaignId}`)
    
    // Marcar como cancelada
    this.activeGenerations.delete(campaignId)
    
    // Actualizar estado de la campaña
    await this.updateCampaignStatus(campaignId, 'failed')
    
    // Completar progreso como cancelado
    const progress = await this.progressService.getProgress(campaignId)
    if (progress) {
      await this.progressService.completeProgress(progress.id)
    }
    
    console.log(`✅ Generation cancelled for campaign ${campaignId}`)
  }

  /**
   * Verifica si hay una generación activa para una campaña
   */
  isGenerationActive(campaignId: string): boolean {
    return this.activeGenerations.has(campaignId)
  }

  /**
   * Regenera una publicación individual con tracking de historial
   */
  async regeneratePublication(params: {
    publicationId: string
    contentPlan: ContentPlanItem
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
  }): Promise<void> {
    const { publicationId, contentPlan, workspace, resources, templates } = params
    
    console.log(`🔄 Starting regeneration for publication ${publicationId}`)
    
    try {
      // Obtener contenido actual antes de regenerar
      const currentPublication = await this.databaseService.getPublication(publicationId)
      if (!currentPublication) {
        throw new Error('Publication not found')
      }

      // Generar nuevo contenido
      const generationResult = await this.generateSinglePublication({
        contentItem: contentPlan,
        workspace,
        resources,
        templates,
        campaignId: '' // Not needed for regeneration
      })

      if (!generationResult.success) {
        throw new Error(generationResult.error || 'Failed to regenerate content')
      }

      // Crear registro de historial de regeneración
      const historyData = {
        publicationId,
        previousContent: currentPublication.content,
        previousImageUrls: currentPublication.generatedImageUrls || [],
        previousMetadata: currentPublication.generationMetadata,
        newContent: generationResult.content!.text,
        newImageUrls: generationResult.content!.imageUrls || [],
        newMetadata: generationResult.content!.metadata,
        customPrompt: contentPlan.description !== (currentPublication.generationMetadata?.textPrompt || 'Regenerar contenido') 
          ? contentPlan.description 
          : undefined,
        reason: 'user_request' as const,
        regeneratedAt: new Date()
      }

      // Guardar historial de regeneración
      await this.databaseService.createRegenerationHistory(historyData)

      // Actualizar publicación con nuevo contenido
      await this.databaseService.updatePublication(publicationId, {
        content: generationResult.content!.text,
        generatedText: generationResult.content!.text,
        generatedImageUrls: generationResult.content!.imageUrls,
        generationMetadata: generationResult.content!.metadata,
        generationStatus: 'completed'
      })

      console.log(`✅ Publication ${publicationId} regenerated successfully with history tracking`)
      
    } catch (error) {
      console.error(`❌ Error regenerating publication ${publicationId}:`, error)
      
      // Actualizar estado a fallido
      await this.databaseService.updatePublication(publicationId, {
        generationStatus: 'failed'
      })
      
      throw error
    }
  }

  /**
   * Obtiene estadísticas del orquestador
   */
  getOrchestratorStats(): {
    activeGenerations: number
    supportedAgents: string[]
    capabilities: string[]
  } {
    return {
      activeGenerations: this.activeGenerations.size,
      supportedAgents: ['text-only', 'text-image', 'text-template', 'carousel'],
      capabilities: [
        'Sequential publication processing',
        'Real-time progress tracking',
        'Automatic error recovery',
        'Agent routing by content type',
        'Database persistence',
        'Generation cancellation',
        'Individual publication regeneration'
      ]
    }
  }
}

/**
 * Factory function para crear instancia del orquestador
 */
export function createContentGenerationOrchestrator(): ContentGenerationOrchestrator {
  try {
    return new ContentGenerationOrchestrator()
  } catch (error) {
    console.error('❌ Error creating ContentGenerationOrchestrator:', error)
    throw error
  }
}