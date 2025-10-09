import { GeminiService, TemplateTextArea } from '../GeminiService'
import { NanoBananaService } from '../NanoBananaService'
import { 
  ContentGenerator, 
  ContentGenerationContext, 
  ContentGenerationResult, 
  PlatformLimits,
  PLATFORM_LIMITS 
} from './types'
import { SocialNetwork, Template } from '../../database/types'

export interface CarouselSlide {
  index: number
  text: string
  imageUrl: string
  textOverlays: Record<string, string>
  resourceId: string
}

export class CarouselContentGenerator implements ContentGenerator {
  private geminiService: GeminiService
  private nanoBananaService: NanoBananaService
  private retryAttempts: number = 3
  private retryDelay: number = 1000

  constructor(geminiService: GeminiService, nanoBananaService: NanoBananaService) {
    this.geminiService = geminiService
    this.nanoBananaService = nanoBananaService
  }

  /**
   * Genera contenido de carrusel con múltiples imágenes relacionadas
   * Flujo: texto base → análisis de template → generación secuencial de slides → combinación final
   */
  async generateContent(context: ContentGenerationContext): Promise<ContentGenerationResult> {
    const startTime = Date.now()
    let retryCount = 0

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        retryCount = attempt - 1

        // Validar que tenemos template de carrusel y recursos suficientes
        if (!context.template) {
          throw new Error('Template is required for carousel content generation')
        }

        if (context.template.type !== 'carousel') {
          throw new Error('Template must be of type "carousel" for carousel content generation')
        }

        if (!context.resources || context.resources.length < 2) {
          throw new Error('At least 2 resources are required for carousel generation')
        }

        // Paso 1: Generar texto base que acompañará el carrusel
        const baseText = await this.generateBaseText(context)

        // Paso 2: Planificar la estructura del carrusel
        const carouselPlan = await this.planCarouselStructure(context, baseText)

        // Paso 3: Generar slides individuales manteniendo coherencia
        const slides = await this.generateCarouselSlides(context, carouselPlan)

        // Paso 4: Crear la publicación con todas las imágenes del carrusel
        const publication = {
          campaignId: context.description.campaignId,
          contentDescriptionId: context.description.id,
          templateId: context.template.id,
          socialNetwork: context.description.platform,
          content: baseText,
          generatedText: baseText,
          imageUrl: slides[0].imageUrl, // Primera imagen como principal
          generatedImageUrl: slides[0].imageUrl,
          scheduledDate: context.description.scheduledDate,
          status: 'scheduled' as const,
          generationMetadata: {
            textPrompt: this.buildTextPrompt(context),
            imagePrompt: this.buildImagePrompt(context, baseText),
            templateUsed: context.template.id,
            generationTime: new Date(),
            retryCount,
            resourcesUsed: slides.map(slide => slide.resourceId),
            carouselSlides: slides.map(slide => ({
              index: slide.index,
              imageUrl: slide.imageUrl,
              textOverlays: slide.textOverlays
            })),
            carouselPlan: carouselPlan
          }
        }

        const generationTime = Date.now() - startTime

        return {
          success: true,
          publication,
          retryCount,
          generationTime
        }

      } catch (error) {
        console.warn(`Carousel content generation attempt ${attempt} failed:`, error)
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          const generationTime = Date.now() - startTime
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during carousel content generation',
            retryCount,
            generationTime
          }
        }
      }
    }

    return {
      success: false,
      error: 'All retry attempts failed',
      retryCount: this.retryAttempts,
      generationTime: Date.now() - startTime
    }
  }

  /**
   * Valida que el contenido generado cumple con los límites de la plataforma
   */
  validateContent(content: string, platform: SocialNetwork): boolean {
    const limits = this.getPlatformLimits(platform)
    
    if (content.length > limits.maxCharacters) {
      return false
    }

    if (!content.trim()) {
      return false
    }

    // Validaciones específicas para carruseles por plataforma
    if (platform === 'instagram') {
      // Instagram permite hasta 10 imágenes en carrusel
      return true
    }

    if (platform === 'linkedin') {
      // LinkedIn permite carruseles pero con limitaciones
      return true
    }

    // Facebook y Twitter tienen soporte limitado para carruseles
    if (platform === 'facebook' || platform === 'twitter') {
      console.warn(`Carousel support is limited on ${platform}`)
    }

    return true
  }

  /**
   * Obtiene los límites de la plataforma
   */
  getPlatformLimits(platform: SocialNetwork): PlatformLimits {
    return PLATFORM_LIMITS[platform]
  }

  /**
   * Configura parámetros de reintentos
   */
  setRetryConfig(attempts: number, delay: number): void {
    this.retryAttempts = Math.max(1, attempts)
    this.retryDelay = Math.max(100, delay)
  }

  /**
   * Genera el texto base que acompañará el carrusel
   */
  private async generateBaseText(context: ContentGenerationContext): Promise<string> {
    try {
      // Modificar la descripción para indicar que es un carrusel
      const carouselDescription = {
        ...context.description,
        description: `${context.description.description}\n\nIMPORTANTE: Este contenido será presentado como un carrusel de múltiples imágenes relacionadas.`
      }

      const baseText = await this.geminiService.generatePublicationText({
        description: carouselDescription,
        brandManual: context.brandManual,
        platform: context.description.platform
      })

      if (!this.validateContent(baseText, context.description.platform)) {
        throw new Error(`Generated base text exceeds platform limits for ${context.description.platform}`)
      }

      return baseText
    } catch (error) {
      console.error('Error generating base text for carousel:', error)
      throw new Error('Failed to generate base text for carousel')
    }
  }

  /**
   * Planifica la estructura del carrusel definiendo el contenido de cada slide
   */
  private async planCarouselStructure(
    context: ContentGenerationContext,
    baseText: string
  ): Promise<{
    totalSlides: number
    slideTopics: string[]
    narrative: string
    resources: any[]
  }> {
    if (!context.resources || !context.template) {
      throw new Error('Resources and template are required for carousel planning')
    }

    // Determinar número óptimo de slides basado en recursos disponibles y plataforma
    const maxSlides = this.getMaxSlidesForPlatform(context.description.platform)
    const availableResources = context.resources.filter(resource => 
      this.nanoBananaService.validateResource(resource)
    )
    
    const totalSlides = Math.min(maxSlides, availableResources.length, 5) // Máximo 5 slides por defecto

    // Generar temas para cada slide usando IA
    const slideTopics = await this.generateSlideTopics(context, baseText, totalSlides)

    // Seleccionar recursos apropiados para cada slide
    const selectedResources = this.selectResourcesForSlides(availableResources, totalSlides)

    return {
      totalSlides,
      slideTopics,
      narrative: `Carrusel de ${totalSlides} slides sobre: ${context.description.description}`,
      resources: selectedResources
    }
  }

  /**
   * Genera temas específicos para cada slide del carrusel
   */
  private async generateSlideTopics(
    context: ContentGenerationContext,
    baseText: string,
    totalSlides: number
  ): Promise<string[]> {
    const prompt = `
Eres un experto en storytelling para redes sociales. 

CONTEXTO:
- Descripción del contenido: ${context.description.description}
- Texto base: "${baseText}"
- Plataforma: ${context.description.platform}
- Número de slides: ${totalSlides}
- Marca: ${context.brandManual.brandVoice}
- Audiencia: ${context.brandManual.targetAudience}

TAREA:
Crea ${totalSlides} temas específicos para un carrusel que cuente una historia coherente y progresiva. Cada slide debe:
1. Ser único y específico
2. Contribuir a la narrativa general
3. Ser apropiado para la audiencia objetivo
4. Mantener el tono de la marca
5. Crear engagement progresivo

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido:
{
  "slides": [
    "Tema específico para slide 1",
    "Tema específico para slide 2",
    "Tema específico para slide 3"
  ]
}

No incluyas texto adicional fuera del JSON.
`

    try {
      const response = await this.geminiService.generatePublicationText({
        description: { ...context.description, description: prompt },
        brandManual: context.brandManual,
        platform: context.description.platform
      })

      const parsed = JSON.parse(response)
      
      if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length !== totalSlides) {
        throw new Error('Invalid slide topics response format')
      }

      return parsed.slides
    } catch (error) {
      console.error('Error generating slide topics:', error)
      
      // Fallback: generar temas básicos
      return Array.from({ length: totalSlides }, (_, i) => 
        `Slide ${i + 1}: ${context.description.description} - Parte ${i + 1}`
      )
    }
  }

  /**
   * Selecciona recursos apropiados para cada slide
   */
  private selectResourcesForSlides(resources: any[], totalSlides: number): any[] {
    // Ordenar recursos por calidad (resolución, tipo, etc.)
    const sortedResources = resources.sort((a, b) => {
      // Priorizar imágenes sobre videos
      if (a.type === 'image' && b.type !== 'image') return -1
      if (b.type === 'image' && a.type !== 'image') return 1

      // Priorizar mayor resolución
      const aPixels = (a.width || 0) * (a.height || 0)
      const bPixels = (b.width || 0) * (b.height || 0)
      return bPixels - aPixels
    })

    // Seleccionar los mejores recursos para el número de slides
    return sortedResources.slice(0, totalSlides)
  }

  /**
   * Genera todos los slides del carrusel manteniendo coherencia visual
   */
  private async generateCarouselSlides(
    context: ContentGenerationContext,
    carouselPlan: any
  ): Promise<CarouselSlide[]> {
    const slides: CarouselSlide[] = []
    
    if (!context.template) {
      throw new Error('Template is required for carousel slide generation')
    }

    // Analizar áreas de texto del template
    const textAreas = this.analyzeCarouselTextAreas(context.template)

    for (let i = 0; i < carouselPlan.totalSlides; i++) {
      const slideResource = carouselPlan.resources[i]
      const slideTopic = carouselPlan.slideTopics[i]

      // Generar textos específicos para este slide
      const slideTexts = await this.generateSlideTexts(
        context,
        textAreas,
        slideTopic,
        i,
        carouselPlan.totalSlides
      )

      // Generar imagen para este slide con contexto de carrusel
      const slideImage = await this.generateSlideImage(
        context,
        slideResource,
        slideTexts,
        i,
        slides.map(s => s.imageUrl) // URLs de slides anteriores para coherencia
      )

      slides.push({
        index: i,
        text: slideTopic,
        imageUrl: slideImage.imageUrl,
        textOverlays: slideTexts,
        resourceId: slideResource.id
      })
    }

    return slides
  }

  /**
   * Analiza las áreas de texto específicas para carruseles
   */
  private analyzeCarouselTextAreas(template: Template): TemplateTextArea[] {
    // Áreas de texto específicas para carruseles
    return [
      {
        id: 'slide_number',
        name: 'Número de Slide',
        maxLength: 10,
        placeholder: '1/5'
      },
      {
        id: 'slide_title',
        name: 'Título del Slide',
        maxLength: 40,
        placeholder: 'Título principal'
      },
      {
        id: 'slide_content',
        name: 'Contenido del Slide',
        maxLength: 80,
        placeholder: 'Contenido específico'
      },
      {
        id: 'progress_indicator',
        name: 'Indicador de Progreso',
        maxLength: 20,
        placeholder: 'Paso 1 de 5'
      }
    ]
  }

  /**
   * Genera textos específicos para un slide individual
   */
  private async generateSlideTexts(
    context: ContentGenerationContext,
    textAreas: TemplateTextArea[],
    slideTopic: string,
    slideIndex: number,
    totalSlides: number
  ): Promise<Record<string, string>> {
    if (!context.template) {
      throw new Error('Template is required for slide text generation')
    }

    // Crear descripción específica para este slide
    const slideDescription = {
      ...context.description,
      description: `Slide ${slideIndex + 1} de ${totalSlides}: ${slideTopic}\n\nContexto general: ${context.description.description}`
    }

    try {
      const slideTexts = await this.geminiService.generateTemplateText({
        description: slideDescription,
        template: context.template,
        textAreas: textAreas,
        brandManual: context.brandManual
      })

      // Agregar información de progreso automáticamente
      slideTexts['slide_number'] = `${slideIndex + 1}/${totalSlides}`
      slideTexts['progress_indicator'] = `Paso ${slideIndex + 1} de ${totalSlides}`

      // Validar límites de caracteres
      for (const [areaId, text] of Object.entries(slideTexts)) {
        const area = textAreas.find(a => a.id === areaId)
        if (area && text.length > area.maxLength) {
          slideTexts[areaId] = text.substring(0, area.maxLength - 3) + '...'
        }
      }

      return slideTexts
    } catch (error) {
      console.error(`Error generating texts for slide ${slideIndex + 1}:`, error)
      throw new Error(`Failed to generate texts for slide ${slideIndex + 1}`)
    }
  }

  /**
   * Genera imagen para un slide individual manteniendo coherencia con el carrusel
   */
  private async generateSlideImage(
    context: ContentGenerationContext,
    resource: any,
    textOverlays: Record<string, string>,
    slideIndex: number,
    previousImageUrls: string[]
  ): Promise<{ imageUrl: string; metadata: any }> {
    if (!context.template) {
      throw new Error('Template is required for slide image generation')
    }

    try {
      // Usar el servicio de carrusel de Nano Banana para mantener coherencia
      const carouselResult = await this.nanoBananaService.generateCarousel({
        template: context.template,
        baseResources: [resource], // Un recurso por slide
        textSequence: [textOverlays], // Textos para este slide
        outputFormat: 'jpg',
        quality: 90
      })

      if (carouselResult.images.length === 0) {
        throw new Error('No images generated for carousel slide')
      }

      const slideImage = carouselResult.images[0]

      return {
        imageUrl: slideImage.imageUrl,
        metadata: {
          ...slideImage.metadata,
          slideIndex,
          previousImages: previousImageUrls,
          carouselContext: true
        }
      }
    } catch (error) {
      console.error(`Error generating image for slide ${slideIndex + 1}:`, error)
      throw new Error(`Failed to generate image for slide ${slideIndex + 1}`)
    }
  }

  /**
   * Obtiene el número máximo de slides por plataforma
   */
  private getMaxSlidesForPlatform(platform: SocialNetwork): number {
    const maxSlides = {
      instagram: 10,  // Instagram permite hasta 10 imágenes
      linkedin: 5,    // LinkedIn recomienda máximo 5
      facebook: 10,   // Facebook permite múltiples imágenes
      twitter: 4      // Twitter tiene soporte limitado
    }

    return maxSlides[platform] || 5
  }

  /**
   * Construye el prompt para generación de texto base
   */
  private buildTextPrompt(context: ContentGenerationContext): string {
    const limits = this.getPlatformLimits(context.description.platform)

    return `Generate base text for ${context.description.platform} carousel content:
Description: ${context.description.description}
Template: ${context.template?.name} (carousel)
Brand Voice: ${context.brandManual.brandVoice}
Target Audience: ${context.brandManual.targetAudience}
Character Limit: ${limits.maxCharacters}
Content Type: Carousel with multiple related images`
  }

  /**
   * Construye el prompt para generación de imagen
   */
  private buildImagePrompt(context: ContentGenerationContext, baseText: string): string {
    return `Generate carousel images for ${context.description.platform}:
Base Text: "${baseText}"
Template: ${context.template?.name} (carousel)
Description: ${context.description.description}
Brand Voice: ${context.brandManual.brandVoice}
Resources Available: ${context.resources?.length || 0}
Carousel Type: Multiple related images with coherent narrative`
  }

  /**
   * Valida que el template es apropiado para carruseles
   */
  validateCarouselTemplate(template: Template): boolean {
    if (template.type !== 'carousel') {
      return false
    }

    if (!template.images || template.images.length === 0) {
      return false
    }

    // Verificar que soporta la plataforma objetivo
    return template.socialNetworks.length > 0
  }

  /**
   * Estima el tiempo de generación para carrusel
   */
  estimateGenerationTime(slideCount: number = 3): number {
    // Tiempo base + tiempo por slide adicional
    const baseTime = 30000 // 30 segundos base
    const timePerSlide = 25000 // 25 segundos por slide
    
    return baseTime + (slideCount * timePerSlide)
  }

  /**
   * Obtiene estadísticas del carrusel generado
   */
  getCarouselStats(result: ContentGenerationResult): {
    baseTextLength: number
    slideCount: number
    totalImages: number
    hasAllSlides: boolean
    totalTime: number
    retryCount: number
  } {
    const metadata = result.publication?.generationMetadata
    const slides = metadata?.carouselSlides || []

    return {
      baseTextLength: result.publication?.content?.length || 0,
      slideCount: slides.length,
      totalImages: slides.length,
      hasAllSlides: slides.every((slide: any) => slide.imageUrl),
      totalTime: result.generationTime || 0,
      retryCount: result.retryCount || 0
    }
  }

  /**
   * Optimiza el carrusel para una plataforma específica
   */
  async optimizeCarouselForPlatform(
    slides: CarouselSlide[],
    platform: SocialNetwork
  ): Promise<CarouselSlide[]> {
    const maxSlides = this.getMaxSlidesForPlatform(platform)
    
    // Truncar si excede el límite de la plataforma
    if (slides.length > maxSlides) {
      console.warn(`Carousel has ${slides.length} slides, but ${platform} supports maximum ${maxSlides}. Truncating.`)
      return slides.slice(0, maxSlides)
    }

    return slides
  }
}