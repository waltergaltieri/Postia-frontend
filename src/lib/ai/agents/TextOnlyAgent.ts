import { GeminiTextService, TextGenerationParams, TextGenerationResult } from '../services/GeminiTextService'
import { ContentPlanItem, WorkspaceData } from './types'
import { GenerationMetadata, SocialNetwork, BrandManual } from '../../database/types'

export interface TextOnlyGenerationParams {
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
  brandManual?: BrandManual
}

export interface TextOnlyGenerationResult {
  text: string
  metadata: GenerationMetadata
}

/**
 * Agente especializado en generación de contenido de solo texto
 * Optimizado para crear contenido de alta calidad para redes sociales
 */
export class TextOnlyAgent {
  private geminiTextService: GeminiTextService

  constructor() {
    this.geminiTextService = new GeminiTextService()
  }

  /**
   * Genera contenido de solo texto optimizado para la plataforma específica
   */
  async generate(params: TextOnlyGenerationParams): Promise<TextOnlyGenerationResult> {
    const startTime = Date.now()
    
    try {
      // Validar parámetros de entrada
      this.validateParams(params)
      
      // Preparar parámetros para el servicio de texto
      const textParams = this.prepareTextGenerationParams(params)
      
      // Generar texto usando GeminiTextService
      const textResult = await this.geminiTextService.generateSocialText(textParams)
      
      // Validar que el texto cumple con los límites de la plataforma
      if (!textResult.withinLimits) {
        throw new Error(
          `Generated text exceeds platform limit: ${textResult.characterCount}/${this.geminiTextService.getPlatformLimit(textResult.platform)} characters`
        )
      }
      
      // Crear metadata de generación
      const metadata = this.createGenerationMetadata(params, textResult, startTime)
      
      return {
        text: textResult.text,
        metadata
      }
      
    } catch (error) {
      console.error('❌ Error in TextOnlyAgent generation:', error)
      throw new Error(`TextOnlyAgent generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Valida los parámetros de entrada
   */
  private validateParams(params: TextOnlyGenerationParams): void {
    if (!params.contentPlan) {
      throw new Error('ContentPlan is required')
    }
    
    if (!params.workspace) {
      throw new Error('Workspace data is required')
    }
    
    if (!params.contentPlan.description) {
      throw new Error('Content description is required')
    }
    
    if (!params.contentPlan.socialNetwork) {
      throw new Error('Social network is required')
    }
    
    if (params.contentPlan.contentType !== 'text-only') {
      throw new Error(`Invalid content type for TextOnlyAgent: ${params.contentPlan.contentType}`)
    }
  }

  /**
   * Prepara los parámetros para el servicio de generación de texto
   */
  private prepareTextGenerationParams(params: TextOnlyGenerationParams): TextGenerationParams {
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
    
    // Construir contexto adicional con información del workspace
    const additionalContext = this.buildAdditionalContext(workspace, contentPlan)
    
    return {
      contentIdea: contentPlan.description,
      platform: contentPlan.socialNetwork as SocialNetwork,
      brandManual: defaultBrandManual,
      contentType: 'text_simple',
      additionalContext
    }
  }

  /**
   * Construye contexto adicional con información del workspace y campaña
   */
  private buildAdditionalContext(workspace: WorkspaceData, contentPlan: ContentPlanItem): string {
    const contextParts = []
    
    // Información del workspace
    contextParts.push(`MARCA: ${workspace.name}`)
    
    if (workspace.branding.slogan) {
      contextParts.push(`SLOGAN: ${workspace.branding.slogan}`)
    }
    
    if (workspace.branding.description) {
      contextParts.push(`DESCRIPCIÓN: ${workspace.branding.description}`)
    }
    
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
    
    return contextParts.join('\n')
  }

  /**
   * Crea metadata de generación con información detallada del proceso
   */
  private createGenerationMetadata(
    params: TextOnlyGenerationParams,
    textResult: TextGenerationResult,
    startTime: number
  ): GenerationMetadata {
    return {
      agentUsed: 'text-only',
      textPrompt: textResult.metadata.prompt,
      templateUsed: undefined, // No se usa template en texto simple
      resourcesUsed: [], // No se usan recursos en texto simple
      generationTime: new Date(),
      retryCount: textResult.metadata.retryCount,
      processingTimeMs: Date.now() - startTime
    }
  }

  /**
   * Valida que el texto generado cumple con los estándares de calidad
   */
  private validateGeneratedText(text: string, platform: SocialNetwork): void {
    // Validar que no esté vacío
    if (!text || text.trim().length === 0) {
      throw new Error('Generated text is empty')
    }
    
    // Validar límites de caracteres
    if (!this.geminiTextService.validateTextLength(text, platform)) {
      const limit = this.geminiTextService.getPlatformLimit(platform)
      throw new Error(`Text exceeds platform limit: ${text.length}/${limit} characters`)
    }
    
    // Validar que no contenga placeholders sin reemplazar
    const placeholderPatterns = [
      /\[.*?\]/g, // [placeholder]
      /\{.*?\}/g, // {placeholder}
      /TODO/gi,   // TODO
      /PLACEHOLDER/gi // PLACEHOLDER
    ]
    
    for (const pattern of placeholderPatterns) {
      if (pattern.test(text)) {
        throw new Error('Generated text contains unresolved placeholders')
      }
    }
  }

  /**
   * Regenera contenido con parámetros ajustados
   */
  async regenerate(
    params: TextOnlyGenerationParams,
    previousAttempt?: string,
    feedback?: string
  ): Promise<TextOnlyGenerationResult> {
    // Agregar feedback al contexto adicional si se proporciona
    let enhancedParams = { ...params }
    
    if (feedback || previousAttempt) {
      const originalContext = this.buildAdditionalContext(params.workspace, params.contentPlan)
      let enhancedContext = originalContext
      
      if (previousAttempt) {
        enhancedContext += `\n\nINTENTO ANTERIOR (MEJORAR): ${previousAttempt}`
      }
      
      if (feedback) {
        enhancedContext += `\n\nFEEDBACK DEL USUARIO: ${feedback}`
      }
      
      // Crear una copia modificada del contentPlan con contexto mejorado
      enhancedParams = {
        ...params,
        contentPlan: {
          ...params.contentPlan,
          notes: enhancedContext
        }
      }
    }
    
    return this.generate(enhancedParams)
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
  } {
    return {
      name: 'TextOnlyAgent',
      type: 'text-only',
      supportedPlatforms: ['instagram', 'linkedin', 'twitter', 'facebook'],
      capabilities: [
        'Generación de texto optimizado por plataforma',
        'Respeto de límites de caracteres',
        'Integración con brand manual',
        'Prompts de calidad extrema',
        'Regeneración con feedback',
        'Validación automática de calidad'
      ],
      limitations: [
        'Solo genera contenido de texto',
        'No maneja imágenes o elementos visuales',
        'Requiere descripción clara del contenido',
        'Dependiente de la calidad del brand manual'
      ]
    }
  }

  /**
   * Verifica si el agente puede manejar el tipo de contenido
   */
  canHandle(contentType: string): boolean {
    return contentType === 'text-only'
  }

  /**
   * Estima el tiempo de procesamiento
   */
  estimateProcessingTime(contentPlan: ContentPlanItem): number {
    // Tiempo base en milisegundos
    let baseTime = 3000 // 3 segundos base
    
    // Ajustar según la complejidad del contenido
    const descriptionLength = contentPlan.description.length
    if (descriptionLength > 200) {
      baseTime += 1000 // +1 segundo para descripciones largas
    }
    
    // Ajustar según la plataforma (Twitter requiere más precisión)
    if (contentPlan.socialNetwork === 'twitter' as any) {
      baseTime += 500 // +0.5 segundos para Twitter
    }
    
    // Ajustar según prioridad
    if (contentPlan.priority === 'high') {
      baseTime += 1000 // +1 segundo para alta prioridad (más iteraciones)
    }
    
    return baseTime
  }
}

/**
 * Factory function para crear instancia del agente
 */
export function createTextOnlyAgent(): TextOnlyAgent {
  try {
    return new TextOnlyAgent()
  } catch (error) {
    console.error('❌ Error creando TextOnlyAgent:', error)
    throw error
  }
}