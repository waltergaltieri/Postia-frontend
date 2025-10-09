import { GeminiService } from '../GeminiService'
import { 
  ContentGenerator, 
  ContentGenerationContext, 
  ContentGenerationResult, 
  PlatformLimits,
  PLATFORM_LIMITS 
} from './types'
import { SocialNetwork } from '../../database/types'

export class TextContentGenerator implements ContentGenerator {
  private geminiService: GeminiService
  private retryAttempts: number = 3
  private retryDelay: number = 1000

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService
  }

  /**
   * Genera contenido de solo texto para una publicación
   */
  async generateContent(context: ContentGenerationContext): Promise<ContentGenerationResult> {
    const startTime = Date.now()
    let retryCount = 0

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        retryCount = attempt - 1

        // Generar texto usando Gemini
        const generatedText = await this.geminiService.generatePublicationText({
          description: context.description,
          brandManual: context.brandManual,
          platform: context.description.platform
        })

        // Validar el contenido generado
        if (!this.validateContent(generatedText, context.description.platform)) {
          throw new Error(`Generated content exceeds platform limits for ${context.description.platform}`)
        }

        // Crear la publicación
        const publication = {
          campaignId: context.description.campaignId,
          contentDescriptionId: context.description.id,
          socialNetwork: context.description.platform,
          content: generatedText,
          generatedText: generatedText,
          scheduledDate: context.description.scheduledDate,
          status: 'scheduled' as const,
          generationMetadata: {
            textPrompt: this.buildTextPrompt(context),
            generationTime: new Date(),
            retryCount,
            resourcesUsed: []
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
        console.warn(`Text generation attempt ${attempt} failed:`, error)
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          const generationTime = Date.now() - startTime
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during text generation',
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

    // Validaciones específicas por plataforma
    switch (platform) {
      case 'twitter':
        // Twitter tiene límites más estrictos
        return this.validateTwitterContent(content)
      
      case 'linkedin':
        // LinkedIn prefiere contenido más profesional
        return this.validateLinkedInContent(content)
      
      case 'instagram':
        // Instagram permite más creatividad
        return this.validateInstagramContent(content)
      
      case 'facebook':
        // Facebook es más flexible
        return this.validateFacebookContent(content)
      
      default:
        return true
    }
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
   * Construye el prompt específico para generación de texto
   */
  private buildTextPrompt(context: ContentGenerationContext): string {
    const { description, brandManual } = context
    const limits = this.getPlatformLimits(description.platform)

    return `Generate text content for ${description.platform}:
Description: ${description.description}
Brand Voice: ${brandManual.brandVoice}
Target Audience: ${brandManual.targetAudience}
Character Limit: ${limits.maxCharacters}
Scheduled Date: ${description.scheduledDate.toLocaleDateString()}`
  }

  /**
   * Validaciones específicas para Twitter
   */
  private validateTwitterContent(content: string): boolean {
    // Twitter tiene límite de 280 caracteres
    if (content.length > 280) {
      return false
    }

    // Contar URLs (cuentan como 23 caracteres cada una)
    const urlRegex = /https?:\/\/[^\s]+/g
    const urls = content.match(urlRegex) || []
    const urlCharacters = urls.length * 23
    const textCharacters = content.replace(urlRegex, '').length
    
    return (textCharacters + urlCharacters) <= 280
  }

  /**
   * Validaciones específicas para LinkedIn
   */
  private validateLinkedInContent(content: string): boolean {
    // LinkedIn permite hasta 3000 caracteres
    if (content.length > 3000) {
      return false
    }

    // Verificar que no tenga demasiados hashtags (máximo 5 recomendado)
    const hashtags = content.match(/#\w+/g) || []
    if (hashtags.length > 5) {
      return false
    }

    return true
  }

  /**
   * Validaciones específicas para Instagram
   */
  private validateInstagramContent(content: string): boolean {
    // Instagram permite hasta 2200 caracteres
    if (content.length > 2200) {
      return false
    }

    // Verificar que no tenga demasiados hashtags (máximo 30)
    const hashtags = content.match(/#\w+/g) || []
    if (hashtags.length > 30) {
      return false
    }

    return true
  }

  /**
   * Validaciones específicas para Facebook
   */
  private validateFacebookContent(content: string): boolean {
    // Facebook permite hasta 63,206 caracteres
    if (content.length > 63206) {
      return false
    }

    // Facebook es bastante flexible, solo verificar longitud básica
    return true
  }

  /**
   * Obtiene estadísticas del contenido generado
   */
  getContentStats(content: string): {
    characterCount: number
    wordCount: number
    hashtagCount: number
    mentionCount: number
    urlCount: number
  } {
    const hashtags = content.match(/#\w+/g) || []
    const mentions = content.match(/@\w+/g) || []
    const urls = content.match(/https?:\/\/[^\s]+/g) || []
    const words = content.trim().split(/\s+/).filter(word => word.length > 0)

    return {
      characterCount: content.length,
      wordCount: words.length,
      hashtagCount: hashtags.length,
      mentionCount: mentions.length,
      urlCount: urls.length
    }
  }

  /**
   * Optimiza el contenido para una plataforma específica
   */
  async optimizeForPlatform(
    content: string, 
    platform: SocialNetwork,
    context: ContentGenerationContext
  ): Promise<string> {
    const limits = this.getPlatformLimits(platform)
    
    // Si el contenido ya está dentro de los límites, devolverlo tal como está
    if (this.validateContent(content, platform)) {
      return content
    }

    // Si excede los límites, intentar optimizar
    if (content.length > limits.maxCharacters) {
      // Truncar y regenerar si es necesario
      const truncatedContent = content.substring(0, limits.maxCharacters - 50) + '...'
      
      // Intentar regenerar una versión más corta
      try {
        const optimizedText = await this.geminiService.generatePublicationText({
          description: {
            ...context.description,
            description: `${context.description.description}\n\nIMPORTANTE: El texto debe tener máximo ${limits.maxCharacters} caracteres para ${platform}.`
          },
          brandManual: context.brandManual,
          platform
        })

        return this.validateContent(optimizedText, platform) ? optimizedText : truncatedContent
      } catch (error) {
        console.warn('Failed to optimize content, using truncated version:', error)
        return truncatedContent
      }
    }

    return content
  }
}