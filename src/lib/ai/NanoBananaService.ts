import { 
  Resource, 
  Template, 
  SocialNetwork,
  ContentDescription 
} from '../database/types'

export interface NanoBananaConfig {
  apiKey: string
  baseUrl?: string
}

export interface GenerateSimpleImageParams {
  baseResource: Resource
  context: string
  platform: SocialNetwork
  outputFormat?: 'jpg' | 'png' | 'webp'
  quality?: number
}

export interface GenerateTemplateImageParams {
  template: Template
  baseResource: Resource
  backgroundImage?: string
  textOverlays: Record<string, string>
  outputFormat?: 'jpg' | 'png' | 'webp'
  quality?: number
}

export interface GenerateCarouselParams {
  template: Template
  baseResources: Resource[]
  textSequence: Record<string, string>[]
  outputFormat?: 'jpg' | 'png' | 'webp'
  quality?: number
}

export interface ImageGenerationResult {
  imageUrl: string
  width: number
  height: number
  format: string
  sizeBytes: number
  generationTime: number
  metadata?: {
    prompt: string
    model: string
    parameters: Record<string, any>
  }
}

export interface CarouselGenerationResult {
  images: ImageGenerationResult[]
  totalGenerationTime: number
}

export class NanoBananaService {
  private config: NanoBananaConfig
  private retryAttempts: number = 3
  private retryDelay: number = 1000

  constructor(config: NanoBananaConfig) {
    this.config = {
      baseUrl: 'https://api.nano-banana.com/v1',
      ...config
    }
  }

  /**
   * Genera una imagen simple basada en un recurso y contexto
   */
  async generateSimpleImage(params: GenerateSimpleImageParams): Promise<ImageGenerationResult> {
    const prompt = this.buildSimpleImagePrompt(params)
    
    try {
      const startTime = Date.now()
      const response = await this.callNanoBananaAPI('/generate/simple', {
        prompt,
        baseImageUrl: params.baseResource.url,
        platform: params.platform,
        outputFormat: params.outputFormat || 'jpg',
        quality: params.quality || 85,
        dimensions: this.getPlatformDimensions(params.platform)
      })
      
      const generationTime = Date.now() - startTime
      
      return {
        imageUrl: response.imageUrl,
        width: response.width,
        height: response.height,
        format: response.format,
        sizeBytes: response.sizeBytes,
        generationTime,
        metadata: {
          prompt,
          model: response.model || 'nano-banana-v1',
          parameters: {
            platform: params.platform,
            baseResource: params.baseResource.name,
            quality: params.quality || 85
          }
        }
      }
    } catch (error) {
      console.error('Error generating simple image:', error)
      throw new Error('Failed to generate simple image')
    }
  }

  /**
   * Genera una imagen compleja usando template con texto incorporado
   */
  async generateTemplateImage(params: GenerateTemplateImageParams): Promise<ImageGenerationResult> {
    const prompt = this.buildTemplateImagePrompt(params)
    
    try {
      const startTime = Date.now()
      const response = await this.callNanoBananaAPI('/generate/template', {
        prompt,
        templateId: params.template.id,
        baseImageUrl: params.baseResource.url,
        backgroundImageUrl: params.backgroundImage,
        textOverlays: params.textOverlays,
        outputFormat: params.outputFormat || 'jpg',
        quality: params.quality || 90,
        templateType: params.template.type
      })
      
      const generationTime = Date.now() - startTime
      
      return {
        imageUrl: response.imageUrl,
        width: response.width,
        height: response.height,
        format: response.format,
        sizeBytes: response.sizeBytes,
        generationTime,
        metadata: {
          prompt,
          model: response.model || 'nano-banana-template-v1',
          parameters: {
            template: params.template.name,
            textOverlays: Object.keys(params.textOverlays),
            quality: params.quality || 90
          }
        }
      }
    } catch (error) {
      console.error('Error generating template image:', error)
      throw new Error('Failed to generate template image')
    }
  }

