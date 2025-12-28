import type { 
  GenerationError
} from '../../database/types'
import type {
  ContentPlanItem,
  WorkspaceData,
  ResourceData,
  TemplateData
} from '../agents/types'
import { 
  createTextOnlyAgent,
  createTextImageAgent,
  createTextTemplateAgent,
  createCarouselAgent
} from '../agents'

export interface ErrorRecoveryParams {
  publicationId: string
  error: Error
  contentItem: ContentPlanItem
  workspace: WorkspaceData
  resources: ResourceData[]
  templates: TemplateData[]
  campaignId: string
  attemptNumber: number
}

export interface ErrorRecoveryResult {
  publicationId: string
  success: boolean
  content?: {
    text: string
    imageUrls?: string[]
    metadata: any
  }
  error?: string
  retryCount: number
}

export interface ErrorNotification {
  type: 'warning' | 'error' | 'critical'
  message: string
  publicationId: string
  agentType: string
  timestamp: Date
  canRetry: boolean
  suggestedAction?: string
}

/**
 * Servicio especializado para manejo de errores y recuperación automática
 * Implementa reintentos inteligentes y notificaciones al usuario
 */
export class ErrorHandlingService {
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAYS = [1000, 3000, 5000] // ms
  private errorHistory = new Map<string, GenerationError[]>()
  private notificationCallbacks = new Set<(notification: ErrorNotification) => void>()

  constructor() {
    console.log('🛡️ ErrorHandlingService initialized')
  }

  /**
   * Maneja errores de publicación con recuperación automática
   */
  async handlePublicationError(params: ErrorRecoveryParams): Promise<ErrorRecoveryResult> {
    const { publicationId, error, contentItem, workspace, resources, templates, campaignId, attemptNumber } = params
    
    console.log(`🔧 Handling error for publication ${publicationId}, attempt ${attemptNumber}`)
    console.log(`❌ Error: ${error.message}`)

    // Registrar error en historial
    this.recordError(publicationId, {
      publicationId,
      agentType: this.getAgentType(contentItem),
      errorMessage: error.message,
      timestamp: new Date(),
      retryCount: attemptNumber
    })

    // Determinar si se puede reintentar
    const canRetry = this.canRetryError(error, attemptNumber)
    
    if (!canRetry) {
      console.log(`💀 Cannot retry publication ${publicationId} - max attempts reached or critical error`)
      
      // Notificar error crítico
      this.notifyError({
        type: 'critical',
        message: `Error crítico en publicación: ${error.message}`,
        publicationId,
        agentType: this.getAgentType(contentItem),
        timestamp: new Date(),
        canRetry: false,
        suggestedAction: 'Revisar configuración y reintentar manualmente'
      })

      return {
        publicationId,
        success: false,
        error: `Max retry attempts reached: ${error.message}`,
        retryCount: attemptNumber
      }
    }

    // Esperar antes del reintento
    const delay = this.getRetryDelay(attemptNumber)
    console.log(`⏳ Waiting ${delay}ms before retry...`)
    await this.sleep(delay)

    try {
      // Intentar recuperación con estrategia específica
      const recoveryStrategy = this.getRecoveryStrategy(error, contentItem)
      console.log(`🔄 Applying recovery strategy: ${recoveryStrategy}`)

      const result = await this.executeRecoveryStrategy(recoveryStrategy, {
        contentItem,
        workspace,
        resources,
        templates,
        originalError: error,
        attemptNumber
      })

      console.log(`✅ Recovery successful for publication ${publicationId}`)
      
      // Notificar recuperación exitosa
      this.notifyError({
        type: 'warning',
        message: `Publicación recuperada exitosamente después de ${attemptNumber} intentos`,
        publicationId,
        agentType: this.getAgentType(contentItem),
        timestamp: new Date(),
        canRetry: false
      })

      return {
        publicationId,
        success: true,
        content: result,
        retryCount: attemptNumber
      }

    } catch (recoveryError) {
      console.log(`🔄 Recovery failed, attempting next strategy...`)
      
      // Si falla la recuperación, intentar de nuevo con el siguiente intento
      if (attemptNumber < this.MAX_RETRY_ATTEMPTS) {
        return await this.handlePublicationError({
          ...params,
          attemptNumber: attemptNumber + 1,
          error: recoveryError as Error
        })
      }

      // Notificar fallo final
      this.notifyError({
        type: 'critical',
        message: `Fallo permanente después de ${attemptNumber} intentos: ${recoveryError}`,
        publicationId,
        agentType: this.getAgentType(contentItem),
        timestamp: new Date(),
        canRetry: false,
        suggestedAction: 'Verificar recursos y configuración'
      })

      return {
        publicationId,
        success: false,
        error: `Recovery failed after ${attemptNumber} attempts: ${recoveryError}`,
        retryCount: attemptNumber
      }
    }
  }

