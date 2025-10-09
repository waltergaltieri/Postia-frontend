import { GeminiService } from '../GeminiService'
import { NanoBananaService } from '../NanoBananaService'
import { 
  ContentGenerator, 
  ContentGenerationContext, 
  ContentGenerationResult, 
  PlatformLimits,
  PLATFORM_LIMITS 
} from './types'
import { SocialNetwork } from '../../database/types'

export class ImageContentGenerator implements ContentGenerator {
  private geminiService: GeminiService
  private nanoBananaService: NanoBananaService
  private retryAttempts: number = 3
  private retryDelay: number = 1000

  constructor(geminiService: GeminiService, nanoBananaService: NanoBananaService) {
    this.geminiService = geminiService
    this.nanoBananaService = nanoBananaService
  }

  /**
   * Genera contenido de texto + imagen simple para una publicación
   * Flujo: generar texto primero, luego imagen contextualizada
   */
  async generateContent(context: ContentGenerationContext): Promise<ContentGenerationResult> {
    const startTime = Date.now()
    let retryCount = 0

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        retryCount = attempt - 1

        // Paso 1: Generar texto usando Gemini
        const generatedText = await this.geminiService.generatePublicationText({
          description: context.description,
          brandManual: context.brandManual,
          platform: context.description.platform
        })

        // Validar el texto generado
        if (!this.validateContent(generatedText, context.description.platform)) {
          throw new Error(`Generated text exceeds platform limits for ${context.description.platform}`)
        }

        // Paso 2: Generar imagen contextualizada usando Nano Banana
        const imageResult = await this.generateContextualizedImage(
          context,
          generatedText
        )

        // Crear la publicación completa
        const publication = {
          campaignId: context.description.campaignId,
          contentDescriptionId: context.description.id,
          socialNetwork: context.description.platform,
          content: generatedText,
          generatedText: generatedText,
          imageUrl: imageResult.imageUrl,
          generatedImageUrl: imageResult.imageUrl,
          scheduledDate: context.description.scheduledDate,
          status: 'scheduled' as const,
          generationMetadata: {
            textPrompt: this.buildTextPrompt(context),
            imagePrompt: this.buildImagePrompt(context, generatedText),
            generationTime: new Date(),
            retryCount,
            resourcesUsed: context.resources?.map(r => r.id) || []
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
        console.warn(`Image content generation attempt ${attempt} failed:`, error)
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          const generationTime = Date.now() - startTime
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during image content generation',
            retryCount,
            generationTime
          }
        }
      }
    }

    // This should never be reached, but TypeScript requires it
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
    
    // Validar longitud de caracteres
    if (content.length > limits.maxCharacters) {
      return false
    }

    // Validar que no esté vacío
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
   * Genera imagen contextualizada basada en el texto y recursos disponibles
   */
  private async generateContextualizedImage(
    context: ContentGenerationContext,
    generatedText: string
  ): Promise<{ imageUrl: string; metadata: any }> {
    // Validar que tenemos recursos disponibles
    if (!context.resources || context.resources.length === 0) {
      throw new Error('No resources available for image generation')
    }

    // Seleccionar el mejor recurso para la imagen
    const selectedResource = this.selectBestResource(context.resources, context.description.platform)

    // Validar que el recurso es compatible
    if (!this.nanoBananaService.validateResource(selectedResource)) {
      throw new Error(`Resource ${selectedResource.name} is not compatible with image generation`)
    }

    // Construir contexto para la imagen basado en el texto generado
    const imageContext = this.buildImageContext(context, generatedText)

    try {
      // Generar imagen usando Nano Banana
      const imageResult = await this.nanoBananaService.generateSimpleImage({
        baseResource: selectedResource,
        context: imageContext,
        platform: context.description.platform,
        outputFormat: 'jpg',
        quality: 85
      })

      return {
        imageUrl: imageResult.imageUrl,
        metadata: {
          ...imageResult.metadata,
          selectedResource: selectedResource.id,
          generationTime: imageResult.generationTime,
          dimensions: {
            width: imageResult.width,
            height: imageResult.height
          }
        }
      }

    } catch (error) {
      console.error('Error generating contextualized image:', error)
      throw new Error('Failed to generate contextualized image')
    }
  }

  /**
   * Selecciona el mejor recurso para la generación de imagen
   */
  private selectBestResource(resources: any[], platform: SocialNetwork): any {
    // Filtrar recursos compatibles
    const compatibleResources = resources.filter(resource => 
      this.nanoBananaService.validateResource(resource)
    )

    if (compatibleResources.length === 0) {
      throw new Error('No compatible resources found for image generation')
    }

    // Priorizar por tipo de archivo y calidad
    const prioritizedResources = compatibleResources.sort((a, b) => {
      // Priorizar imágenes sobre videos
      if (a.type === 'image' && b.type !== 'image') return -1
      if (b.type === 'image' && a.type !== 'image') return 1

      // Priorizar mayor resolución
      const aPixels = (a.width || 0) * (a.height || 0)
      const bPixels = (b.width || 0) * (b.height || 0)
      return bPixels - aPixels
    })

    return prioritizedResources[0]
  }

  /**
   * Construye el contexto para la generación de imagen
   */
  private buildImageContext(context: ContentGenerationContext, generatedText: string): string {
    const { description, brandManual } = context

    // Extraer elementos clave del texto generado
    const textKeywords = this.extractKeywords(generatedText)
    const textTone = this.analyzeTone(generatedText)

    return `
Create a professional image for ${description.platform} that complements this text:

TEXT CONTENT: "${generatedText}"

BRAND CONTEXT:
- Brand Voice: ${brandManual.brandVoice}
- Target Audience: ${brandManual.targetAudience}
- Brand Values: ${brandManual.brandValues.join(', ')}

CONTENT DESCRIPTION: ${description.description}

IMAGE REQUIREMENTS:
- Platform: ${description.platform}
- Style: Professional and engaging
- Tone: ${textTone}
- Keywords to incorporate: ${textKeywords.join(', ')}
- Must complement the text content
- Appropriate for target audience: ${brandManual.targetAudience}
- Align with brand values: ${brandManual.brandValues.join(', ')}

The image should enhance the message conveyed in the text and create a cohesive visual-textual experience for the audience.
`
  }

  /**
   * Extrae palabras clave del texto generado
   */
  private extractKeywords(text: string): string[] {
    // Remover hashtags, menciones y URLs para análisis
    const cleanText = text
      .replace(/#\w+/g, '')
      .replace(/@\w+/g, '')
      .replace(/https?:\/\/[^\s]+/g, '')
      .toLowerCase()

    // Palabras comunes a filtrar
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'como', 'pero', 'sus', 'han', 'me', 'si', 'sin', 'sobre', 'este', 'ya', 'entre', 'cuando', 'todo', 'esta', 'ser', 'son', 'dos', 'también', 'fue', 'había', 'era', 'muy', 'años', 'hasta', 'desde', 'está', 'mi', 'porque', 'qué', 'sólo', 'han', 'yo', 'hay', 'vez', 'puede', 'todos', 'así', 'nos', 'ni', 'parte', 'tiene', 'él', 'uno', 'donde', 'bien', 'tiempo', 'mismo', 'ese', 'ahora', 'cada', 'e', 'vida', 'otro', 'después', 'te', 'otros', 'aunque', 'esa', 'eso', 'hace', 'otra', 'gobierno', 'tan', 'durante', 'siempre', 'día', 'tanto', 'ella', 'tres', 'sí', 'dijo', 'sido', 'gran', 'país', 'según', 'menos', 'mundo', 'año', 'antes', 'estado', 'quiero', 'mientras', 'sin', 'lugar', 'solo', 'nosotros', 'pueden', 'trabajo', 'vida', 'ejemplo', 'llevar', 'agua', 'caso', 'usted', 'mayor', 'guerra', 'decir', 'aquí', 'debe', 'camino', 'uso', 'bajo', 'valor'
    ])

    // Extraer palabras significativas
    const words = cleanText
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 3 && !stopWords.has(word))

    // Contar frecuencia y devolver las más relevantes
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word)
  }

  /**
   * Analiza el tono del texto generado
   */
  private analyzeTone(text: string): string {
    const lowerText = text.toLowerCase()

    // Palabras que indican diferentes tonos
    const toneIndicators = {
      professional: ['profesional', 'empresa', 'negocio', 'servicio', 'calidad', 'experiencia'],
      friendly: ['amigo', 'familia', 'feliz', 'alegre', 'divertido', 'genial'],
      urgent: ['ahora', 'urgente', 'rápido', 'inmediato', 'pronto', 'ya'],
      inspirational: ['sueño', 'meta', 'lograr', 'éxito', 'inspirar', 'motivar'],
      informative: ['información', 'datos', 'conocer', 'aprender', 'descubrir', 'saber']
    }

    let maxScore = 0
    let dominantTone = 'professional'

    for (const [tone, indicators] of Object.entries(toneIndicators)) {
      const score = indicators.reduce((acc, indicator) => {
        return acc + (lowerText.includes(indicator) ? 1 : 0)
      }, 0)

      if (score > maxScore) {
        maxScore = score
        dominantTone = tone
      }
    }

    return dominantTone
  }

  /**
   * Construye el prompt específico para generación de texto
   */
  private buildTextPrompt(context: ContentGenerationContext): string {
    const { description, brandManual } = context
    const limits = this.getPlatformLimits(description.platform)

    return `Generate text content for ${description.platform} (with accompanying image):
Description: ${description.description}
Brand Voice: ${brandManual.brandVoice}
Target Audience: ${brandManual.targetAudience}
Character Limit: ${limits.maxCharacters}
Content Type: Text + Image
Scheduled Date: ${description.scheduledDate.toLocaleDateString()}`
  }

  /**
   * Construye el prompt específico para generación de imagen
   */
  private buildImagePrompt(context: ContentGenerationContext, generatedText: string): string {
    return `Generate contextual image for ${context.description.platform}:
Text Content: "${generatedText}"
Description: ${context.description.description}
Brand Voice: ${context.brandManual.brandVoice}
Target Audience: ${context.brandManual.targetAudience}
Resources Available: ${context.resources?.length || 0}`
  }

  /**
   * Valida que los recursos están disponibles para generación de imagen
   */
  validateResources(context: ContentGenerationContext): boolean {
    if (!context.resources || context.resources.length === 0) {
      return false
    }

    // Verificar que al menos un recurso es compatible
    return context.resources.some(resource => 
      this.nanoBananaService.validateResource(resource)
    )
  }

  /**
   * Estima el tiempo de generación para este tipo de contenido
   */
  estimateGenerationTime(): number {
    // Tiempo estimado: texto (5-10s) + imagen (15-20s)
    return 25000 // 25 segundos
  }

  /**
   * Obtiene estadísticas del proceso de generación
   */
  getGenerationStats(result: ContentGenerationResult): {
    textLength: number
    hasImage: boolean
    totalTime: number
    retryCount: number
  } {
    return {
      textLength: result.publication?.content?.length || 0,
      hasImage: !!result.publication?.generatedImageUrl,
      totalTime: result.generationTime || 0,
      retryCount: result.retryCount || 0
    }
  }
}