  /**
   * Genera un carrusel de imágenes relacionadas
   */
  async generateCarousel(params: GenerateCarouselParams): Promise<CarouselGenerationResult> {
    if (params.baseResources.length !== params.textSequence.length) {
      throw new Error('Number of base resources must match number of text sequences')
    }

    const startTime = Date.now()
    const images: ImageGenerationResult[] = []
    
    try {
      // Generar cada imagen del carrusel secuencialmente para mantener coherencia
      for (let i = 0; i < params.baseResources.length; i++) {
        const resource = params.baseResources[i]
        const textOverlay = params.textSequence[i]
        
        const imageParams: GenerateTemplateImageParams = {
          template: params.template,
          baseResource: resource,
          textOverlays: textOverlay,
          outputFormat: params.outputFormat,
          quality: params.quality
        }
        
        // Agregar contexto de carrusel para mantener coherencia visual
        const carouselContext = {
          isCarousel: true,
          carouselIndex: i,
          totalImages: params.baseResources.length,
          previousImages: images.map(img => img.imageUrl)
        }
        
        const image = await this.generateCarouselImage(imageParams, carouselContext)
        images.push(image)
      }
      
      const totalGenerationTime = Date.now() - startTime
      
      return {
        images,
        totalGenerationTime
      }
    } catch (error) {
      console.error('Error generating carousel:', error)
      throw new Error('Failed to generate carousel')
    }
  }

  /**
   * Genera una imagen individual para carrusel con contexto de coherencia
   */
  private async generateCarouselImage(
    params: GenerateTemplateImageParams, 
    carouselContext: any
  ): Promise<ImageGenerationResult> {
    const prompt = this.buildCarouselImagePrompt(params, carouselContext)
    
    try {
      const startTime = Date.now()
      const response = await this.callNanoBananaAPI('/generate/carousel-item', {
        prompt,
        templateId: params.template.id,
        baseImageUrl: params.baseResource.url,
        backgroundImageUrl: params.backgroundImage,
        textOverlays: params.textOverlays,
        carouselContext,
        outputFormat: params.outputFormat || 'jpg',
        quality: params.quality || 90,
        templateType: params.template.type
      })
      
      const generationTime = Date.now() - startTime
      
      return {
        imageUrl: response.imageUrl,
        width: response.width,
        height: response.height,
        format: response.format,
        sizeBytes: response.sizeBytes,
        generationTime,
        metadata: {
          prompt,
          model: response.model || 'nano-banana-carousel-v1',
          parameters: {
            template: params.template.name,
            carouselIndex: carouselContext.carouselIndex,
            totalImages: carouselContext.totalImages,
            quality: params.quality || 90
          }
        }
      }
    } catch (error) {
      console.error('Error generating carousel image:', error)
      throw new Error(`Failed to generate carousel image ${carouselContext.carouselIndex + 1}`)
    }
  }

  /**
   * Construye el prompt para imagen simple
   */
  private buildSimpleImagePrompt(params: GenerateSimpleImageParams): string {
    const platformSpecs = this.getPlatformSpecs(params.platform)
    
    return `
Create a professional social media image for ${params.platform}.

CONTEXT: ${params.context}

BASE RESOURCE: ${params.baseResource.name} (${params.baseResource.type})

REQUIREMENTS:
- Platform: ${params.platform}
- Dimensions: ${platformSpecs.dimensions}
- Style: ${platformSpecs.style}
- Professional and engaging
- High quality visual
- Appropriate for the context provided
- Maintain brand consistency

OUTPUT: Generate a polished image that incorporates the base resource in the given context, optimized for ${params.platform}.
`
  }

  /**
   * Construye el prompt para imagen con template
   */
  private buildTemplateImagePrompt(params: GenerateTemplateImageParams): string {
    const textAreas = Object.entries(params.textOverlays)
      .map(([area, text]) => `${area}: "${text}"`)
      .join('\n')

    return `
Create a professional template-based image for social media.

TEMPLATE: ${params.template.name} (${params.template.type})
BASE RESOURCE: ${params.baseResource.name}

TEXT OVERLAYS:
${textAreas}

REQUIREMENTS:
- Use the specified template layout
- Incorporate the base resource appropriately
- Apply text overlays in designated areas
- Maintain professional design standards
- Ensure text is readable and well-positioned
- Create cohesive visual hierarchy
- High quality output

OUTPUT: Generate a polished template-based image with all text elements properly integrated.
`
  }

