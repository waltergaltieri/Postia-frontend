import { GeminiTextService, TemplateTextGenerationParams } from '../services/GeminiTextService'
import { GeminiImageService, CarouselGenerationParams as GeminiCarouselParams } from '../services/GeminiImageService'
import { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from './types'
import { GenerationMetadata, SocialNetwork, BrandManual } from '../../database/types'

export interface CarouselAgentGenerationParams {
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
  resources: ResourceData[]
  template: TemplateData
  brandManual?: BrandManual
}

export interface CarouselGenerationResult {
  text: string
  imageUrls: string[]
  templateTexts: Record<string, string>[]
  metadata: GenerationMetadata
}

/**
 * Agente especializado en generación de contenido de texto + imagen con diseño en carrusel
 * Toma idea y genera imágenes base para cada slide según requerimientos
 * Genera texto según requerimientos y descripción del template de carrusel
 * Genera textos internos respetando orden y coherencia entre diseños
 * Crea imágenes finales manteniendo coherencia y orden del template
 * Genera texto que acompañará el posteo del carrusel
 */
export class CarouselAgent {
  private geminiTextService: GeminiTextService
  private geminiImageService: GeminiImageService

  constructor() {
    this.geminiTextService = new GeminiTextService()
    this.geminiImageService = new GeminiImageService()
  }

  /**
   * Genera contenido completo de carrusel con múltiples imágenes coherentes
   */
  async generate(params: CarouselAgentGenerationParams): Promise<CarouselGenerationResult> {
    const startTime = Date.now()
    
    try {
      // Validar parámetros de entrada
      this.validateParams(params)
      
      // Determinar número de slides del carrusel
      const slideCount = this.determineSlideCount(params.template, params.resources)
      
      // Seleccionar recursos base para cada slide
      const selectedResources = this.selectResourcesForSlides(params.resources, params.contentPlan, slideCount)
      
      // Analizar template para identificar áreas de texto por slide
      const templateTextAreas = this.analyzeCarouselTemplateTextAreas(params.template, slideCount)
      
      // Generar secuencia de textos internos para todo el carrusel
      const carouselTextSequence = await this.generateCarouselTextSequence(params, templateTextAreas, slideCount)
      
      // Generar imágenes base para cada slide
      const baseImageResults = await this.generateBaseImagesForSlides(params, selectedResources)
      
      // Generar imágenes finales del carrusel con coherencia visual
      const finalCarouselResult = await this.generateFinalCarouselImages(
        params,
        selectedResources,
        baseImageResults,
        carouselTextSequence
      )
      
      // Generar texto que acompañará el posteo del carrusel
      const publicationText = await this.generateCarouselPublicationText(
        params, 
        finalCarouselResult, 
        carouselTextSequence
      )
      
      // Crear metadata de generación
      const metadata = this.createGenerationMetadata(
        params, 
        publicationText, 
        finalCarouselResult, 
        carouselTextSequence, 
        startTime
      )
      
      return {
        text: publicationText.text,
        imageUrls: finalCarouselResult.images.map(img => img.imageUrl),
        templateTexts: carouselTextSequence,
        metadata
      }
      
    } catch (error) {
      console.error('❌ Error in CarouselAgent generation:', error)
      throw new Error(`CarouselAgent generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Valida los parámetros de entrada
   */
  private validateParams(params: CarouselAgentGenerationParams): void {
    if (!params.contentPlan) {
      throw new Error('ContentPlan is required')
    }
    
    if (!params.workspace) {
      throw new Error('Workspace data is required')
    }
    
    if (!params.resources || params.resources.length === 0) {
      throw new Error('At least one resource is required for CarouselAgent')
    }
    
    if (!params.template) {
      throw new Error('Template is required for CarouselAgent')
    }
    
    if (!params.contentPlan.description) {
      throw new Error('Content description is required')
    }
    
    if (!params.contentPlan.socialNetwork) {
      throw new Error('Social network is required')
    }
    
    if (params.contentPlan.contentType !== 'text-with-carousel') {
      throw new Error(`Invalid content type for CarouselAgent: ${params.contentPlan.contentType}`)
    }

    // Validar que el template es compatible con la plataforma
    if (!params.template.socialNetworks.includes(params.contentPlan.socialNetwork)) {
      throw new Error(`Template ${params.template.name} is not compatible with ${params.contentPlan.socialNetwork}`)
    }

    // Validar que el template es de tipo carousel
    if (params.template.type !== 'carousel') {
      throw new Error('CarouselAgent only handles carousel templates. Use TextTemplateAgent for single templates.')
    }

    // Validar que hay suficientes recursos de imagen
    const imageResources = params.resources.filter(r => r.type === 'image')
    if (imageResources.length < 2) {
      throw new Error('At least 2 image resources are required for CarouselAgent')
    }

    // Validar plataforma soporta carruseles
    const carouselSupportedPlatforms = ['instagram', 'linkedin', 'facebook']
    if (!carouselSupportedPlatforms.includes(params.contentPlan.socialNetwork)) {
      throw new Error(`Carousel content is not supported on ${params.contentPlan.socialNetwork}`)
    }
  }

  /**
   * Determina el número óptimo de slides para el carrusel
   */
  private determineSlideCount(template: TemplateData, resources: ResourceData[]): number {
    const imageResources = resources.filter(r => r.type === 'image')
    
    // Límites por plataforma
    const platformLimits = {
      instagram: 10,
      linkedin: 20,
      facebook: 10
    }
    
    // Número óptimo basado en template y recursos disponibles
    let optimalCount = Math.min(
      template.images.length || 5, // Usar número de imágenes del template
      imageResources.length,      // No más que recursos disponibles
      5                          // Máximo recomendado para engagement
    )
    
    // Mínimo 2 slides para carrusel
    optimalCount = Math.max(optimalCount, 2)
    
    return optimalCount
  }

  /**
   * Selecciona recursos para cada slide del carrusel
   */
  private selectResourcesForSlides(
    resources: ResourceData[], 
    contentPlan: ContentPlanItem, 
    slideCount: number
  ): ResourceData[] {
    const imageResources = resources.filter(r => r.type === 'image')
    
    if (imageResources.length < slideCount) {
      throw new Error(`Not enough image resources for ${slideCount} slides`)
    }

    // Si hay recursos específicos asignados, usar esos primero
    let selectedResources: ResourceData[] = []
    
    if (contentPlan.resourceIds && contentPlan.resourceIds.length > 0) {
      const assignedResources = imageResources.filter(r => contentPlan.resourceIds.includes(r.id))
      selectedResources = assignedResources.slice(0, slideCount)
    }
    
    // Si no hay suficientes recursos asignados, completar con selección inteligente
    if (selectedResources.length < slideCount) {
      const remainingResources = imageResources.filter(r => !selectedResources.includes(r))
      const additionalNeeded = slideCount - selectedResources.length
      
      // Estrategia de selección inteligente para carrusel
      const scoredResources = this.scoreResourcesForCarousel(remainingResources, contentPlan)
      const additionalResources = scoredResources.slice(0, additionalNeeded).map(sr => sr.resource)
      
      selectedResources = [...selectedResources, ...additionalResources]
    }
    
    return selectedResources.slice(0, slideCount)
  }

  /**
   * Puntúa recursos para selección inteligente en carrusel
   */
  private scoreResourcesForCarousel(
    resources: ResourceData[], 
    contentPlan: ContentPlanItem
  ): Array<{ resource: ResourceData; score: number }> {
    const contentLower = contentPlan.description.toLowerCase()
    
    const scoredResources = resources.map(resource => {
      let score = 0
      const resourceName = resource.name.toLowerCase()
      
      // Puntuación por coincidencia con contenido
      const contentWords = contentLower.split(/\s+/).filter(word => word.length > 3)
      contentWords.forEach(word => {
        if (resourceName.includes(word)) {
          score += 10
        }
      })
      
      // Puntuación por tags
      if (contentPlan.tags) {
        contentPlan.tags.forEach(tag => {
          if (resourceName.includes(tag.toLowerCase())) {
            score += 15
          }
        })
      }
      
      // Puntuación por calidad y formato (PNG mejor para carruseles)
      if (resource.mimeType === 'image/png') score += 5
      if (resource.url.includes('high-res') || resource.url.includes('hd')) score += 8
      
      // Puntuación por diversidad (evitar recursos muy similares)
      const diversityBonus = this.calculateResourceDiversity(resource, resources)
      score += diversityBonus
      
      return { resource, score }
    })

    // Ordenar por puntuación descendente
    return scoredResources.sort((a, b) => b.score - a.score)
  }

  /**
   * Calcula bonus de diversidad para evitar recursos muy similares
   */
  private calculateResourceDiversity(resource: ResourceData, allResources: ResourceData[]): number {
    // Simulación simple de diversidad basada en nombres
    const resourceWords = resource.name.toLowerCase().split(/\s+/)
    let diversityScore = 5 // Base score
    
    allResources.forEach(otherResource => {
      if (otherResource.id !== resource.id) {
        const otherWords = otherResource.name.toLowerCase().split(/\s+/)
        const commonWords = resourceWords.filter(word => otherWords.includes(word))
        
        // Penalizar recursos muy similares
        if (commonWords.length > 2) {
          diversityScore -= 2
        }
      }
    })
    
    return Math.max(diversityScore, 0)
  }

  /**
   * Analiza el template de carrusel para identificar áreas de texto por slide
   */
  private analyzeCarouselTemplateTextAreas(
    template: TemplateData, 
    slideCount: number
  ): Array<Array<{ id: string; name: string; maxLength: number; placeholder?: string }>> {
    const templateName = template.name.toLowerCase()
    const slidesTextAreas: Array<Array<{ id: string; name: string; maxLength: number; placeholder?: string }>> = []
    
    // Generar áreas de texto para cada slide
    for (let slideIndex = 0; slideIndex < slideCount; slideIndex++) {
      const slideAreas: Array<{ id: string; name: string; maxLength: number; placeholder?: string }> = []
      
      // Áreas comunes para todos los slides
      slideAreas.push({
        id: `slide_${slideIndex}_title`,
        name: `Título Slide ${slideIndex + 1}`,
        maxLength: 40,
        placeholder: `Título para slide ${slideIndex + 1}`
      })
      
      // Áreas específicas según el tipo de template y posición del slide
      if (slideIndex === 0) {
        // Primer slide - Introducción
        slideAreas.push({
          id: `slide_${slideIndex}_intro`,
          name: 'Introducción',
          maxLength: 60,
          placeholder: 'Presentación del tema'
        })
      } else if (slideIndex === slideCount - 1) {
        // Último slide - Call to Action
        slideAreas.push({
          id: `slide_${slideIndex}_cta`,
          name: 'Call to Action',
          maxLength: 30,
          placeholder: '¡Actúa ahora!'
        })
      } else {
        // Slides intermedios - Contenido
        slideAreas.push({
          id: `slide_${slideIndex}_content`,
          name: `Contenido ${slideIndex + 1}`,
          maxLength: 80,
          placeholder: `Punto clave ${slideIndex + 1}`
        })
      }
      
      // Áreas específicas según el tipo de template
      if (templateName.includes('educativo') || templateName.includes('tutorial')) {
        slideAreas.push({
          id: `slide_${slideIndex}_step`,
          name: `Paso ${slideIndex + 1}`,
          maxLength: 25,
          placeholder: `Paso ${slideIndex + 1}`
        })
      } else if (templateName.includes('promocion') || templateName.includes('oferta')) {
        if (slideIndex < slideCount - 1) {
          slideAreas.push({
            id: `slide_${slideIndex}_benefit`,
            name: `Beneficio ${slideIndex + 1}`,
            maxLength: 50,
            placeholder: `Beneficio clave ${slideIndex + 1}`
          })
        }
      }
      
      slidesTextAreas.push(slideAreas)
    }
    
    return slidesTextAreas
  }

  /**
   * Genera secuencia coherente de textos para todo el carrusel
   */
  private async generateCarouselTextSequence(
    params: CarouselAgentGenerationParams,
    templateTextAreas: Array<Array<{ id: string; name: string; maxLength: number; placeholder?: string }>>,
    slideCount: number
  ): Promise<Record<string, string>[]> {
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
    
    const carouselTextSequence: Record<string, string>[] = []
    
    // Generar textos para cada slide manteniendo coherencia narrativa
    for (let slideIndex = 0; slideIndex < slideCount; slideIndex++) {
      const slideTextAreas = templateTextAreas[slideIndex]
      
      // Construir contexto específico para este slide
      const slideContext = this.buildSlideContext(
        contentPlan, 
        template, 
        slideIndex, 
        slideCount, 
        carouselTextSequence
      )
      
      // Preparar parámetros para generación de textos del slide
      const slideTextParams: TemplateTextGenerationParams = {
        contentIdea: contentPlan.description,
        templateDescription: `${(template as any).description || template.name} - Slide ${slideIndex + 1} de ${slideCount}`,
        textAreas: slideTextAreas,
        brandManual: defaultBrandManual
      }
      
      try {
        const slideTexts = await this.geminiTextService.generateTemplateTexts(slideTextParams)
        carouselTextSequence.push(slideTexts.texts)
      } catch (error) {
        console.error(`Error generating texts for slide ${slideIndex + 1}:`, error)
        throw new Error(`Failed to generate texts for slide ${slideIndex + 1}: ${error}`)
      }
    }
    
    return carouselTextSequence
  }

  /**
   * Construye contexto específico para un slide del carrusel
   */
  private buildSlideContext(
    contentPlan: ContentPlanItem,
    template: TemplateData,
    slideIndex: number,
    totalSlides: number,
    previousSlides: Record<string, string>[]
  ): string {
    const contextParts = []
    
    // Información del carrusel
    contextParts.push(`CARRUSEL: Slide ${slideIndex + 1} de ${totalSlides}`)
    contextParts.push(`TEMPLATE: ${template.name}`)
    
    // Contexto de posición en el carrusel
    if (slideIndex === 0) {
      contextParts.push(`POSICIÓN: Slide de INTRODUCCIÓN - Debe capturar atención y presentar el tema`)
    } else if (slideIndex === totalSlides - 1) {
      contextParts.push(`POSICIÓN: Slide FINAL - Debe incluir call-to-action y cerrar el mensaje`)
    } else {
      contextParts.push(`POSICIÓN: Slide INTERMEDIO ${slideIndex + 1} - Debe desarrollar el contenido y mantener interés`)
    }
    
    // Información de slides anteriores para mantener coherencia
    if (previousSlides.length > 0) {
      contextParts.push(`SLIDES ANTERIORES:`)
      previousSlides.forEach((slideTexts, index) => {
        const slideTitle = Object.values(slideTexts)[0] || `Slide ${index + 1}`
        contextParts.push(`• Slide ${index + 1}: ${slideTitle}`)
      })
      contextParts.push(`COHERENCIA: Mantener narrativa coherente con slides anteriores`)
    }
    
    // Información del contenido
    if (contentPlan.tags && contentPlan.tags.length > 0) {
      contextParts.push(`TAGS: ${contentPlan.tags.join(', ')}`)
    }
    
    return contextParts.join('\n')
  }

  /**
   * Genera imágenes base para cada slide del carrusel
   */
  private async generateBaseImagesForSlides(
    params: CarouselAgentGenerationParams,
    selectedResources: ResourceData[]
  ): Promise<Array<{ imageUrl: string; metadata: any }>> {
    const { contentPlan } = params
    const baseImageResults: Array<{ imageUrl: string; metadata: any }> = []
    
    // Generar imagen base para cada slide
    for (let slideIndex = 0; slideIndex < selectedResources.length; slideIndex++) {
      const resource = selectedResources[slideIndex]
      
      // Contexto específico para este slide
      const slideContentIdea = `${contentPlan.description} - Slide ${slideIndex + 1} de ${selectedResources.length}`
      
      const imageParams = {
        contentIdea: slideContentIdea,
        baseResource: {
          id: resource.id,
          workspaceId: 'temp',
          name: resource.name,
          originalName: resource.name,
          filePath: resource.url,
          url: resource.url,
          type: resource.type,
          mimeType: resource.mimeType,
          sizeBytes: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        platform: contentPlan.socialNetwork as SocialNetwork,
        style: 'professional' as const, // Carruseles suelen ser más profesionales
        aspectRatio: this.determineAspectRatio(contentPlan.socialNetwork)
      }
      
      try {
        const result = await this.geminiImageService.generateSimpleImage(imageParams)
        baseImageResults.push({
          imageUrl: result.imageUrl,
          metadata: result.metadata
        })
      } catch (error) {
        console.error(`Error generating base image for slide ${slideIndex + 1}:`, error)
        throw new Error(`Failed to generate base image for slide ${slideIndex + 1}: ${error}`)
      }
    }
    
    return baseImageResults
  }

  /**
   * Genera imágenes finales del carrusel con coherencia visual extrema
   */
  private async generateFinalCarouselImages(
    params: CarouselAgentGenerationParams,
    selectedResources: ResourceData[],
    baseImageResults: Array<{ imageUrl: string; metadata: any }>,
    carouselTextSequence: Record<string, string>[]
  ): Promise<{ images: Array<{ imageUrl: string; metadata: any }>; coherenceScore: number }> {
    const { contentPlan, template } = params
    
    // Preparar parámetros para generación de carrusel
    const carouselParams: GeminiCarouselParams = {
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
      baseResources: selectedResources.map((resource, index) => ({
        id: resource.id,
        workspaceId: 'temp',
        name: resource.name,
        originalName: resource.name,
        filePath: baseImageResults[index].imageUrl,
        url: baseImageResults[index].imageUrl, // Usar imágenes base generadas
        type: resource.type,
        mimeType: resource.mimeType,
        sizeBytes: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      textSequences: carouselTextSequence,
      platform: contentPlan.socialNetwork as SocialNetwork
    }
    
    try {
      const result = await this.geminiImageService.generateCarousel(carouselParams)
      
      return {
        images: result.images,
        coherenceScore: result.coherenceScore
      }
    } catch (error) {
      console.error('Error generating final carousel images:', error)
      throw new Error(`Failed to generate final carousel images: ${error}`)
    }
  }

  /**
   * Genera texto que acompañará el posteo del carrusel
   */
  private async generateCarouselPublicationText(
    params: CarouselAgentGenerationParams,
    finalCarouselResult: { images: Array<{ imageUrl: string; metadata: any }>; coherenceScore: number },
    carouselTextSequence: Record<string, string>[]
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
    
    // Construir contexto adicional que incluya información del carrusel
    const additionalContext = this.buildCarouselPublicationTextContext(
      workspace, 
      contentPlan, 
      template, 
      carouselTextSequence, 
      finalCarouselResult
    )
    
    // Preparar parámetros para generación de texto de publicación
    const textParams = {
      contentIdea: contentPlan.description,
      platform: contentPlan.socialNetwork as SocialNetwork,
      brandManual: defaultBrandManual,
      contentType: 'carousel' as const,
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
      console.error('Error generating carousel publication text:', error)
      throw new Error(`Failed to generate carousel publication text: ${error}`)
    }
  }

  /**
   * Determina la relación de aspecto basada en la plataforma
   */
  private determineAspectRatio(platform: string): 'square' | 'landscape' | 'portrait' | 'story' {
    const aspectRatios = {
      instagram: 'square' as const,
      linkedin: 'landscape' as const,
      facebook: 'landscape' as const
    }
    
    return aspectRatios[platform as keyof typeof aspectRatios] || 'square'
  }

  /**
   * Construye contexto adicional para generación de texto de publicación del carrusel
   */
  private buildCarouselPublicationTextContext(
    workspace: WorkspaceData,
    contentPlan: ContentPlanItem,
    template: TemplateData,
    carouselTextSequence: Record<string, string>[],
    finalCarouselResult: { images: Array<{ imageUrl: string; metadata: any }>; coherenceScore: number }
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
    
    // Información del carrusel
    contextParts.push(`CARRUSEL: ${finalCarouselResult.images.length} slides con template ${template.name}`)
    contextParts.push(`COHERENCIA VISUAL: ${(finalCarouselResult.coherenceScore * 100).toFixed(1)}%`)
    
    // Resumen de contenido del carrusel
    contextParts.push(`CONTENIDO DEL CARRUSEL:`)
    carouselTextSequence.forEach((slideTexts, index) => {
      const slideTitle = Object.values(slideTexts)[0] || `Slide ${index + 1}`
      contextParts.push(`• Slide ${index + 1}: ${slideTitle}`)
    })
    
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
    
    // Instrucciones específicas para texto de carrusel
    contextParts.push(`INSTRUCCIÓN ESPECIAL: El texto debe invitar a deslizar y explorar todo el carrusel`)
    contextParts.push(`OBJETIVO: Crear texto que genere curiosidad por ver todos los slides`)
    contextParts.push(`FORMATO CARRUSEL: Mencionar que hay múltiples slides con información valiosa`)
    contextParts.push(`ENGAGEMENT: Incluir elementos que motiven a interactuar con el carrusel completo`)
    
    return contextParts.join('\n')
  }

  /**
   * Crea metadata de generación con información detallada del proceso
   */
  private createGenerationMetadata(
    params: CarouselAgentGenerationParams,
    publicationText: { text: string; metadata: any },
    finalCarouselResult: { images: Array<{ imageUrl: string; metadata: any }>; coherenceScore: number },
    carouselTextSequence: Record<string, string>[],
    startTime: number
  ): GenerationMetadata {
    return {
      agentUsed: 'carousel',
      textPrompt: publicationText.metadata.prompt,
      imagePrompt: finalCarouselResult.images[0]?.metadata.prompt || 'Carousel generation prompt',
      templateUsed: params.template.id,
      resourcesUsed: params.resources.map(r => r.id),
      generationTime: new Date(),
      retryCount: Math.max(
        publicationText.metadata.retryCount || 0,
        ...finalCarouselResult.images.map(img => img.metadata.retryCount || 0)
      ),
      processingTimeMs: Date.now() - startTime
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
      name: 'CarouselAgent',
      type: 'carousel',
      supportedPlatforms: ['instagram', 'linkedin', 'facebook'],
      capabilities: [
        'Generación de múltiples imágenes coherentes',
        'Secuencia narrativa coherente entre slides',
        'Análisis automático de áreas de texto por slide',
        'Generación de textos internos para cada slide',
        'Coherencia visual extrema entre imágenes',
        'Selección inteligente de recursos por slide',
        'Generación de texto de publicación optimizado para carrusel',
        'Integración con brand manual',
        'Optimización por plataforma social'
      ],
      limitations: [
        'Solo maneja templates de tipo carousel',
        'Requiere mínimo 2 recursos de imagen',
        'Tiempo de procesamiento muy alto (múltiples generaciones)',
        'Solo soportado en Instagram, LinkedIn y Facebook',
        'Dependiente de calidad del template de carrusel',
        'Requiere coherencia visual compleja'
      ],
      estimatedProcessingTime: '90-180 segundos'
    }
  }

  /**
   * Verifica si el agente puede manejar el tipo de contenido
   */
  canHandle(contentType: string, templateType?: string): boolean {
    const isCarouselContent = contentType === 'text-with-carousel'
    
    // Si se proporciona tipo de template, verificar que sea carousel
    if (templateType) {
      return isCarouselContent && templateType === 'carousel'
    }
    
    return isCarouselContent
  }

  /**
   * Estima el tiempo de procesamiento
   */
  estimateProcessingTime(
    contentPlan: ContentPlanItem, 
    template: TemplateData, 
    resourceCount: number
  ): number {
    const slideCount = this.determineSlideCount(template, [])
    
    // Tiempo base en milisegundos por slide
    let baseTimePerSlide = 20000 // 20 segundos por slide
    let baseTime = baseTimePerSlide * slideCount
    
    // Tiempo adicional para coherencia del carrusel
    baseTime += 30000 // +30 segundos para coherencia visual
    
    // Ajustar según la complejidad del contenido
    const descriptionLength = contentPlan.description.length
    if (descriptionLength > 200) {
      baseTime += slideCount * 5000 // +5 segundos por slide para descripciones largas
    }
    
    // Ajustar según complejidad del template
    const templateName = template.name.toLowerCase()
    if (templateName.includes('complejo') || templateName.includes('avanzado')) {
      baseTime += slideCount * 10000 // +10 segundos por slide para templates complejos
    }
    
    // Ajustar según número de recursos
    if (resourceCount > 10) {
      baseTime += 10000 // +10 segundos para muchos recursos
    }
    
    // Ajustar según la plataforma
    if (contentPlan.socialNetwork === 'instagram') {
      baseTime += slideCount * 3000 // +3 segundos por slide para Instagram
    }
    
    // Ajustar según prioridad
    if (contentPlan.priority === 'high') {
      baseTime += slideCount * 5000 // +5 segundos por slide para alta prioridad
    }
    
    return baseTime
  }

  /**
   * Valida que el template y recursos sean compatibles para carrusel
   */
  validateCarouselTemplateAndResources(
    template: TemplateData, 
    resources: ResourceData[], 
    platform: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Validar que la plataforma soporta carruseles
    const carouselSupportedPlatforms = ['instagram', 'linkedin', 'facebook']
    if (!carouselSupportedPlatforms.includes(platform)) {
      errors.push(`Carousel content is not supported on ${platform}`)
    }
    
    // Validar compatibilidad de template con plataforma
    if (!template.socialNetworks.includes(platform)) {
      errors.push(`Template ${template.name} is not compatible with ${platform}`)
    }
    
    // Validar que el template es de tipo carousel
    if (template.type !== 'carousel') {
      errors.push(`CarouselAgent only supports carousel templates, got: ${template.type}`)
    }
    
    // Validar recursos de imagen suficientes
    const imageResources = resources.filter(r => r.type === 'image')
    if (imageResources.length < 2) {
      errors.push('At least 2 image resources are required for carousel')
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
export function createCarouselAgent(): CarouselAgent {
  try {
    return new CarouselAgent()
  } catch (error) {
    console.error('❌ Error creando CarouselAgent:', error)
    throw error
  }
}