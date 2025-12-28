import { GeminiTextService, TemplateTextGenerationParams } from '../services/GeminiTextService'
import { GeminiImageService, TemplateImageGenerationParams } from '../services/GeminiImageService'
import { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from './types'
import { GenerationMetadata, SocialNetwork, BrandManual } from '../../database/types'

export interface TextTemplateGenerationParams {
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
  resources: ResourceData[]
  template: TemplateData
  brandManual?: BrandManual
}

export interface TextTemplateGenerationResult {
  text: string
  imageUrl: string
  templateTexts: Record<string, string>
  metadata: GenerationMetadata
}

/**
 * Agente especializado en generación de contenido de texto + imagen con diseño usando templates
 * Toma idea de publicación y genera imagen base según requerimientos y recurso
 * Genera texto según requerimientos del posteo y descripción del template
 * Genera textos internos si el template los requiere
 * Crea imagen final combinando imagen base, textos internos y template
 */
export class TextTemplateAgent {
  private geminiTextService: GeminiTextService
  private geminiImageService: GeminiImageService

  constructor() {
    this.geminiTextService = new GeminiTextService()
    this.geminiImageService = new GeminiImageService()
  }

  /**
   * Genera contenido completo de texto + imagen con template
   */
  async generate(params: TextTemplateGenerationParams): Promise<TextTemplateGenerationResult> {
    const startTime = Date.now()
    
    try {
      // Validar parámetros de entrada
      this.validateParams(params)
      
      // Seleccionar recurso base para la imagen
      const baseResource = this.selectBestResource(params.resources, params.contentPlan, params.template)
      
      // Analizar template para identificar áreas de texto
      const templateTextAreas = this.analyzeTemplateTextAreas(params.template)
      
      // Generar textos internos para el template
      const templateTexts = await this.generateTemplateTexts(params, templateTextAreas)
      
      // Generar imagen base usando el recurso seleccionado
      const baseImageResult = await this.generateBaseImage(params, baseResource)
      
      // Generar imagen final combinando imagen base, textos internos y template
      const finalImageResult = await this.generateFinalTemplateImage(
        params, 
        baseResource, 
        baseImageResult, 
        templateTexts
      )
      
      // Generar texto que acompañará la publicación final
      const publicationText = await this.generatePublicationText(params, finalImageResult, templateTexts)
      
      // Crear metadata de generación
      const metadata = this.createGenerationMetadata(params, publicationText, finalImageResult, templateTexts, startTime)
      
      return {
        text: publicationText.text,
        imageUrl: finalImageResult.imageUrl,
        templateTexts,
        metadata
      }
      
    } catch (error) {
      console.error('❌ Error in TextTemplateAgent generation:', error)
      throw new Error(`TextTemplateAgent generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Valida los parámetros de entrada
   */
  private validateParams(params: TextTemplateGenerationParams): void {
    if (!params.contentPlan) {
      throw new Error('ContentPlan is required')
    }
    
    if (!params.workspace) {
      throw new Error('Workspace data is required')
    }
    
    if (!params.resources || params.resources.length === 0) {
      throw new Error('At least one resource is required for TextTemplateAgent')
    }
    
    if (!params.template) {
      throw new Error('Template is required for TextTemplateAgent')
    }
    
    if (!params.contentPlan.description) {
      throw new Error('Content description is required')
    }
    
    if (!params.contentPlan.socialNetwork) {
      throw new Error('Social network is required')
    }
    
    if (params.contentPlan.contentType !== 'text-with-carousel' && 
        !params.contentPlan.contentType.includes('template')) {
      throw new Error(`Invalid content type for TextTemplateAgent: ${params.contentPlan.contentType}`)
    }

    // Validar que el template es compatible con la plataforma
    if (!params.template.socialNetworks.includes(params.contentPlan.socialNetwork)) {
      throw new Error(`Template ${params.template.name} is not compatible with ${params.contentPlan.socialNetwork}`)
    }

    // Validar que hay recursos de imagen disponibles
    const imageResources = params.resources.filter(r => r.type === 'image')
    if (imageResources.length === 0) {
      throw new Error('At least one image resource is required for TextTemplateAgent')
    }

    // Validar que el template es de tipo single (no carousel)
    if (params.template.type !== 'single') {
      throw new Error('TextTemplateAgent only handles single templates. Use CarouselAgent for carousel templates.')
    }
  }

  /**
   * Selecciona el mejor recurso base para la generación de imagen con template
   */
  private selectBestResource(
    resources: ResourceData[], 
    contentPlan: ContentPlanItem, 
    template: TemplateData
  ): ResourceData {
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

    // Estrategia de selección inteligente basada en el contenido y template
    const contentLower = contentPlan.description.toLowerCase()
    const templateName = template.name.toLowerCase()
    
    const scoredResources = imageResources.map(resource => {
      let score = 0
      const resourceName = resource.name.toLowerCase()
      
      // Puntuación por coincidencia con contenido
      const contentWords = contentLower.split(/\s+/).filter(word => word.length > 3)
      contentWords.forEach(word => {
        if (resourceName.includes(word)) {
          score += 10
        }
      })
      
      // Puntuación por coincidencia con template
      const templateWords = templateName.split(/\s+/).filter(word => word.length > 3)
      templateWords.forEach(word => {
        if (resourceName.includes(word)) {
          score += 15
        }
      })
      
      // Puntuación por tags si están disponibles
      if (contentPlan.tags) {
        contentPlan.tags.forEach(tag => {
          if (resourceName.includes(tag.toLowerCase())) {
            score += 12
          }
        })
      }
      
      // Puntuación por calidad y formato
      if (resource.mimeType === 'image/png') score += 3 // PNG mejor para templates
      if (resource.url.includes('high-res') || resource.url.includes('hd')) score += 5
      
      // Puntuación por compatibilidad con template (aspectos visuales)
      if (templateName.includes('profesional') && resourceName.includes('profesional')) score += 20
      if (templateName.includes('creativo') && resourceName.includes('creativo')) score += 20
      
      return { resource, score }
    })

    // Ordenar por puntuación y devolver el mejor
    scoredResources.sort((a, b) => b.score - a.score)
    
    return scoredResources[0].resource
  }

  /**
   * Analiza el template para identificar áreas de texto disponibles
   */
  private analyzeTemplateTextAreas(template: TemplateData): Array<{
    id: string
    name: string
    maxLength: number
    placeholder?: string
  }> {
    // En una implementación real, esto analizaría el template para identificar áreas de texto
    // Por ahora, simulamos áreas comunes basadas en el nombre y tipo del template
    
    const templateName = template.name.toLowerCase()
    const areas: Array<{ id: string; name: string; maxLength: number; placeholder?: string }> = []
    
    // Áreas comunes para templates de single image
    areas.push({
      id: 'title',
      name: 'Título Principal',
      maxLength: 50,
      placeholder: 'Título impactante'
    })
    
    // Áreas específicas según el tipo de template
    if (templateName.includes('promocion') || templateName.includes('oferta')) {
      areas.push({
        id: 'offer',
        name: 'Texto de Oferta',
        maxLength: 30,
        placeholder: '50% OFF'
      })
      areas.push({
        id: 'cta',
        name: 'Call to Action',
        maxLength: 25,
        placeholder: '¡Compra Ahora!'
      })
    } else if (templateName.includes('informativo') || templateName.includes('educativo')) {
      areas.push({
        id: 'subtitle',
        name: 'Subtítulo',
        maxLength: 80,
        placeholder: 'Información complementaria'
      })
      areas.push({
        id: 'description',
        name: 'Descripción',
        maxLength: 120,
        placeholder: 'Detalles importantes'
      })
    } else if (templateName.includes('evento') || templateName.includes('fecha')) {
      areas.push({
        id: 'date',
        name: 'Fecha',
        maxLength: 20,
        placeholder: '15 de Marzo'
      })
      areas.push({
        id: 'location',
        name: 'Ubicación',
        maxLength: 40,
        placeholder: 'Centro de Convenciones'
      })
    } else {
      // Template genérico
      areas.push({
        id: 'subtitle',
        name: 'Subtítulo',
        maxLength: 60,
        placeholder: 'Texto de apoyo'
      })
      areas.push({
        id: 'description',
        name: 'Descripción',
        maxLength: 100,
        placeholder: 'Información adicional'
      })
    }
    
    return areas
  }

  /**
   * Genera textos internos para las áreas del template
   */
  private async generateTemplateTexts(
    params: TextTemplateGenerationParams,
    textAreas: Array<{ id: string; name: string; maxLength: number; placeholder?: string }>
  ): Promise<Record<string, string>> {
    const { contentPlan, workspace, template, brandManual } = params
    
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
    
    // Preparar parámetros para generación de textos de template
    const templateTextParams: TemplateTextGenerationParams = {
      contentIdea: contentPlan.description,
      templateDescription: (template as any).description || `Template ${template.name} para ${template.type}`,
      textAreas,
      brandManual: defaultBrandManual
    }
    
    try {
      const result = await this.geminiTextService.generateTemplateTexts(templateTextParams)
      return result.texts
    } catch (error) {
      console.error('Error generating template texts:', error)
      throw new Error(`Failed to generate template texts: ${error}`)
    }
  }

  /**
   * Genera imagen base usando el recurso seleccionado
   */
  private async generateBaseImage(
    params: TextTemplateGenerationParams,
    baseResource: ResourceData
  ): Promise<{ imageUrl: string; metadata: any }> {
    const { contentPlan } = params
    
    // Para templates, primero generamos una imagen base optimizada
    const imageParams = {
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
        sizeBytes: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      platform: contentPlan.socialNetwork as SocialNetwork,
      style: 'professional' as const, // Templates suelen ser más profesionales
      aspectRatio: this.determineAspectRatio(contentPlan.socialNetwork)
    }
    
    try {
      const result = await this.geminiImageService.generateSimpleImage(imageParams)
      
      return {
        imageUrl: result.imageUrl,
        metadata: result.metadata
      }
    } catch (error) {
      console.error('Error generating base image:', error)
      throw new Error(`Failed to generate base image: ${error}`)
    }
  }

  /**
   * Genera imagen final combinando imagen base, textos internos y template
   */
  private async generateFinalTemplateImage(
    params: TextTemplateGenerationParams,
    baseResource: ResourceData,
    baseImageResult: { imageUrl: string; metadata: any },
    templateTexts: Record<string, string>
  ): Promise<{ imageUrl: string; metadata: any }> {
    const { contentPlan, template } = params
    
    // Preparar parámetros para generación de imagen con template
    const templateImageParams: TemplateImageGenerationParams = {
      contentIdea: contentPlan.description,
      template: {
        id: template.id,
        workspaceId: 'temp',
        name: template.name,
        type: template.type,
        images: template.images,
        socialNetworks: template.socialNetworks as SocialNetwork[],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      baseResource: {
        id: baseResource.id,
        workspaceId: 'temp',
        name: baseResource.name,
        originalName: baseResource.name,
        filePath: baseImageResult.imageUrl,
        url: baseImageResult.imageUrl, // Usar la imagen base generada
        type: baseResource.type,
        mimeType: baseResource.mimeType,
        sizeBytes: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      textOverlays: templateTexts,
      platform: contentPlan.socialNetwork as SocialNetwork
    }
    
    try {
      const result = await this.geminiImageService.generateTemplateImage(templateImageParams)
      
      return {
        imageUrl: result.imageUrl,
        metadata: result.metadata
      }
    } catch (error) {
      console.error('Error generating final template image:', error)
      throw new Error(`Failed to generate final template image: ${error}`)
    }
  }

  /**
   * Genera texto que acompañará la publicación final
   */
  private async generatePublicationText(
    params: TextTemplateGenerationParams,
    finalImageResult: { imageUrl: string; metadata: any },
    templateTexts: Record<string, string>
  ): Promise<{ text: string; metadata: any }> {
    const { contentPlan, workspace, template, brandManual } = params
    
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
    
    // Construir contexto adicional que incluya información del template y textos generados
    const additionalContext = this.buildPublicationTextContext(
      workspace, 
      contentPlan, 
      template, 
      templateTexts, 
      finalImageResult
    )
    
    // Preparar parámetros para generación de texto de publicación
    const textParams = {
      contentIdea: contentPlan.description,
      platform: contentPlan.socialNetwork as SocialNetwork,
      brandManual: defaultBrandManual,
      contentType: 'text_image_template' as const,
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
      console.error('Error generating publication text:', error)
      throw new Error(`Failed to generate publication text: ${error}`)
    }
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
   * Construye contexto adicional para generación de texto de publicación
   */
  private buildPublicationTextContext(
    workspace: WorkspaceData,
    contentPlan: ContentPlanItem,
    template: TemplateData,
    templateTexts: Record<string, string>,
    finalImageResult: { imageUrl: string; metadata: any }
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
    
    // Información del template usado
    contextParts.push(`TEMPLATE USADO: ${template.name}`)
    contextParts.push(`TIPO DE TEMPLATE: ${template.type}`)
    
    // Información de los textos internos generados
    contextParts.push(`TEXTOS EN LA IMAGEN:`)
    Object.entries(templateTexts).forEach(([area, text]) => {
      contextParts.push(`• ${area}: "${text}"`)
    })
    
    // Información de la imagen final
    contextParts.push(`IMAGEN FINAL: Se ha creado una imagen profesional usando template con textos integrados`)
    contextParts.push(`ESTILO DE IMAGEN: ${finalImageResult.metadata.parameters?.style || 'profesional con template'}`)
    
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
    
    // Instrucciones específicas para texto con template
    contextParts.push(`INSTRUCCIÓN ESPECIAL: El texto debe complementar la imagen con template sin repetir los textos internos`)
    contextParts.push(`OBJETIVO: Crear texto de publicación que amplifique el mensaje del template`)
    contextParts.push(`EVITAR: No repetir exactamente los textos que ya están en la imagen`)
    
    return contextParts.join('\n')
  }

  /**
   * Crea metadata de generación con información detallada del proceso
   */
  private createGenerationMetadata(
    params: TextTemplateGenerationParams,
    publicationText: { text: string; metadata: any },
    finalImageResult: { imageUrl: string; metadata: any },
    templateTexts: Record<string, string>,
    startTime: number
  ): GenerationMetadata {
    return {
      agentUsed: 'text-template',
      textPrompt: publicationText.metadata.prompt,
      imagePrompt: finalImageResult.metadata.prompt,
      templateUsed: params.template.id,
      resourcesUsed: params.resources.map(r => r.id),
      generationTime: new Date(),
      retryCount: Math.max(
        publicationText.metadata.retryCount || 0, 
        finalImageResult.metadata.retryCount || 0
      ),
      processingTimeMs: Date.now() - startTime
    }
  }

  /**
   * Regenera contenido con parámetros ajustados
   */
  async regenerate(
    params: TextTemplateGenerationParams,
    previousAttempt?: { 
      text?: string
      imageUrl?: string
      templateTexts?: Record<string, string>
    },
    feedback?: string,
    regenerateComponents: {
      templateTexts?: boolean
      image?: boolean
      publicationText?: boolean
    } = { templateTexts: true, image: true, publicationText: true }
  ): Promise<TextTemplateGenerationResult> {
    const startTime = Date.now()
    
    try {
      let templateTexts: Record<string, string>
      let finalImageResult: { imageUrl: string; metadata: any }
      let publicationText: { text: string; metadata: any }
      
      const baseResource = this.selectBestResource(params.resources, params.contentPlan, params.template)
      const templateTextAreas = this.analyzeTemplateTextAreas(params.template)
      
      // Regenerar textos de template si se solicita
      if (regenerateComponents.templateTexts) {
        let enhancedParams = { ...params }
        if (feedback && previousAttempt?.templateTexts) {
          enhancedParams.contentPlan = {
            ...params.contentPlan,
            notes: (params.contentPlan.notes || '') + 
              `\n\nFEEDBACK PARA TEXTOS DE TEMPLATE: ${feedback}\nTEXTOS ANTERIORES: ${JSON.stringify(previousAttempt.templateTexts)}`
          }
        }
        
        templateTexts = await this.generateTemplateTexts(enhancedParams, templateTextAreas)
      } else if (previousAttempt?.templateTexts) {
        templateTexts = previousAttempt.templateTexts
      } else {
        throw new Error('Cannot regenerate without template texts')
      }
      
      // Regenerar imagen si se solicita
      if (regenerateComponents.image) {
        const baseImageResult = await this.generateBaseImage(params, baseResource)
        finalImageResult = await this.generateFinalTemplateImage(params, baseResource, baseImageResult, templateTexts)
      } else if (previousAttempt?.imageUrl) {
        finalImageResult = {
          imageUrl: previousAttempt.imageUrl,
          metadata: { prompt: 'Previous image reused', parameters: {} }
        }
      } else {
        throw new Error('Cannot regenerate without image')
      }
      
      // Regenerar texto de publicación si se solicita
      if (regenerateComponents.publicationText) {
        let enhancedParams = { ...params }
        if (feedback && previousAttempt?.text) {
          const originalContext = this.buildPublicationTextContext(
            params.workspace, 
            params.contentPlan, 
            params.template, 
            templateTexts, 
            finalImageResult
          )
          const enhancedContext = originalContext + 
            `\n\nTEXTO ANTERIOR (MEJORAR): ${previousAttempt.text}\nFEEDBACK DEL USUARIO: ${feedback}`
          
          enhancedParams.contentPlan = {
            ...params.contentPlan,
            notes: enhancedContext
          }
        }
        
        publicationText = await this.generatePublicationText(enhancedParams, finalImageResult, templateTexts)
      } else if (previousAttempt?.text) {
        publicationText = {
          text: previousAttempt.text,
          metadata: { prompt: 'Previous text reused', retryCount: 0 }
        }
      } else {
        throw new Error('Cannot regenerate without publication text')
      }
      
      // Crear metadata de regeneración
      const metadata = this.createGenerationMetadata(params, publicationText, finalImageResult, templateTexts, startTime)
      metadata.retryCount += 1
      
      return {
        text: publicationText.text,
        imageUrl: finalImageResult.imageUrl,
        templateTexts,
        metadata
      }
      
    } catch (error) {
      console.error('❌ Error in TextTemplateAgent regeneration:', error)
      throw new Error(`TextTemplateAgent regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      name: 'TextTemplateAgent',
      type: 'text-template',
      supportedPlatforms: ['instagram', 'linkedin', 'twitter', 'facebook'],
      capabilities: [
        'Generación de imagen base desde recursos',
        'Análisis automático de áreas de texto en templates',
        'Generación de textos internos para template',
        'Combinación de imagen base + textos + template',
        'Generación de texto de publicación complementario',
        'Regeneración selectiva por componentes',
        'Integración con brand manual',
        'Optimización por plataforma social'
      ],
      limitations: [
        'Solo maneja templates de tipo single',
        'Requiere template compatible con la plataforma',
        'Tiempo de procesamiento alto (múltiples generaciones)',
        'Dependiente de calidad del template',
        'Requiere al menos un recurso de imagen'
      ],
      estimatedProcessingTime: '45-90 segundos'
    }
  }

  /**
   * Verifica si el agente puede manejar el tipo de contenido
   */
  canHandle(contentType: string, templateType?: string): boolean {
    const validContentTypes = ['text-with-carousel', 'text-image-template']
    const isValidContentType = validContentTypes.some(type => contentType.includes(type))
    
    // Si se proporciona tipo de template, verificar que sea single
    if (templateType) {
      return isValidContentType && templateType === 'single'
    }
    
    return isValidContentType
  }

  /**
   * Estima el tiempo de procesamiento
   */
  estimateProcessingTime(
    contentPlan: ContentPlanItem, 
    template: TemplateData, 
    resourceCount: number
  ): number {
    // Tiempo base en milisegundos
    let baseTime = 45000 // 45 segundos base (textos template + imagen base + imagen final + texto publicación)
    
    // Ajustar según la complejidad del contenido
    const descriptionLength = contentPlan.description.length
    if (descriptionLength > 200) {
      baseTime += 10000 // +10 segundos para descripciones largas
    }
    
    // Ajustar según complejidad del template
    const templateName = template.name.toLowerCase()
    if (templateName.includes('complejo') || templateName.includes('avanzado')) {
      baseTime += 15000 // +15 segundos para templates complejos
    }
    
    // Ajustar según número de recursos
    if (resourceCount > 5) {
      baseTime += 5000 // +5 segundos para muchos recursos
    }
    
    // Ajustar según la plataforma
    if (contentPlan.socialNetwork === 'instagram') {
      baseTime += 5000 // +5 segundos para Instagram (más exigente visualmente)
    }
    
    // Ajustar según prioridad
    if (contentPlan.priority === 'high') {
      baseTime += 10000 // +10 segundos para alta prioridad
    }
    
    return baseTime
  }

  /**
   * Valida que el template y recursos sean compatibles
   */
  validateTemplateAndResources(
    template: TemplateData, 
    resources: ResourceData[], 
    platform: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Validar compatibilidad de template con plataforma
    if (!template.socialNetworks.includes(platform)) {
      errors.push(`Template ${template.name} is not compatible with ${platform}`)
    }
    
    // Validar que el template es de tipo single
    if (template.type !== 'single') {
      errors.push(`TextTemplateAgent only supports single templates, got: ${template.type}`)
    }
    
    // Validar recursos de imagen
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
export function createTextTemplateAgent(): TextTemplateAgent {
  try {
    return new TextTemplateAgent()
  } catch (error) {
    console.error('❌ Error creando TextTemplateAgent:', error)
    throw error
  }
}