  /**
   * Construye el prompt para imagen de carrusel
   */
  private buildCarouselImagePrompt(
    params: GenerateTemplateImageParams, 
    carouselContext: any
  ): string {
    const textAreas = Object.entries(params.textOverlays)
      .map(([area, text]) => `${area}: "${text}"`)
      .join('\n')

    return `
Create a carousel image (${carouselContext.carouselIndex + 1}/${carouselContext.totalImages}) for social media.

TEMPLATE: ${params.template.name} (${params.template.type})
BASE RESOURCE: ${params.baseResource.name}

TEXT OVERLAYS:
${textAreas}

CAROUSEL CONTEXT:
- Image ${carouselContext.carouselIndex + 1} of ${carouselContext.totalImages}
- Must maintain visual coherence with other carousel images
- Part of a sequential story/message

REQUIREMENTS:
- Use consistent visual style across carousel
- Incorporate the base resource appropriately
- Apply text overlays in designated areas
- Maintain design coherence with previous images
- Ensure smooth visual flow in sequence
- Professional and engaging design
- High quality output

OUTPUT: Generate a carousel image that fits seamlessly in the sequence while maintaining individual impact.
`
  }

  /**
   * Realiza llamada a la API de Nano Banana con reintentos
   */
  private async callNanoBananaAPI(endpoint: string, payload: any): Promise<any> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'User-Agent': 'Postia-AI-Content-Generator/1.0'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Nano Banana API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
        }

        const data = await response.json()
        
        if (!data.imageUrl) {
          throw new Error('Invalid response format from Nano Banana API')
        }

        return data

      } catch (error) {
        lastError = error as Error
        console.warn(`Nano Banana API attempt ${attempt} failed:`, error)
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('All Nano Banana API attempts failed')
  }

  /**
   * Obtiene las dimensiones recomendadas por plataforma
   */
  private getPlatformDimensions(platform: SocialNetwork): { width: number, height: number } {
    const dimensions = {
      instagram: { width: 1080, height: 1080 }, // Square post
      facebook: { width: 1200, height: 630 },   // Landscape
      linkedin: { width: 1200, height: 627 },   // Landscape
      twitter: { width: 1200, height: 675 }     // 16:9 ratio
    }

    return dimensions[platform] || dimensions.instagram
  }

  /**
   * Obtiene especificaciones de estilo por plataforma
   */
  private getPlatformSpecs(platform: SocialNetwork): { dimensions: string, style: string } {
    const specs = {
      instagram: {
        dimensions: '1080x1080 (square)',
        style: 'vibrant, visual-first, lifestyle-oriented'
      },
      facebook: {
        dimensions: '1200x630 (landscape)',
        style: 'engaging, community-focused, informative'
      },
      linkedin: {
        dimensions: '1200x627 (landscape)',
        style: 'professional, business-oriented, authoritative'
      },
      twitter: {
        dimensions: '1200x675 (16:9)',
        style: 'concise, trending, conversational'
      }
    }

    return specs[platform] || specs.instagram
  }

  /**
   * Valida que un recurso sea compatible con la generación de imágenes
   */
  validateResource(resource: Resource): boolean {
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
    return supportedTypes.includes(resource.mimeType)
  }

  /**
   * Estima el tiempo de generación basado en el tipo de contenido
   */
  estimateGenerationTime(contentType: 'simple' | 'template' | 'carousel', carouselLength?: number): number {
    const baseTimes = {
      simple: 15000,    // 15 segundos
      template: 30000,  // 30 segundos
      carousel: 45000   // 45 segundos base
    }

    let estimatedTime = baseTimes[contentType]
    
    if (contentType === 'carousel' && carouselLength) {
      estimatedTime += (carouselLength - 1) * 20000 // 20 segundos adicionales por imagen
    }

    return estimatedTime
  }

  /**
   * Configura nuevos parámetros del servicio
   */
  updateConfig(config: Partial<NanoBananaConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Configura parámetros de reintentos
   */
  setRetryConfig(attempts: number, delay: number): void {
    this.retryAttempts = Math.max(1, attempts)
    this.retryDelay = Math.max(100, delay)
  }

  /**
   * Obtiene información de estado del servicio
   */
  async getServiceStatus(): Promise<{ status: 'online' | 'offline', latency?: number }> {
    try {
      const startTime = Date.now()
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      })
      
      const latency = Date.now() - startTime
      
      return {
        status: response.ok ? 'online' : 'offline',
        latency: response.ok ? latency : undefined
      }
    } catch (error) {
      return { status: 'offline' }
    }
  }
}

// Factory function para crear instancia del servicio
export function createNanoBananaService(): NanoBananaService {
  const apiKey = process.env.NANO_BANANA_API_KEY
  
  if (!apiKey) {
    throw new Error('NANO_BANANA_API_KEY environment variable is required')
  }

  return new NanoBananaService({ apiKey })
}