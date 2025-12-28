import { GeminiTextService, TextGenerationParams } from '../services/GeminiTextService'
import { GeminiImageService, ImageGenerationParams } from '../services/GeminiImageService'
import { ContentPlanItem, WorkspaceData, ResourceData } from './types'
import { GenerationMetadata, SocialNetwork, BrandManual } from '../../database/types'

export interface TextImageGenerationParams {
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
  resources: ResourceData[]
  brandManual?: BrandManual
}

export interface TextImageGenerationResult {
  text: string
  imageUrl: string
  metadata: GenerationMetadata
}

/**
 * Agente especializado en generación de contenido de texto + imagen simple
 * Toma la idea de la publicación y genera nueva imagen basada en requerimientos
 * Crea texto que acompañe la imagen optimizado para la plataforma
 */
export class TextImageAgent {
  private geminiTextService: GeminiTextService
  private geminiImageService: GeminiImageService

  constructor() {
    this.geminiTextService = new GeminiTextService()
    this.geminiImageService = new GeminiImageService()
  }

  /**
   * Genera contenido completo de texto + imagen simple
   */
  async generate(params: TextImageGenerationParams): Promise<TextImageGenerationResult> {
    const startTime = Date.now()
    
    try {
      // Validar parámetros de entrada
      this.validateParams(params)
      
      // Seleccionar recurso base para la imagen
      const baseResource = this.selectBestResource(params.resources, params.contentPlan)
      
      // Generar imagen primero (para que el texto pueda referenciarla)
      const imageResult = await this.generateImage(params, baseResource)
      
      // Generar texto que acompañe la imagen
      const textResult = await this.generateText(params, imageResult)
      
      // Crear metadata de generación
      const metadata = this.createGenerationMetadata(params, textResult, imageResult, startTime)
      
      return {
        text: textResult.text,
        imageUrl: imageResult.imageUrl,
        metadata
      }
      
    } catch (error) {
      console.error('❌ Error in TextImageAgent generation:', error)
      throw new Error(`TextImageAgent generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Valida los parámetros de entrada
   */
  private validateParams(params: TextImageGenerationParams): void {
    if (!params.contentPlan) {
      throw new Error('ContentPlan is required')
    }
    
    if (!params.workspace) {
      throw new Error('Workspace data is required')
    }
    
    if (!params.resources || params.resources.length === 0) {
      throw new Error('At least one resource is required for TextImageAgent')
    }
    
    if (!params.contentPlan.description) {
      throw new Error('Content description is required')
    }
    
    if (!params.contentPlan.socialNetwork) {
      throw new Error('Social network is required')
    }
    
    if (params.contentPlan.contentType !== 'text-with-image') {
      throw new Error(`Invalid content type for TextImageAgent: ${params.contentPlan.contentType}`)
    }

    // Validar que hay recursos de imagen disponibles
    const imageResources = params.resources.filter(r => r.type === 'image')
    if (imageResources.length === 0) {
      throw new Error('At least one image resource is required for TextImageAgent')
    }
  }

  /**
   * Selecciona el mejor recurso base para la generación de imagen
   */
  private selectBestResource(resources: ResourceData[], contentPlan: ContentPlanItem): ResourceData {
    // Filtrar solo recursos de imagen
    const imageResources = resources.filter(r => r.type === 'image')
    
    if (imageResources.length === 0) {
      throw new Error('No image resources available')
    }

    // Si hay recursos específicos asignados al plan, usar el primero
    if (contentPlan.resourceIds && contentPlan.resourceIds.length > 0) {
      const assignedResource = imageResources.find(r => contentPlan.resourceIds.includes(r.id))
      if (assignedResource) {
        return assignedResource
      }
    }

    // Estrategia de selección inteligente basada en el contenido
    const contentLower = contentPlan.description.toLowerCase()
    
    // Buscar recursos que coincidan con palabras clave del contenido
    const scoredResources = imageResources.map(resource => {
      let score = 0
      const resourceName = resource.name.toLowerCase()
      
      // Puntuación por coincidencia de palabras clave
      const contentWords = contentLower.split(/\s+/).filter(word => word.length > 3)
      contentWords.forEach(word => {
        if (resourceName.includes(word)) {
          score += 10
        }
      })
      
      // Puntuación por tags si están disponibles
      if (contentPlan.tags) {
        contentPlan.tags.forEach(tag => {
          if (resourceName.includes(tag.toLowerCase())) {
            score += 15
          }
        })
      }
      
      // Puntuación por calidad (tamaño del archivo como proxy)
      if (resource.mimeType === 'image/png') score += 2 // PNG suele ser mejor calidad
      if (resource.url.includes('high-res') || resource.url.includes('hd')) score += 3
      
      return { resource, score }
    })

    // Ordenar por puntuación y devolver el mejor
    scoredResources.sort((a, b) => b.score - a.score)
    
    return scoredResources[0].resource
  }

  /**
   * Genera imagen basada en la idea de contenido y recurso base
   */
  private async generateImage(
    params: TextImageGenerationParams, 
    baseResource: ResourceData
  ): Promise<{ imageUrl: string; metadata: any }> {
    const { contentPlan, workspace } = params
    
    // Preparar parámetros para generación de imagen
    const imageParams: ImageGenerationParams = {
      contentIdea: contentPlan.description,
      baseResource: {
        id: baseResource.id,
        workspaceId: 'temp',
        name: baseResource.name,
        originalName: baseResource.name,
        filePath: baseResource.url,
        url: baseResource.url,
        type: baseResource.type,
        mimeType: baseResource.mimeType,
        sizeBytes: 0, // No necesario para generación
        createdAt: new Date(),
        updatedAt: new Date()
      },
      platform: contentPlan.socialNetwork as SocialNetwork,
      style: this.determineImageStyle(contentPlan, workspace),
      aspectRatio: this.determineAspectRatio(contentPlan.socialNetwork)
    }
    
    try {
      const result = await this.geminiImageService.generateSimpleImage(imageParams)
      
      return {
        imageUrl: result.imageUrl,
        metadata: result.metadata
      }
    } catch (error) {
      console.error('Error generating image:', error)
      throw new Error(`Failed to generate image: ${error}`)
    }
  }

  /**
   * Genera texto que acompañe la imagen generada
   */
  private async generateText(
    params: TextImageGenerationParams,
    imageResult: { imageUrl: string; metadata: any }
  ): Promise<{ text: string; metadata: any }> {
    const { contentPlan, workspace, brandManual } = params
    
    // Crear brand manual por defecto si no se proporciona
    const defaultBrandManual: BrandManual = brandManual || {
      id: 'default',
      workspaceId: workspace.id,
      brandVoice: 'profesional y cercano',
      brandValues: ['calidad', 'innovación', 'confianza'],
      targetAudience: 'profesionales y empresas',
      keyMessages: ['soluciones efectivas', 'resultados medibles'],
      dosDonts: {
        dos: ['usar lenguaje claro', 'incluir call-to-action', 'ser auténtico'],
        donts: ['usar jerga técnica excesiva', 'hacer promesas irreales', 'ser demasiado promocional']
      },
      colorPalette: [workspace.branding.primaryColor, workspace.branding.secondaryColor],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Construir contexto adicional que incluya información sobre la imagen
    const additionalContext = this.buildTextContextWithImage(workspace, contentPlan, imageResult)
    
    // Preparar parámetros para generación de texto
    const textParams: TextGenerationParams = {
      contentIdea: contentPlan.description,
      platform: contentPlan.socialNetwork as SocialNetwork,
      brandManual: defaultBrandManual,
      contentType: 'text_image_simple',
      additionalContext
    }
    
    try {
      const result = await this.geminiTextService.generateSocialText(textParams)
      
      // Validar que el texto cumple con los límites
      if (!result.withinLimits) {
        throw new Error(
          `Generated text exceeds platform limit: ${result.characterCount}/${this.geminiTextService.getPlatformLimit(result.platform)} characters`
        )
      }
      
      return {
        text: result.text,
        metadata: result.metadata
      }
    } catch (error) {
      console.error('Error generating text:', error)
      throw new Error(`Failed to generate text: ${error}`)
    }
  }

  /**
   * Determina el estilo de imagen basado en el contenido y workspace
   */
  private determineImageStyle(
    contentPlan: ContentPlanItem, 
    workspace: WorkspaceData
  ): 'professional' | 'casual' | 'creative' | 'minimalist' {
    const contentLower = contentPlan.description.toLowerCase()
    const platform = contentPlan.socialNetwork
    
    // Análisis de palabras clave para determinar estilo
    if (platform === 'linkedin' || contentLower.includes('profesional') || contentLower.includes('negocio')) {
      return 'professional'
    }
    
    if (contentLower.includes('creativo') || contentLower.includes('arte') || contentLower.includes('diseño')) {
      return 'creative'
    }
    
    if (contentLower.includes('simple') || contentLower.includes('limpio') || contentLower.includes('minimalista')) {
      return 'minimalist'
    }
    
    // Por defecto, usar estilo basado en la plataforma
    const platformStyles = {
      instagram: 'creative' as const,
      linkedin: 'professional' as const,
      twitter: 'casual' as const,
      facebook: 'casual' as const
    }
    
    return platformStyles[platform as keyof typeof platformStyles] || 'professional'
  }

  /**
   * Determina la relación de aspecto basada en la plataforma
   */
  private determineAspectRatio(platform: string): 'square' | 'landscape' | 'portrait' | 'story' {
    const aspectRatios = {
      instagram: 'square' as const,
      linkedin: 'landscape' as const,
      twitter: 'landscape' as const,
      facebook: 'landscape' as const
    }
    
    return aspectRatios[platform as keyof typeof aspectRatios] || 'square'
  }

  /**
   * Construye contexto adicional para generación de texto que incluye información de la imagen
   */
  private buildTextContextWithImage(
    workspace: WorkspaceData,
    contentPlan: ContentPlanItem,
    imageResult: { imageUrl: string; metadata: any }
  ): string {
    const contextParts = []
    
    // Información del workspace
    contextParts.push(`MARCA: ${workspace.name}`)
    
    if (workspace.branding.slogan) {
      contextParts.push(`SLOGAN: ${workspace.branding.slogan}`)
    }
    
    if (workspace.branding.description) {
      contextParts.push(`DESCRIPCIÓN: ${workspace.branding.description}`)
    }
    
    // Información de la imagen generada
    contextParts.push(`IMAGEN GENERADA: Se ha creado una imagen que representa visualmente el contenido`)
    contextParts.push(`ESTILO DE IMAGEN: ${imageResult.metadata.parameters?.style || 'profesional'}`)
    contextParts.push(`PLATAFORMA OPTIMIZADA: ${imageResult.metadata.parameters?.platform || contentPlan.socialNetwork}`)
    
    // Información del contenido
    if (contentPlan.tags && contentPlan.tags.length > 0) {
      contextParts.push(`TAGS RELEVANTES: ${contentPlan.tags.join(', ')}`)
    }
    
    if (contentPlan.priority) {
      contextParts.push(`PRIORIDAD: ${contentPlan.priority}`)
    }
    
    if (contentPlan.notes) {
      contextParts.push(`NOTAS ADICIONALES: ${contentPlan.notes}`)
    }
    
    // Fecha programada para contexto temporal
    if (contentPlan.scheduledDate) {
      const scheduledDate = new Date(contentPlan.scheduledDate)
      const dayOfWeek = scheduledDate.toLocaleDateString('es-ES', { weekday: 'long' })
      const month = scheduledDate.toLocaleDateString('es-ES', { month: 'long' })
      contextParts.push(`FECHA PROGRAMADA: ${dayOfWeek} ${scheduledDate.getDate()} de ${month}`)
    }
    
    // Instrucciones específicas para texto con imagen
    contextParts.push(`INSTRUCCIÓN ESPECIAL: El texto debe complementar perfectamente la imagen generada`)
    contextParts.push(`OBJETIVO: Crear sinergia entre imagen y texto para máximo impacto`)
    
    return contextParts.join('\n')
  }

  /**
   * Crea metadata de generación con información detallada del proceso
   */
  private createGenerationMetadata(
    params: TextImageGenerationParams,
    textResult: { text: string; metadata: any },
    imageResult: { imageUrl: string; metadata: any },
    startTime: number
  ): GenerationMetadata {
    return {
      agentUsed: 'text-image',
      textPrompt: textResult.metadata.prompt,
      imagePrompt: imageResult.metadata.prompt,
      templateUsed: undefined, // No se usa template en imagen simple
      resourcesUsed: params.resources.map(r => r.id),
      generationTime: new Date(),
      retryCount: Math.max(textResult.metadata.retryCount || 0, imageResult.metadata.retryCount || 0),
      processingTimeMs: Date.now() - startTime
    }
  }

  /**
   * Regenera contenido con parámetros ajustados
   */
  async regenerate(
    params: TextImageGenerationParams,
    previousAttempt?: { text?: string; imageUrl?: string },
    feedback?: string,
    regenerateImage: boolean = true,
    regenerateText: boolean = true
  ): Promise<TextImageGenerationResult> {
    const startTime = Date.now()
    
    try {
      let imageResult: { imageUrl: string; metadata: any }
      let textResult: { text: string; metadata: any }
      
      // Regenerar imagen si se solicita
      if (regenerateImage) {
        const baseResource = this.selectBestResource(params.resources, params.contentPlan)
        
        // Agregar feedback al contexto si se proporciona
        let enhancedContentPlan = { ...params.contentPlan }
        if (feedback && previousAttempt?.imageUrl) {
          enhancedContentPlan.notes = (enhancedContentPlan.notes || '') + 
            `\n\nFEEDBACK PARA IMAGEN: ${feedback}\nIMAGEN ANTERIOR: ${previousAttempt.imageUrl}`
        }
        
        imageResult = await this.generateImage({ ...params, contentPlan: enhancedContentPlan }, baseResource)
      } else if (previousAttempt?.imageUrl) {
        // Usar imagen anterior
        imageResult = {
          imageUrl: previousAttempt.imageUrl,
          metadata: { prompt: 'Previous image reused', parameters: {} }
        }
      } else {
        throw new Error('Cannot regenerate text without image')
      }
      
      // Regenerar texto si se solicita
      if (regenerateText) {
        // Agregar feedback al contexto si se proporciona
        let enhancedParams = { ...params }
        if (feedback || previousAttempt?.text) {
          const originalContext = this.buildTextContextWithImage(params.workspace, params.contentPlan, imageResult)
          let enhancedContext = originalContext
          
          if (previousAttempt?.text) {
            enhancedContext += `\n\nTEXTO ANTERIOR (MEJORAR): ${previousAttempt.text}`
          }
          
          if (feedback) {
            enhancedContext += `\n\nFEEDBACK DEL USUARIO: ${feedback}`
          }
          
          enhancedParams = {
            ...params,
            contentPlan: {
              ...params.contentPlan,
              notes: enhancedContext
            }
          }
        }
        
        textResult = await this.generateText(enhancedParams, imageResult)
      } else if (previousAttempt?.text) {
        // Usar texto anterior
        textResult = {
          text: previousAttempt.text,
          metadata: { prompt: 'Previous text reused', retryCount: 0 }
        }
      } else {
        throw new Error('Cannot regenerate image without text')
      }
      
      // Crear metadata de regeneración
      const metadata = this.createGenerationMetadata(params, textResult, imageResult, startTime)
      metadata.retryCount += 1 // Incrementar contador de reintentos
      
      return {
        text: textResult.text,
        imageUrl: imageResult.imageUrl,
        metadata
      }
      
    } catch (error) {
      console.error('❌ Error in TextImageAgent regeneration:', error)
      throw new Error(`TextImageAgent regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Obtiene estadísticas del agente
   */
  getAgentStats(): {
    name: string
    type: string
    supportedPlatforms: SocialNetwork[]
    capabilities: string[]
    limitations: string[]
    estimatedProcessingTime: string
  } {
    return {
      name: 'TextImageAgent',
      type: 'text-image',
      supportedPlatforms: ['instagram', 'linkedin', 'twitter', 'facebook'],
      capabilities: [
        'Generación de imagen basada en recursos',
        'Generación de texto optimizado por plataforma',
        'Selección inteligente de recursos',
        'Sinergia entre imagen y texto',
        'Regeneración selectiva (imagen o texto)',
        'Integración con brand manual',
        'Optimización por plataforma social'
      ],
      limitations: [
        'Requiere al menos un recurso de imagen',
        'No maneja templates complejos',
        'Tiempo de procesamiento mayor (imagen + texto)',
        'Dependiente de calidad de recursos base'
      ],
      estimatedProcessingTime: '20-45 segundos'
    }
  }

  /**
   * Verifica si el agente puede manejar el tipo de contenido
   */
  canHandle(contentType: string): boolean {
    return contentType === 'text-with-image'
  }

  /**
   * Estima el tiempo de procesamiento
   */
  estimateProcessingTime(contentPlan: ContentPlanItem, resourceCount: number): number {
    // Tiempo base en milisegundos
    let baseTime = 20000 // 20 segundos base (imagen + texto)
    
    // Ajustar según la complejidad del contenido
    const descriptionLength = contentPlan.description.length
    if (descriptionLength > 200) {
      baseTime += 5000 // +5 segundos para descripciones largas
    }
    
    // Ajustar según número de recursos (más opciones = más tiempo de selección)
    if (resourceCount > 5) {
      baseTime += 2000 // +2 segundos para muchos recursos
    }
    
    // Ajustar según la plataforma
    if (contentPlan.socialNetwork === 'instagram') {
      baseTime += 3000 // +3 segundos para Instagram (más exigente visualmente)
    }
    
    // Ajustar según prioridad
    if (contentPlan.priority === 'high') {
      baseTime += 5000 // +5 segundos para alta prioridad
    }
    
    return baseTime
  }

  /**
   * Valida que los recursos sean compatibles
   */
  validateResources(resources: ResourceData[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const imageResources = resources.filter(r => r.type === 'image')
    
    if (imageResources.length === 0) {
      errors.push('At least one image resource is required')
    }
    
    // Validar tipos de archivo soportados
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const unsupportedResources = imageResources.filter(r => !supportedTypes.includes(r.mimeType))
    
    if (unsupportedResources.length > 0) {
      errors.push(`Unsupported image types: ${unsupportedResources.map(r => r.mimeType).join(', ')}`)
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Factory function para crear instancia del agente
 */
export function createTextImageAgent(): TextImageAgent {
  try {
    return new TextImageAgent()
  } catch (error) {
    console.error('❌ Error creando TextImageAgent:', error)
    throw error
  }
}