  /**
   * Determina si un error puede ser reintentado
   */
  private canRetryError(error: Error, attemptNumber: number): boolean {
    // No reintentar si se alcanzó el máximo
    if (attemptNumber >= this.MAX_RETRY_ATTEMPTS) {
      return false
    }

    // Errores que NO se pueden reintentar
    const nonRetryableErrors = [
      'Invalid API key',
      'Insufficient credits',
      'Template not found',
      'Resource not found',
      'Invalid content type',
      'Workspace not found'
    ]

    const errorMessage = error.message.toLowerCase()
    const isNonRetryable = nonRetryableErrors.some(nonRetryable => 
      errorMessage.includes(nonRetryable.toLowerCase())
    )

    if (isNonRetryable) {
      console.log(`🚫 Error is non-retryable: ${error.message}`)
      return false
    }

    // Errores que SÍ se pueden reintentar
    const retryableErrors = [
      'network error',
      'timeout',
      'rate limit',
      'temporary failure',
      'service unavailable',
      'connection refused',
      'gemini api failure',
      'nano banana api failure',
      'image generation failed',
      'template processing failed',
      'carousel generation failed',
      'content too long'
    ]

    const isRetryable = retryableErrors.some(retryable => 
      errorMessage.includes(retryable.toLowerCase())
    )

    return isRetryable
  }

  /**
   * Obtiene la estrategia de recuperación apropiada
   */
  private getRecoveryStrategy(error: Error, contentItem: ContentPlanItem): string {
    const errorMessage = error.message.toLowerCase()

    // Estrategias específicas por tipo de error
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return 'exponential_backoff'
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      return 'retry_with_timeout'
    }

    if (errorMessage.includes('gemini') || errorMessage.includes('api')) {
      return 'fallback_agent'
    }

    if (errorMessage.includes('resource')) {
      return 'simplified_generation'
    }

    if (errorMessage.includes('template')) {
      return 'standard_retry'
    }

    if (errorMessage.includes('content too long') || errorMessage.includes('character limit')) {
      return 'content_optimization'
    }

