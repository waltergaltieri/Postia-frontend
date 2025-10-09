// Content Generators - AI-powered content generation for different types of social media posts

export { TextContentGenerator } from './TextContentGenerator'
export { ImageContentGenerator } from './ImageContentGenerator'
export { TemplateContentGenerator } from './TemplateContentGenerator'
export { CarouselContentGenerator } from './CarouselContentGenerator'

export type {
  ContentGenerator,
  ContentGenerationContext,
  ContentGenerationResult,
  PlatformLimits,
  PLATFORM_LIMITS
} from './types'

export type { CarouselSlide } from './CarouselContentGenerator'

import { GeminiService } from '../GeminiService'
import { NanoBananaService } from '../NanoBananaService'
import { TextContentGenerator } from './TextContentGenerator'
import { ImageContentGenerator } from './ImageContentGenerator'
import { TemplateContentGenerator } from './TemplateContentGenerator'
import { CarouselContentGenerator } from './CarouselContentGenerator'
import { ContentDescription } from '../../database/types'

/**
 * Factory para crear el generador apropiado según el tipo de contenido
 */
export function createContentGenerator(
  contentType: ContentDescription['contentType'],
  geminiService: GeminiService,
  nanoBananaService?: NanoBananaService
) {
  switch (contentType) {
    case 'text_simple':
      return new TextContentGenerator(geminiService)

    case 'text_image_simple':
      if (!nanoBananaService) {
        throw new Error('NanoBananaService is required for image content generation')
      }
      return new ImageContentGenerator(geminiService, nanoBananaService)

    case 'text_image_template':
      if (!nanoBananaService) {
        throw new Error('NanoBananaService is required for template content generation')
      }
      return new TemplateContentGenerator(geminiService, nanoBananaService)

    case 'carousel':
      if (!nanoBananaService) {
        throw new Error('NanoBananaService is required for carousel content generation')
      }
      return new CarouselContentGenerator(geminiService, nanoBananaService)

    default:
      throw new Error(`Unsupported content type: ${contentType}`)
  }
}

/**
 * Servicio principal para orquestar la generación de contenido
 */
export class ContentGeneratorService {
  private geminiService: GeminiService
  private nanoBananaService?: NanoBananaService

  constructor(geminiService: GeminiService, nanoBananaService?: NanoBananaService) {
    this.geminiService = geminiService
    this.nanoBananaService = nanoBananaService
  }

  /**
   * Genera contenido usando el generador apropiado
   */
  async generateContent(
    contentType: ContentDescription['contentType'],
    context: import('./types').ContentGenerationContext
  ) {
    const generator = createContentGenerator(
      contentType,
      this.geminiService,
      this.nanoBananaService
    )

    return await generator.generateContent(context)
  }

  /**
   * Valida que el servicio puede generar el tipo de contenido solicitado
   */
  canGenerateContentType(contentType: ContentDescription['contentType']): boolean {
    switch (contentType) {
      case 'text_simple':
        return true

      case 'text_image_simple':
      case 'text_image_template':
      case 'carousel':
        return !!this.nanoBananaService

      default:
        return false
    }
  }

  /**
   * Obtiene los tipos de contenido soportados
   */
  getSupportedContentTypes(): ContentDescription['contentType'][] {
    const types: ContentDescription['contentType'][] = ['text_simple']

    if (this.nanoBananaService) {
      types.push('text_image_simple', 'text_image_template', 'carousel')
    }

    return types
  }

  /**
   * Estima el tiempo de generación para un tipo de contenido
   */
  estimateGenerationTime(contentType: ContentDescription['contentType']): number {
    try {
      const generator = createContentGenerator(
        contentType,
        this.geminiService,
        this.nanoBananaService
      )

      if ('estimateGenerationTime' in generator) {
        return (generator as any).estimateGenerationTime()
      }
    } catch (error) {
      console.warn('Could not estimate generation time:', error)
    }

    // Tiempos por defecto
    const defaultTimes = {
      text_simple: 10000,        // 10 segundos
      text_image_simple: 25000,  // 25 segundos
      text_image_template: 60000, // 60 segundos
      carousel: 90000            // 90 segundos
    }

    return defaultTimes[contentType] || 30000
  }
}

/**
 * Factory function para crear el servicio principal
 */
export function createContentGeneratorService(): ContentGeneratorService {
  const geminiApiKey = process.env.GEMINI_API_KEY
  const nanoBananaApiKey = process.env.NANO_BANANA_API_KEY

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  const geminiService = new GeminiService({ apiKey: geminiApiKey })

  let nanoBananaService: NanoBananaService | undefined
  if (nanoBananaApiKey) {
    nanoBananaService = new NanoBananaService({ apiKey: nanoBananaApiKey })
  }

  return new ContentGeneratorService(geminiService, nanoBananaService)
}