import { 
  ContentDescription, 
  CreateContentDescriptionData,
  BrandManual, 
  SocialNetwork 
} from '../database/types'
import { GeminiService } from './GeminiService'
import { AIErrorHandler } from './ErrorHandler'

export interface GenerateDescriptionsParams {
  campaignId: string
  campaignObjective: string
  campaignInstructions: string
  brandManual: BrandManual
  platformDistribution: Record<SocialNetwork, number>
  dateRange: { start: Date, end: Date }
  publicationsPerDay: number
  selectedResources?: string[]
  selectedTemplates?: string[]
}

export interface ContentGenerationResult {
  success: boolean
  descriptions?: ContentDescription[]
  error?: string
  retryCount?: number
}

export interface RegenerateDescriptionParams {
  descriptionId: string
  campaignData: {
    objective: string
    instructions: string
    brandManual: BrandManual
  }
}

export type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error'

export class ContentGenerationService {
  private geminiService: GeminiService
  private currentStatus: GenerationStatus = 'idle'
  private retryAttempts: number = 3
  private retryDelay: number = 1000

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService
  }

  /**
   * Genera descripciones de contenido para una campaña completa
   */
  async generateDescriptions(
    params: GenerateDescriptionsParams,
    onProgress?: (status: GenerationStatus, progress?: number) => void
  ): Promise<ContentGenerationResult> {
    this.currentStatus = 'generating'
    onProgress?.(this.currentStatus, 0)

    try {
      // Validar parámetros de entrada
      this.validateGenerationParams(params)

      // Preparar parámetros para Gemini
      const geminiParams = {
        campaignObjective: params.campaignObjective,
        campaignInstructions: params.campaignInstructions,
        brandManual: params.brandManual,
        platformDistribution: params.platformDistribution,
        dateRange: params.dateRange,
        publicationsPerDay: params.publicationsPerDay
      }

      onProgress?.(this.currentStatus, 25)

      // Generar descripciones usando Gemini
      const descriptionsData = await this.geminiService.generateContentDescriptions(geminiParams)

      onProgress?.(this.currentStatus, 75)

      // Procesar y enriquecer las descripciones
      const processedDescriptions = this.processDescriptions(
        descriptionsData, 
        params.campaignId,
        params.selectedResources || [],
        params.selectedTemplates || []
      )

      onProgress?.(this.currentStatus, 90)

      // Distribuir contenido por fechas de manera más inteligente
      const distributedDescriptions = this.distributeContentByDates(
        processedDescriptions,
        params.dateRange,
        params.publicationsPerDay,
        params.platformDistribution
      )

      this.currentStatus = 'completed'
      onProgress?.(this.currentStatus, 100)

      return {
        success: true,
        descriptions: distributedDescriptions.map(desc => ({
          ...desc,
          id: this.generateId(),
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      }

    } catch (error) {
      this.currentStatus = 'error'
      onProgress?.(this.currentStatus, 0)

      const aiError = error instanceof Error 
        ? AIErrorHandler.parseNetworkError(error)
        : AIErrorHandler.createError(String(error), 'UNKNOWN_ERROR')
      
      return {
        success: false,
        error: aiError.message,
        retryCount: 0
      }
    }
  }

  /**
   * Regenera una descripción individual
   */
  async regenerateDescription(
    params: RegenerateDescriptionParams,
    originalDescription: ContentDescription
  ): Promise<ContentGenerationResult> {
    try {
      // Crear parámetros específicos para regenerar una sola descripción
      const regenerationParams = {
        campaignObjective: params.campaignData.objective,
        campaignInstructions: `${params.campaignData.instructions}\n\nRegeneración específica para: ${originalDescription.description}`,
        brandManual: params.campaignData.brandManual,
        platformDistribution: { [originalDescription.platform]: 100 } as Record<SocialNetwork, number>,
        dateRange: { 
          start: originalDescription.scheduledDate, 
          end: originalDescription.scheduledDate 
        },
        publicationsPerDay: 1
      }

      const descriptionsData = await this.geminiService.generateContentDescriptions(regenerationParams)

      if (descriptionsData.length === 0) {
        throw new Error('No se pudo regenerar la descripción')
      }

      // Tomar la primera descripción generada y aplicar los datos originales
      const newDescriptionData = descriptionsData[0]
      const regeneratedDescription: ContentDescription = {
        ...originalDescription,
        description: newDescriptionData.description,
        contentType: newDescriptionData.contentType,
        status: 'pending',
        updatedAt: new Date()
      }

      return {
        success: true,
        descriptions: [regeneratedDescription]
      }

    } catch (error) {
      const aiError = error instanceof Error 
        ? AIErrorHandler.parseNetworkError(error)
        : AIErrorHandler.createError(String(error), 'UNKNOWN_ERROR')
      
      return {
        success: false,
        error: aiError.message,
        retryCount: 0
      }
    }
  }

  /**
   * Obtiene el estado actual de generación
   */
  getGenerationStatus(): GenerationStatus {
    return this.currentStatus
  }

  /**
   * Configura parámetros de reintentos
   */
  setRetryConfig(attempts: number, delay: number): void {
    this.retryAttempts = Math.max(1, attempts)
    this.retryDelay = Math.max(100, delay)
    this.geminiService.setRetryConfig(attempts, delay)
  }

  /**
   * Valida los parámetros de generación
   */
  private validateGenerationParams(params: GenerateDescriptionsParams): void {
    if (!params.campaignId) {
      throw new Error('Campaign ID is required')
    }

    if (!params.campaignObjective?.trim()) {
      throw new Error('Campaign objective is required')
    }

    if (!params.campaignInstructions?.trim()) {
      throw new Error('Campaign instructions are required')
    }

    if (!params.brandManual) {
      throw new Error('Brand manual is required')
    }

    if (!params.dateRange?.start || !params.dateRange?.end) {
      throw new Error('Date range is required')
    }

    if (params.dateRange.start >= params.dateRange.end) {
      throw new Error('End date must be after start date')
    }

    if (params.publicationsPerDay < 1) {
      throw new Error('Publications per day must be at least 1')
    }

    // Validar distribución de plataformas
    const totalPercentage = Object.values(params.platformDistribution).reduce((sum, val) => sum + val, 0)
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Platform distribution must sum to 100%')
    }
  }

  /**
   * Procesa las descripciones generadas agregando metadatos
   */
  private processDescriptions(
    descriptionsData: CreateContentDescriptionData[],
    campaignId: string,
    selectedResources: string[],
    selectedTemplates: string[]
  ): CreateContentDescriptionData[] {
    return descriptionsData.map(desc => ({
      ...desc,
      campaignId,
      resourceIds: this.assignResources(desc, selectedResources),
      templateId: this.assignTemplate(desc, selectedTemplates),
      status: 'pending' as const
    }))
  }

  /**
   * Distribuye el contenido de manera inteligente por fechas
   */
  private distributeContentByDates(
    descriptions: CreateContentDescriptionData[],
    dateRange: { start: Date, end: Date },
    publicationsPerDay: number,
    platformDistribution: Record<SocialNetwork, number>
  ): CreateContentDescriptionData[] {
    const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const totalPublications = totalDays * publicationsPerDay

    // Calcular cuántas publicaciones por plataforma
    const platformCounts = Object.entries(platformDistribution).reduce((acc, [platform, percentage]) => {
      acc[platform as SocialNetwork] = Math.round((totalPublications * percentage) / 100)
      return acc
    }, {} as Record<SocialNetwork, number>)

    // Distribuir las descripciones por fechas
    const distributedDescriptions: CreateContentDescriptionData[] = []
    let currentDate = new Date(dateRange.start)
    let publicationsToday = 0
    let descriptionIndex = 0

    while (currentDate <= dateRange.end && descriptionIndex < descriptions.length) {
      // Si ya hemos alcanzado el límite de publicaciones para hoy, avanzar al siguiente día
      if (publicationsToday >= publicationsPerDay) {
        currentDate.setDate(currentDate.getDate() + 1)
        publicationsToday = 0
        continue
      }

      // Asignar la siguiente descripción a la fecha actual
      if (descriptionIndex < descriptions.length) {
        const description = descriptions[descriptionIndex]
        distributedDescriptions.push({
          ...description,
          scheduledDate: new Date(currentDate)
        })
        
        descriptionIndex++
        publicationsToday++
      }
    }

    return distributedDescriptions
  }

  /**
   * Asigna recursos apropiados a una descripción
   */
  private assignResources(
    description: CreateContentDescriptionData,
    selectedResources: string[]
  ): string[] {
    // Para contenido que requiere imágenes, asignar recursos
    if (description.contentType !== 'text_simple' && selectedResources.length > 0) {
      // Para carruseles, asignar múltiples recursos
      if (description.contentType === 'carousel') {
        return selectedResources.slice(0, Math.min(3, selectedResources.length))
      }
      
      // Para otros tipos, asignar un recurso aleatorio
      const randomIndex = Math.floor(Math.random() * selectedResources.length)
      return [selectedResources[randomIndex]]
    }

    return []
  }

  /**
   * Asigna template apropiado a una descripción
   */
  private assignTemplate(
    description: CreateContentDescriptionData,
    selectedTemplates: string[]
  ): string | undefined {
    // Solo asignar templates para contenido que los requiere
    if (
      (description.contentType === 'text_image_template' || description.contentType === 'carousel') &&
      selectedTemplates.length > 0
    ) {
      const randomIndex = Math.floor(Math.random() * selectedTemplates.length)
      return selectedTemplates[randomIndex]
    }

    return undefined
  }

  /**
   * Genera un ID único para las descripciones
   */
  private generateId(): string {
    return `desc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Reinicia el estado del servicio
   */
  reset(): void {
    this.currentStatus = 'idle'
  }
}

// Factory function para crear instancia del servicio
export function createContentGenerationService(): ContentGenerationService {
  const geminiService = new GeminiService({
    apiKey: process.env.GEMINI_API_KEY || ''
  })

  return new ContentGenerationService(geminiService)
}