    // Estrategia por defecto
    return 'standard_retry'
  }

  /**
   * Ejecuta la estrategia de recuperación
   */
  private async executeRecoveryStrategy(
    strategy: string,
    params: {
      contentItem: ContentPlanItem
      workspace: WorkspaceData
      resources: ResourceData[]
      templates: TemplateData[]
      originalError: Error
      attemptNumber: number
    }
  ): Promise<any> {
    const { contentItem, workspace, resources, templates, attemptNumber } = params

    switch (strategy) {
      case 'exponential_backoff':
        // Esperar más tiempo para rate limits (reducido para tests)
        await this.sleep(Math.pow(2, attemptNumber) * 500) // Reducido de 2000 a 500ms
        return await this.generateWithStandardAgent(contentItem, workspace, resources, templates)

      case 'retry_with_timeout':
        // Reintentar con timeout extendido
        return await this.generateWithExtendedTimeout(contentItem, workspace, resources, templates)

      case 'fallback_agent':
        // Usar agente alternativo o configuración simplificada
        return await this.generateWithFallbackAgent(contentItem, workspace, resources, templates)

      case 'simplified_generation':
        // Generar con configuración simplificada
        return await this.generateSimplified(contentItem, workspace)

      case 'content_optimization':
        // Optimizar contenido para límites de plataforma
        return await this.generateOptimizedContent(contentItem, workspace, resources, templates)

      case 'standard_retry':
      default:
        // Reintento estándar
        return await this.generateWithStandardAgent(contentItem, workspace, resources, templates)
    }
  }

  /**
   * Genera contenido con el agente estándar
   */
  private async generateWithStandardAgent(
    contentItem: ContentPlanItem,
    workspace: WorkspaceData,
    resources: ResourceData[],
    templates: TemplateData[]
  ): Promise<any> {
    const agentType = this.getAgentType(contentItem)

    switch (agentType) {
      case 'text-only':
        const textAgent = createTextOnlyAgent()
        return await textAgent.generate({ contentPlan: contentItem, workspace })

      case 'text-image':
        const imageAgent = createTextImageAgent()
        const relevantResources = resources.filter(r => contentItem.resourceIds.includes(r.id))
        return await imageAgent.generate({ contentPlan: contentItem, workspace, resources: relevantResources })

      case 'text-template':
        const templateAgent = createTextTemplateAgent()
        const template = templates.find(t => t.id === contentItem.templateId)
        const templateResources = resources.filter(r => contentItem.resourceIds.includes(r.id))
        if (!template) throw new Error('Template not found for recovery')
        return await templateAgent.generate({ contentPlan: contentItem, workspace, resources: templateResources, template })

      case 'carousel':
        const carouselAgent = createCarouselAgent()
        const carouselTemplate = templates.find(t => t.id === contentItem.templateId)
        const carouselResources = resources.filter(r => contentItem.resourceIds.includes(r.id))
        if (!carouselTemplate) throw new Error('Carousel template not found for recovery')
        return await carouselAgent.generate({ contentPlan: contentItem, workspace, resources: carouselResources, template: carouselTemplate })

      default:
        throw new Error(`Unsupported agent type for recovery: ${agentType}`)
    }
  }

  /**
   * Genera con timeout extendido
   */
  private async generateWithExtendedTimeout(
    contentItem: ContentPlanItem,
    workspace: WorkspaceData,
    resources: ResourceData[],
    templates: TemplateData[]
  ): Promise<any> {
    // Implementar timeout extendido (placeholder)
    console.log('🕐 Using extended timeout for generation')
    return await this.generateWithStandardAgent(contentItem, workspace, resources, templates)
  }

  /**
   * Genera con agente de fallback
   */
  private async generateWithFallbackAgent(
    contentItem: ContentPlanItem,
    workspace: WorkspaceData,
    resources: ResourceData[],
    templates: TemplateData[]
  ): Promise<any> {
    console.log('🔄 Using fallback agent configuration')
    
    // Si falla un agente complejo, usar uno más simple
    if (contentItem.contentType !== 'text-only') {
      // Fallback a texto simple
      const textAgent = createTextOnlyAgent()
      const result = await textAgent.generate({ contentPlan: contentItem, workspace })
      
      return {
        text: result.text,
        imageUrls: [], // Sin imágenes en fallback
        metadata: {
          ...result.metadata,
          fallbackUsed: true,
          originalContentType: contentItem.contentType
        }
      }
    }

    // Si ya es texto simple, usar configuración estándar
    return await this.generateWithStandardAgent(contentItem, workspace, resources, templates)
  }

  /**
   * Genera contenido simplificado
   */
  private async generateSimplified(
    contentItem: ContentPlanItem,
    workspace: WorkspaceData
  ): Promise<any> {
    console.log('📝 Using simplified generation')
    
    // Siempre usar agente de texto simple para recuperación
    const textAgent = createTextOnlyAgent()
    const result = await textAgent.generate({ contentPlan: contentItem, workspace })
    
    return {
      text: result.text,
      imageUrls: [],
      metadata: {
        ...result.metadata,
        simplified: true
      }
    }
  }

  /**
   * Genera contenido optimizado para límites
   */
  private async generateOptimizedContent(
    contentItem: ContentPlanItem,
    workspace: WorkspaceData,
    resources: ResourceData[],
    templates: TemplateData[]
  ): Promise<any> {
    console.log('✂️ Using content optimization for platform limits')
    
    // Crear una versión modificada del contentItem con descripción más corta
    const optimizedContentItem = {
      ...contentItem,
      description: contentItem.description.substring(0, 100) + '...' // Truncar descripción
    }

    return await this.generateWithStandardAgent(optimizedContentItem, workspace, resources, templates)
  }

  /**
   * Obtiene el tipo de agente para un contenido
   */
  private getAgentType(contentItem: ContentPlanItem): string {
    if (contentItem.contentType === 'text-only') return 'text-only'
    if (contentItem.contentType === 'text-with-image' && !contentItem.templateId) return 'text-image'
    if (contentItem.contentType === 'text-with-carousel') return 'carousel'
    return 'text-template'
  }

  /**
   * Obtiene el delay para reintento
   */
  private getRetryDelay(attemptNumber: number): number {
    return this.RETRY_DELAYS[Math.min(attemptNumber - 1, this.RETRY_DELAYS.length - 1)]
  }

  /**
   * Registra un error en el historial
   */
  private recordError(publicationId: string, error: GenerationError): void {
    if (!this.errorHistory.has(publicationId)) {
      this.errorHistory.set(publicationId, [])
    }
    
    this.errorHistory.get(publicationId)!.push(error)
  }

  /**
   * Notifica un error a los callbacks registrados
   */
  private notifyError(notification: ErrorNotification): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification)
      } catch (error) {
        console.error('Error in notification callback:', error)
      }
    })
  }

  /**
   * Registra un callback para notificaciones de error
   */
  subscribeToErrorNotifications(callback: (notification: ErrorNotification) => void): () => void {
    this.notificationCallbacks.add(callback)
    
    return () => {
      this.notificationCallbacks.delete(callback)
    }
  }

  /**
   * Obtiene el historial de errores para una publicación
   */
  getErrorHistory(publicationId: string): GenerationError[] {
    return this.errorHistory.get(publicationId) || []
  }

  /**
   * Limpia el historial de errores
   */
  clearErrorHistory(publicationId?: string): void {
    if (publicationId) {
      this.errorHistory.delete(publicationId)
    } else {
      this.errorHistory.clear()
    }
  }

  /**
   * Obtiene estadísticas de errores
   */
  getErrorStats(): {
    totalErrors: number
    errorsByType: Record<string, number>
    recoveryRate: number
    mostCommonErrors: string[]
  } {
    const allErrors = Array.from(this.errorHistory.values()).flat()
    const errorsByType: Record<string, number> = {}
    const errorMessages: Record<string, number> = {}

    allErrors.forEach(error => {
      errorsByType[error.agentType] = (errorsByType[error.agentType] || 0) + 1
      errorMessages[error.errorMessage] = (errorMessages[error.errorMessage] || 0) + 1
    })

    const mostCommonErrors = Object.entries(errorMessages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([message]) => message)

    return {
      totalErrors: allErrors.length,
      errorsByType,
      recoveryRate: 0.75, // Placeholder - calcular basado en datos reales
      mostCommonErrors
    }
  }

  /**
   * Utilidad para sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Factory function para crear instancia del servicio
 */
export function createErrorHandlingService(): ErrorHandlingService {
  try {
    return new ErrorHandlingService()
  } catch (error) {
    console.error('❌ Error creating ErrorHandlingService:', error)
    throw error
  }
}