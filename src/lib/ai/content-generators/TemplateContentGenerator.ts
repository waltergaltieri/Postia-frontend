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

export class TemplateContentGenerator implements ContentGenerator {
  private geminiService: GeminiService
  private nanoBananaService: NanoBananaService
  private retryAttempts: number = 3
  private retryDelay: number = 1000

  constructor(geminiService: GeminiService, nanoBananaService: NanoBananaService) {
    this.geminiService = geminiService
    this.nanoBananaService = nanoBananaService
  }

  /**
   * Genera contenido complejo con texto incorporado en imágenes usando templates
   * Flujo: texto base → imagen base → textos de template → imagen final
   */
  async generateContent(context: ContentGenerationContext): Promise<ContentGenerationResult> {
    const startTime = Date.now()
    let retryCount = 0

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        retryCount = attempt - 1

        // Validar que tenemos template y recursos
        if (!context.template) {
          throw new Error('Template is required for template content generation')
        }

        if (!context.resources || context.resources.length === 0) {
          throw new Error('Resources are required for template content generation')
        }

        // Paso 1: Generar texto base que acompañará la publicación
        const baseText = await this.generateBaseText(context)

        // Paso 2: Generar imagen de fondo usando recursos disponibles
        const backgroundImage = await this.generateBackgroundImage(context, baseText)

        // Paso 3: Analizar template para identificar áreas de texto
        const textAreas = this.analyzeTemplateTextAreas(context.template)

        // Paso 4: Generar textos específicos para cada área del template
        const templateTexts = await this.generateTemplateTexts(context, textAreas, baseText)

        // Paso 5: Generar imagen final combinando template, imagen de fondo y textos
        const finalImage = await this.generateFinalTemplateImage(
          context,
          backgroundImage.imageUrl,
          templateTexts
        )

        // Crear la publicación completa
        const publication = {
          campaignId: context.description.campaignId,
          contentDescriptionId: context.description.id,
          templateId: context.template.id,
          socialNetwork: context.description.platform,
          content: baseText,
          generatedText: baseText,
          imageUrl: finalImage.imageUrl,
          generatedImageUrl: finalImage.imageUrl,
          scheduledDate: context.description.scheduledDate,
          status: 'scheduled' as const,
          generationMetadata: {
            textPrompt: this.buildTextPrompt(context),
            imagePrompt: this.buildImagePrompt(context, baseText),
            templateUsed: context.template.id,
            generationTime: new Date(),
            retryCount,
            resourcesUsed: context.resources?.map(r => r.id) || []
          } as any
        }

        const generationTime = Date.now() - startTime

        return {
          success: true,
          publication,
          retryCount,
          generationTime
        }

      } catch (error) {
        console.warn(`Template content generation attempt ${attempt} failed:`, error)
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          const generationTime = Date.now() - startTime
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during template content generation',
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
   * Genera el texto base que acompañará la publicación
   */
  private async generateBaseText(context: ContentGenerationContext): Promise<string> {
    try {
      const baseText = await this.geminiService.generatePublicationText({
        description: context.description,
        brandManual: context.brandManual,
        platform: context.description.platform
      })

      if (!this.validateContent(baseText, context.description.platform)) {
        throw new Error(`Generated base text exceeds platform limits for ${context.description.platform}`)
      }

      return baseText
    } catch (error) {
      console.error('Error generating base text:', error)
      throw new Error('Failed to generate base text for template')
    }
  }

  /**
   * Genera imagen de fondo usando los recursos disponibles
   */
  private async generateBackgroundImage(
    context: ContentGenerationContext,
    baseText: string
  ): Promise<{ imageUrl: string; metadata: any }> {
    if (!context.resources || context.resources.length === 0) {
      throw new Error('No resources available for background image generation')
    }

    // Seleccionar el mejor recurso para la imagen de fondo
    const selectedResource = this.selectBestResource(context.resources, context.description.platform)

    if (!this.nanoBananaService.validateResource(selectedResource)) {
      throw new Error(`Resource ${selectedResource.name} is not compatible with image generation`)
    }

    // Construir contexto para la imagen de fondo
    const imageContext = this.buildBackgroundImageContext(context, baseText)

    try {
      const imageResult = await this.nanoBananaService.generateSimpleImage({
        baseResource: selectedResource,
        context: imageContext,
        platform: context.description.platform,
        outputFormat: 'jpg',
        quality: 90
      })

      return {
        imageUrl: imageResult.imageUrl,
        metadata: {
          ...imageResult.metadata,
          selectedResource: selectedResource.id,
          generationTime: imageResult.generationTime
        }
      }
    } catch (error) {
      console.error('Error generating background image:', error)
      throw new Error('Failed to generate background image for template')
    }
  }

  /**
   * Analiza el template para identificar áreas de texto y sus limitaciones
   */
  private analyzeTemplateTextAreas(template: Template): TemplateTextArea[] {
    // En un sistema real, esto analizaría el template para identificar áreas de texto
    // Por ahora, definimos áreas estándar basadas en el tipo de template
    
    const baseAreas: TemplateTextArea[] = []

    if (template.type === 'single') {
      // Template de imagen única - áreas comunes
      baseAreas.push(
        {
          id: 'headline',
          name: 'Título Principal',
          maxLength: 50,
          placeholder: 'Título llamativo'
        },
        {
          id: 'subtitle',
          name: 'Subtítulo',
          maxLength: 80,
          placeholder: 'Descripción complementaria'
        },
        {
          id: 'cta',
          name: 'Call to Action',
          maxLength: 25,
          placeholder: 'Acción a realizar'
        }
      )
    } else if (template.type === 'carousel') {
      // Template de carrusel - áreas por slide
      baseAreas.push(
        {
          id: 'main_title',
          name: 'Título Principal',
          maxLength: 40,
          placeholder: 'Título del carrusel'
        },
        {
          id: 'slide_text',
          name: 'Texto de Slide',
          maxLength: 60,
          placeholder: 'Contenido del slide'
        },
        {
          id: 'final_cta',
          name: 'CTA Final',
          maxLength: 30,
          placeholder: 'Llamada a la acción'
        }
      )
    }

    // Agregar áreas adicionales basadas en el nombre del template
    if (template.name.toLowerCase().includes('promocion') || template.name.toLowerCase().includes('oferta')) {
      baseAreas.push({
        id: 'discount',
        name: 'Descuento',
        maxLength: 15,
        placeholder: '50% OFF'
      })
    }

    if (template.name.toLowerCase().includes('evento') || template.name.toLowerCase().includes('fecha')) {
      baseAreas.push({
        id: 'date',
        name: 'Fecha',
        maxLength: 20,
        placeholder: '15 de Marzo'
      })
    }

    return baseAreas
  }

  /**
   * Genera textos específicos para cada área del template
   */
  private async generateTemplateTexts(
    context: ContentGenerationContext,
    textAreas: TemplateTextArea[],
    baseText: string
  ): Promise<Record<string, string>> {
    if (!context.template) {
      throw new Error('Template is required for generating template texts')
    }

    try {
      const templateTexts = await this.geminiService.generateTemplateText({
        description: context.description,
        template: context.template,
        textAreas: textAreas,
        brandManual: context.brandManual
      })

      // Validar que todos los textos respetan los límites
      for (const [areaId, text] of Object.entries(templateTexts)) {
        const area = textAreas.find(a => a.id === areaId)
        if (area && text.length > area.maxLength) {
          // Truncar si excede el límite
          templateTexts[areaId] = text.substring(0, area.maxLength - 3) + '...'
        }
      }

      return templateTexts
    } catch (error) {
      console.error('Error generating template texts:', error)
      throw new Error('Failed to generate template texts')
    }
  }

  /**
   * Genera la imagen final combinando template, imagen de fondo y textos
   */
  private async generateFinalTemplateImage(
    context: ContentGenerationContext,
    backgroundImageUrl: string,
    templateTexts: Record<string, string>
  ): Promise<{ imageUrl: string; metadata: any }> {
    if (!context.template || !context.resources) {
      throw new Error('Template and resources are required for final image generation')
    }

    const selectedResource = this.selectBestResource(context.resources, context.description.platform)

    try {
      const imageResult = await this.nanoBananaService.generateTemplateImage({
        template: context.template,
        baseResource: selectedResource,
        backgroundImage: backgroundImageUrl,
        textOverlays: templateTexts,
        outputFormat: 'jpg',
        quality: 95
      })

      return {
        imageUrl: imageResult.imageUrl,
        metadata: {
          ...imageResult.metadata,
          backgroundImageUrl,
          textOverlays: templateTexts,
          generationTime: imageResult.generationTime
        }
      }
    } catch (error) {
      console.error('Error generating final template image:', error)
      throw new Error('Failed to generate final template image')
    }
  }

  /**
   * Selecciona el mejor recurso para la generación
   */
  private selectBestResource(resources: any[], platform: SocialNetwork): any {
    const compatibleResources = resources.filter(resource => 
      this.nanoBananaService.validateResource(resource)
    )

    if (compatibleResources.length === 0) {
      throw new Error('No compatible resources found for template generation')
    }

    // Priorizar por calidad y tipo
    const prioritizedResources = compatibleResources.sort((a, b) => {
      if (a.type === 'image' && b.type !== 'image') return -1
      if (b.type === 'image' && a.type !== 'image') return 1

      const aPixels = (a.width || 0) * (a.height || 0)
      const bPixels = (b.width || 0) * (b.height || 0)
      return bPixels - aPixels
    })

    return prioritizedResources[0]
  }

  /**
   * Construye el contexto para la imagen de fondo
   */
  private buildBackgroundImageContext(
    context: ContentGenerationContext,
    baseText: string
  ): string {
    return `
Create a professional background image for template composition on ${context.description.platform}.

CONTENT CONTEXT:
- Description: ${context.description.description}
- Base Text: "${baseText}"
- Template: ${context.template?.name} (${context.template?.type})

BRAND CONTEXT:
- Brand Voice: ${context.brandManual.brandVoice}
- Target Audience: ${context.brandManual.targetAudience}
- Brand Values: ${context.brandManual.brandValues.join(', ')}

REQUIREMENTS:
- Platform: ${context.description.platform}
- Style: Professional, suitable for template overlay
- Must work well with text overlays
- Appropriate background for brand messaging
- High quality and visually appealing
- Leave space for text elements

This image will be used as a background for template text overlays, so ensure it provides good contrast and readability for text elements.
`
  }

  /**
   * Construye el prompt para generación de texto base
   */
  private buildTextPrompt(context: ContentGenerationContext): string {
    const limits = this.getPlatformLimits(context.description.platform)

    return `Generate base text for ${context.description.platform} template content:
Description: ${context.description.description}
Template: ${context.template?.name} (${context.template?.type})
Brand Voice: ${context.brandManual.brandVoice}
Target Audience: ${context.brandManual.targetAudience}
Character Limit: ${limits.maxCharacters}
Content Type: Template with text overlays`
  }

  /**
   * Construye el prompt para generación de imagen
   */
  private buildImagePrompt(context: ContentGenerationContext, baseText: string): string {
    return `Generate template image for ${context.description.platform}:
Base Text: "${baseText}"
Template: ${context.template?.name} (${context.template?.type})
Description: ${context.description.description}
Brand Voice: ${context.brandManual.brandVoice}
Resources Available: ${context.resources?.length || 0}`
  }

  /**
   * Valida que el template es compatible con la generación
   */
  validateTemplate(template: Template): boolean {
    // Verificar que el template tiene las propiedades necesarias
    if (!template.id || !template.name || !template.type) {
      return false
    }

    // Verificar que el tipo es soportado
    if (!['single', 'carousel'].includes(template.type)) {
      return false
    }

    // Verificar que tiene imágenes asociadas
    if (!template.images || template.images.length === 0) {
      return false
    }

    return true
  }

  /**
   * Estima el tiempo de generación para contenido con template
   */
  estimateGenerationTime(): number {
    // Tiempo estimado: texto base (5-10s) + imagen fondo (15-20s) + textos template (10-15s) + imagen final (20-30s)
    return 60000 // 60 segundos
  }

  /**
   * Obtiene estadísticas del proceso de generación con template
   */
  getGenerationStats(result: ContentGenerationResult): {
    baseTextLength: number
    templateTextsCount: number
    hasBackgroundImage: boolean
    hasFinalImage: boolean
    totalTime: number
    retryCount: number
  } {
    const metadata = result.publication?.generationMetadata

    return {
      baseTextLength: result.publication?.content?.length || 0,
      templateTextsCount: (metadata as any)?.templateTexts ? Object.keys((metadata as any).templateTexts).length : 0,
      hasBackgroundImage: !!(metadata as any)?.backgroundImageUrl,
      hasFinalImage: !!result.publication?.generatedImageUrl,
      totalTime: result.generationTime || 0,
      retryCount: result.retryCount || 0
    }
  }

  /**
   * Optimiza el template para una plataforma específica
   */
  async optimizeTemplateForPlatform(
    template: Template,
    platform: SocialNetwork
  ): Promise<Template> {
    // Crear una copia optimizada del template para la plataforma
    const optimizedTemplate = { ...template }

    // Filtrar redes sociales soportadas
    if (!template.socialNetworks.includes(platform)) {
      console.warn(`Template ${template.name} is not optimized for ${platform}`)
    }

    // Ajustar configuraciones específicas por plataforma si es necesario
    // Esto podría incluir ajustes de dimensiones, colores, etc.

    return optimizedTemplate
  }
}