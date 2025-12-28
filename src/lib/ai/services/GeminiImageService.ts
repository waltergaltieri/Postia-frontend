import { Resource, Template, SocialNetwork } from '../../database/types'
import { getValidatedGeminiConfig } from '../config/gemini-config'
import { RetryMiddleware } from '../middleware/RetryMiddleware'
import { loggingService } from '../monitoring/LoggingService'
import { metricsService } from '../monitoring/MetricsService'
import { notificationService } from '../monitoring/NotificationService'
import { GenerationErrorFactory } from '../types/errors'

export interface ImageGenerationParams {
  contentIdea: string
  baseResource?: Resource
  platform: SocialNetwork
  style?: 'professional' | 'casual' | 'creative' | 'minimalist'
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'story'
}

export interface TemplateImageGenerationParams {
  contentIdea: string
  template: Template
  baseResource: Resource
  textOverlays: Record<string, string>
  platform: SocialNetwork
}

export interface CarouselGenerationParams {
  contentIdea: string
  template: Template
  baseResources: Resource[]
  textSequences: Record<string, string>[]
  platform: SocialNetwork
}

export interface ImageGenerationResult {
  imageUrl: string
  width: number
  height: number
  format: string
  sizeBytes: number
  generationTime: number
  metadata: {
    prompt: string
    model: string
    parameters: Record<string, any>
    nanoBananaJobId?: string
  }
}

export interface CarouselGenerationResult {
  images: ImageGenerationResult[]
  totalGenerationTime: number
  coherenceScore: number // Puntuación de coherencia visual entre imágenes
}

/**
 * Servicio especializado para generación de imágenes usando Nano Banana (Gemini)
 * Utiliza prompts de exactitud extrema para máxima calidad visual
 */
export class GeminiImageService {
  private config: ReturnType<typeof getValidatedGeminiConfig>
  private retryMiddleware: RetryMiddleware
  private retryAttempts: number = 3
  private retryDelay: number = 2000 // Mayor delay para imágenes
  private nanoBananaEndpoint: string

  // Dimensiones optimizadas por plataforma
  private readonly platformDimensions = {
    instagram: { width: 1080, height: 1080, ratio: '1:1' },
    facebook: { width: 1200, height: 630, ratio: '1.91:1' },
    linkedin: { width: 1200, height: 627, ratio: '1.91:1' },
    twitter: { width: 1200, height: 675, ratio: '16:9' }
  }

  constructor() {
    this.config = getValidatedGeminiConfig()
    this.retryMiddleware = RetryMiddleware.forImageGeneration()
    // Nano Banana es un agente especializado de Gemini para imágenes
    this.nanoBananaEndpoint = process.env.NANO_BANANA_ENDPOINT ||
      'https://generativelanguage.googleapis.com/v1beta/models/nano-banana'
  }

  /**
   * Genera imagen simple basada en recursos y contexto
   */
  async generateSimpleImage(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const operationId = `img_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    // Iniciar tracking de operación
    metricsService.startOperationTracking(operationId, 'generateSimpleImage')

    // Log inicio de operación
    loggingService.info('Starting simple image generation', {
      platform: params.platform,
      style: params.style,
      hasBaseResource: !!params.baseResource,
      operationId
    }, 'ai-generation')

    const prompt = this.buildExtremeQualityImagePrompt(params)
    const dimensions = this.platformDimensions[params.platform]

    try {
      // Usar retry middleware para la llamada a Nano Banana
      const result = await this.retryMiddleware.executeWithRetry(
        () => this.callNanoBananaAPI({
          prompt,
          baseImageUrl: params.baseResource?.url,
          platform: params.platform,
          dimensions,
          style: params.style || 'professional',
          aspectRatio: params.aspectRatio || 'square'
        }),
        `generateSimpleImage_${params.platform}`
      )

      const generationTime = metricsService.endOperationTracking(operationId)

      // Registrar métricas de éxito
      metricsService.recordNanoBananaAPIUsage(
        'generateImage',
        true,
        generationTime,
        result.result.sizeBytes,
        result.result.cost
      )

      metricsService.recordAgentPerformance(
        'text-image',
        true,
        generationTime,
        result.context.attempt - 1,
        undefined,
        1 // 1 imagen generada
      )

      // Log éxito
      loggingService.logAIOperation(
        'generateSimpleImage',
        'text-image',
        operationId,
        'unknown',
        true,
        generationTime,
        {
          platform: params.platform,
          imageSize: result.result.sizeBytes,
          retryCount: result.context.attempt - 1
        }
      )

      return {
        imageUrl: result.result.imageUrl,
        width: result.result.width || dimensions.width,
        height: result.result.height || dimensions.height,
        format: result.result.format || 'jpeg',
        sizeBytes: result.result.sizeBytes || 0,
        generationTime,
        metadata: {
          prompt,
          model: 'nano-banana-v2',
          parameters: {
            platform: params.platform,
            style: params.style || 'professional',
            baseResource: params.baseResource?.name,
            aspectRatio: params.aspectRatio || 'square'
          },
          nanoBananaJobId: result.result.jobId
        }
      }
    } catch (error) {
      const generationTime = metricsService.endOperationTracking(operationId)
      const generationError = GenerationErrorFactory.fromError(error as Error, 'NANO_BANANA_API_FAILURE')

      // Registrar métricas de error
      metricsService.recordNanoBananaAPIUsage(
        'generateImage',
        false,
        generationTime,
        undefined,
        undefined,
        generationError
      )

      metricsService.recordAgentPerformance(
        'text-image',
        false,
        generationTime,
        this.retryAttempts,
        undefined,
        0
      )

      // Log error
      loggingService.logAIOperation(
        'generateSimpleImage',
        'text-image',
        operationId,
        'unknown',
        false,
        generationTime,
        {
          platform: params.platform,
          error: generationError.message
        },
        generationError
      )

      // Notificar error al usuario
      notificationService.notifyGenerationError(generationError, {
        agentType: 'text-image',
        publicationId: operationId
      })

      throw new Error(`Failed to generate simple image: ${error}`)
    }
  }

  /**
   * Genera imagen compleja usando template con textos integrados
   */
  async generateTemplateImage(params: TemplateImageGenerationParams): Promise<ImageGenerationResult> {
    const startTime = Date.now()

    const prompt = this.buildExtremeQualityTemplatePrompt(params)
    const dimensions = this.platformDimensions[params.platform]

    try {
      const result = await this.retryMiddleware.executeWithRetry(
        () => this.callNanoBananaAPI({
          prompt,
          templateId: params.template.id,
          templateType: params.template.type,
          baseImageUrl: params.baseResource.url,
          textOverlays: params.textOverlays,
          platform: params.platform,
          dimensions,
          isTemplate: true
        }),
        'generateTemplateImage'
      )

      const generationTime = Date.now() - startTime

      return {
        imageUrl: result.result.imageUrl,
        width: result.result.width || dimensions.width,
        height: result.result.height || dimensions.height,
        format: result.result.format || 'jpeg',
        sizeBytes: result.result.sizeBytes || 0,
        generationTime,
        metadata: {
          prompt,
          model: 'nano-banana-template-v2',
          parameters: {
            platform: params.platform,
            template: params.template.name,
            textOverlays: Object.keys(params.textOverlays),
            baseResource: params.baseResource.name
          },
          nanoBananaJobId: result.result.jobId
        }
      }
    } catch (error) {
      console.error('Error generating template image:', error)
      throw new Error(`Failed to generate template image: ${error}`)
    }
  }

  /**
   * Genera carrusel de imágenes con coherencia visual extrema
   */
  async generateCarousel(params: CarouselGenerationParams): Promise<CarouselGenerationResult> {
    if (params.baseResources.length !== params.textSequences.length) {
      throw new Error('Number of base resources must match number of text sequences')
    }

    const startTime = Date.now()
    const images: ImageGenerationResult[] = []
    let coherenceScore = 0

    try {
      // Generar contexto de coherencia para todo el carrusel
      const carouselContext = this.buildCarouselCoherenceContext(params)

      // Generar cada imagen del carrusel secuencialmente para mantener coherencia
      for (let i = 0; i < params.baseResources.length; i++) {
        const resource = params.baseResources[i]
        const textOverlay = params.textSequences[i]

        const imageParams: TemplateImageGenerationParams = {
          contentIdea: params.contentIdea,
          template: params.template,
          baseResource: resource,
          textOverlays: textOverlay,
          platform: params.platform
        }

        // Agregar contexto de carrusel para mantener coherencia visual
        const carouselImageContext = {
          ...carouselContext,
          carouselIndex: i,
          totalImages: params.baseResources.length,
          previousImages: images.map(img => img.imageUrl),
          isCarouselItem: true
        }

        const image = await this.generateCarouselImage(imageParams, carouselImageContext)
        images.push(image)

        // Calcular coherencia visual (simulado - en implementación real usaría análisis de imagen)
        coherenceScore += this.calculateImageCoherence(image, images.slice(0, -1))
      }

      const totalGenerationTime = Date.now() - startTime
      const avgCoherenceScore = images.length > 1 ? coherenceScore / (images.length - 1) : 1.0

      return {
        images,
        totalGenerationTime,
        coherenceScore: avgCoherenceScore
      }
    } catch (error) {
      console.error('Error generating carousel:', error)
      throw new Error(`Failed to generate carousel: ${error}`)
    }
  }

  /**
   * Genera una imagen individual para carrusel con contexto de coherencia
   */
  private async generateCarouselImage(
    params: TemplateImageGenerationParams,
    carouselContext: any
  ): Promise<ImageGenerationResult> {
    const prompt = this.buildExtremeQualityCarouselPrompt(params, carouselContext)
    const dimensions = this.platformDimensions[params.platform]

    try {
      const result = await this.retryMiddleware.executeWithRetry(
        () => this.callNanoBananaAPI({
          prompt,
          templateId: params.template.id,
          templateType: params.template.type,
          baseImageUrl: params.baseResource.url,
          textOverlays: params.textOverlays,
          carouselContext,
          platform: params.platform,
          dimensions,
          isCarousel: true
        }),
        'generateCarouselImage'
      )

      return {
        imageUrl: result.result.imageUrl,
        width: result.result.width || dimensions.width,
        height: result.result.height || dimensions.height,
        format: result.result.format || 'jpeg',
        sizeBytes: result.result.sizeBytes || 0,
        generationTime: 0, // Se calculará en el método padre
        metadata: {
          prompt,
          model: 'nano-banana-carousel-v2',
          parameters: {
            platform: params.platform,
            template: params.template.name,
            carouselIndex: carouselContext.carouselIndex,
            totalImages: carouselContext.totalImages
          },
          nanoBananaJobId: result.result.jobId
        }
      }
    } catch (error) {
      console.error('Error generating carousel image:', error)
      throw new Error(`Failed to generate carousel image ${carouselContext.carouselIndex + 1}: ${error}`)
    }
  }

  /**
   * Construye prompt de exactitud extrema para imagen simple
   */
  private buildExtremeQualityImagePrompt(params: ImageGenerationParams): string {
    const { contentIdea, baseResource, platform, style, aspectRatio } = params
    const dimensions = this.platformDimensions[platform]
    const platformSpecs = this.getPlatformVisualSpecs(platform)

    return `
ERES UN DISEÑADOR VISUAL EXPERTO DE NIVEL MUNDIAL especializado en ${platform.toUpperCase()}.

MISIÓN CRÍTICA: Crear imagen de CALIDAD EXTREMA que genere máximo impacto visual y engagement.

═══════════════════════════════════════════════════════════════════════════════

🎯 IDEA DE CONTENIDO:
${contentIdea}

${baseResource ? `\n📸 RECURSO BASE:\n• Nombre: ${baseResource.name}\n• Tipo: ${baseResource.type}\n• URL: ${baseResource.url}\n` : ''}

═══════════════════════════════════════════════════════════════════════════════

📱 ESPECIFICACIONES DE ${platform.toUpperCase()}:
${platformSpecs}

🎨 ESPECIFICACIONES TÉCNICAS:
• Dimensiones: ${dimensions.width}x${dimensions.height} (${dimensions.ratio})
• Formato: JPEG de alta calidad
• Estilo: ${style || 'professional'}
• Aspecto: ${aspectRatio || 'square'}
• Resolución: Máxima calidad para ${platform}

═══════════════════════════════════════════════════════════════════════════════

⚡ REQUISITOS DE CALIDAD EXTREMA:

1. COMPOSICIÓN PERFECTA: Regla de tercios, balance visual impecable
2. COLORES VIBRANTES: Paleta que destaque en feed de ${platform}
3. TIPOGRAFÍA LEGIBLE: Si incluye texto, debe ser perfectamente legible
4. CONTRASTE ÓPTIMO: Máximo contraste para capturar atención
5. CALIDAD PROFESIONAL: Nivel de agencia de publicidad premium
6. OPTIMIZACIÓN MÓVIL: Perfecto en dispositivos móviles
7. BRAND CONSISTENCY: Coherente con estándares visuales profesionales
8. ENGAGEMENT FOCUS: Diseñado para maximizar interacciones

═══════════════════════════════════════════════════════════════════════════════

🎨 ELEMENTOS VISUALES CRÍTICOS:
• Punto focal claro y definido
• Jerarquía visual que guíe la mirada
• Uso estratégico del espacio negativo
• Elementos que inviten a la acción
• Coherencia cromática profesional
• Texturas y profundidad visual
• Iluminación que realce el mensaje

═══════════════════════════════════════════════════════════════════════════════

🚀 TÉCNICAS AVANZADAS:
• Psicología del color para ${platform}
• Composición que genere stopping power
• Elementos visuales que comuniquen emoción
• Diseño que funcione con y sin texto
• Optimización para algoritmos de ${platform}
• Visual storytelling en una sola imagen

═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIÓN FINAL:
Genera una imagen de CALIDAD EXTREMA que sea perfecta para ${platform}.
La imagen debe ser visualmente impactante, profesional y optimizada para máximo engagement.

CREAR IMAGEN AHORA.
`
  }

  /**
   * Construye prompt de exactitud extrema para imagen con template
   */
  private buildExtremeQualityTemplatePrompt(params: TemplateImageGenerationParams): string {
    const { contentIdea, template, baseResource, textOverlays, platform } = params
    const dimensions = this.platformDimensions[platform]

    const textAreas = Object.entries(textOverlays)
      .map(([area, text]) => `• ${area}: "${text}"`)
      .join('\n')

    return `
ERES UN DISEÑADOR GRÁFICO EXPERTO DE NIVEL MUNDIAL especializado en templates para ${platform.toUpperCase()}.

MISIÓN CRÍTICA: Crear imagen con template de CALIDAD EXTREMA con integración perfecta de textos.

═══════════════════════════════════════════════════════════════════════════════

🎯 IDEA DE CONTENIDO:
${contentIdea}

🎨 TEMPLATE INFORMACIÓN:
• Nombre: ${template.name}
• Tipo: ${template.type}
• ID: ${template.id}

📸 RECURSO BASE:
• Nombre: ${baseResource.name}
• Tipo: ${baseResource.type}
• URL: ${baseResource.url}

═══════════════════════════════════════════════════════════════════════════════

📝 TEXTOS A INTEGRAR:
${textAreas}

📱 ESPECIFICACIONES TÉCNICAS:
• Plataforma: ${platform.toUpperCase()}
• Dimensiones: ${dimensions.width}x${dimensions.height} (${dimensions.ratio})
• Formato: JPEG de máxima calidad
• Template: ${template.type === 'single' ? 'Imagen única' : 'Carrusel'}

═══════════════════════════════════════════════════════════════════════════════

⚡ REQUISITOS DE CALIDAD EXTREMA:

1. INTEGRACIÓN PERFECTA: Textos perfectamente integrados en el diseño
2. LEGIBILIDAD MÁXIMA: Todos los textos deben ser perfectamente legibles
3. JERARQUÍA VISUAL: Clara jerarquía entre diferentes elementos de texto
4. COMPOSICIÓN PROFESIONAL: Layout que guíe la mirada naturalmente
5. COHERENCIA CROMÁTICA: Colores que complementen el recurso base
6. CONTRASTE ÓPTIMO: Máximo contraste entre texto y fondo
7. TIPOGRAFÍA PREMIUM: Fuentes que transmitan profesionalismo
8. BALANCE PERFECTO: Equilibrio entre imagen, texto y espacio negativo

═══════════════════════════════════════════════════════════════════════════════

🎨 ESPECIFICACIONES DE DISEÑO:
• Usar el recurso base como elemento principal
• Integrar todos los textos de manera orgánica
• Mantener legibilidad en todos los tamaños
• Crear flujo visual que conecte todos los elementos
• Aplicar efectos que realcen sin distraer
• Optimizar para visualización en ${platform}

═══════════════════════════════════════════════════════════════════════════════

🚀 TÉCNICAS AVANZADAS DE TEMPLATE:
• Capas de texto con efectos profesionales
• Uso estratégico de sombras y contornos
• Gradientes que mejoren legibilidad
• Elementos gráficos que complementen
• Composición que funcione en móvil
• Diseño que destaque en feed

═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIÓN FINAL:
Genera una imagen de template de CALIDAD EXTREMA que integre perfectamente todos los textos.
La imagen debe ser visualmente impactante, profesional y optimizada para ${platform}.

CREAR IMAGEN CON TEMPLATE AHORA.
`
  }

  /**
   * Construye prompt de exactitud extrema para imagen de carrusel
   */
  private buildExtremeQualityCarouselPrompt(
    params: TemplateImageGenerationParams,
    carouselContext: any
  ): string {
    const { contentIdea, template, baseResource, textOverlays, platform } = params
    const { carouselIndex, totalImages, previousImages } = carouselContext

    const textAreas = Object.entries(textOverlays)
      .map(([area, text]) => `• ${area}: "${text}"`)
      .join('\n')

    return `
ERES UN DISEÑADOR EXPERTO DE NIVEL MUNDIAL especializado en carruseles para ${platform.toUpperCase()}.

MISIÓN CRÍTICA: Crear imagen ${carouselIndex + 1}/${totalImages} de carrusel con COHERENCIA VISUAL EXTREMA.

═══════════════════════════════════════════════════════════════════════════════

🎯 IDEA DE CONTENIDO:
${contentIdea}

🎠 CONTEXTO DE CARRUSEL:
• Imagen: ${carouselIndex + 1} de ${totalImages}
• Template: ${template.name} (${template.type})
• Recurso base: ${baseResource.name}

📝 TEXTOS PARA ESTA IMAGEN:
${textAreas}

${previousImages.length > 0 ? `\n🔗 IMÁGENES PREVIAS DEL CARRUSEL:\n${previousImages.map((url, i) => `• Imagen ${i + 1}: ${url}`).join('\n')}\n` : ''}

═══════════════════════════════════════════════════════════════════════════════

⚡ REQUISITOS DE COHERENCIA EXTREMA:

1. CONSISTENCIA VISUAL: Mantener estilo visual idéntico a imágenes previas
2. PALETA CROMÁTICA: Usar exactamente los mismos colores base
3. TIPOGRAFÍA UNIFORME: Mismas fuentes y estilos de texto
4. COMPOSICIÓN COHERENTE: Layout que fluya naturalmente con secuencia
5. ELEMENTOS GRÁFICOS: Mantener elementos decorativos consistentes
6. ILUMINACIÓN UNIFORME: Misma dirección y calidad de luz
7. FILTROS CONSISTENTES: Aplicar mismos efectos y filtros
8. PROGRESIÓN NARRATIVA: Avanzar la historia visual del carrusel

═══════════════════════════════════════════════════════════════════════════════

🎨 ESPECIFICACIONES DE CARRUSEL:
• Esta imagen debe sentirse parte de una serie cohesiva
• Mantener elementos visuales que conecten con imágenes previas
• Crear anticipación para próximas imágenes (si no es la última)
• Usar el recurso base de manera consistente con el estilo establecido
• Integrar textos manteniendo jerarquía visual del carrusel

═══════════════════════════════════════════════════════════════════════════════

🚀 TÉCNICAS AVANZADAS DE CARRUSEL:
• Elementos visuales que creen continuidad
• Transiciones suaves entre conceptos
• Uso de colores que mantengan unidad
• Composición que invite a deslizar
• Storytelling visual progresivo
• Coherencia que fortalezca el mensaje general

═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIÓN FINAL:
Genera imagen ${carouselIndex + 1}/${totalImages} del carrusel con COHERENCIA VISUAL EXTREMA.
La imagen debe mantener perfecta consistencia con las previas y avanzar la narrativa visual.

CREAR IMAGEN DE CARRUSEL AHORA.
`
  }

  /**
   * Construye contexto de coherencia para carrusel completo
   */
  private buildCarouselCoherenceContext(params: CarouselGenerationParams): any {
    return {
      contentIdea: params.contentIdea,
      template: params.template,
      platform: params.platform,
      totalImages: params.baseResources.length,
      visualTheme: this.extractVisualTheme(params.contentIdea),
      colorPalette: this.suggestColorPalette(params.platform),
      designStyle: this.determineDesignStyle(params.template, params.platform)
    }
  }

  /**
   * Extrae tema visual de la idea de contenido
   */
  private extractVisualTheme(contentIdea: string): string {
    // Análisis simple de palabras clave para determinar tema visual
    const themes = {
      professional: ['negocio', 'empresa', 'profesional', 'corporativo', 'oficina'],
      creative: ['creativo', 'arte', 'diseño', 'innovación', 'original'],
      lifestyle: ['vida', 'estilo', 'personal', 'experiencia', 'cotidiano'],
      tech: ['tecnología', 'digital', 'software', 'app', 'innovación'],
      wellness: ['salud', 'bienestar', 'fitness', 'mental', 'cuidado']
    }

    const lowerContent = contentIdea.toLowerCase()

    for (const [theme, keywords] of Object.entries(themes)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return theme
      }
    }

    return 'professional' // Default
  }

  /**
   * Sugiere paleta de colores por plataforma
   */
  private suggestColorPalette(platform: SocialNetwork): string[] {
    const palettes = {
      instagram: ['#E4405F', '#FCAF45', '#833AB4', '#C13584', '#FD1D1D'],
      linkedin: ['#0077B5', '#00A0DC', '#8CC8FF', '#005885', '#004471'],
      facebook: ['#1877F2', '#42A5F5', '#E3F2FD', '#1565C0', '#0D47A1'],
      twitter: ['#1DA1F2', '#AAB8C2', '#657786', '#14171A', '#E1E8ED']
    }

    return palettes[platform] || palettes.instagram
  }

  /**
   * Determina estilo de diseño basado en template y plataforma
   */
  private determineDesignStyle(template: Template, platform: SocialNetwork): string {
    if (template.type === 'carousel') {
      return platform === 'linkedin' ? 'professional-carousel' : 'creative-carousel'
    }

    return platform === 'linkedin' ? 'professional-single' : 'creative-single'
  }

  /**
   * Calcula coherencia visual entre imágenes (simulado)
   */
  private calculateImageCoherence(newImage: ImageGenerationResult, previousImages: ImageGenerationResult[]): number {
    // En implementación real, esto analizaría las imágenes visualmente
    // Por ahora, simulamos basado en metadatos
    if (previousImages.length === 0) return 1.0

    // Simulación basada en consistencia de parámetros
    const consistency = previousImages.every(img =>
      img.metadata.parameters.platform === newImage.metadata.parameters.platform
    ) ? 0.8 : 0.6

    return consistency + (Math.random() * 0.2) // Añadir variabilidad simulada
  }

  /**
   * Obtiene especificaciones visuales por plataforma
   */
  private getPlatformVisualSpecs(platform: SocialNetwork): string {
    const specs = {
      instagram: `
• Estilo: Visual-first, vibrante, aspiracional
• Colores: Saturados, contrastantes, que destaquen en feed
• Composición: Centrada, simétrica, visualmente impactante
• Elementos: Lifestyle, auténtico, visualmente atractivo
• Optimización: Móvil-first, thumb-stopping power`,

      linkedin: `
• Estilo: Profesional, limpio, authoritative
• Colores: Corporativos, azules, grises, blancos
• Composición: Estructurada, formal, business-oriented
• Elementos: Datos, gráficos, profesional, informativo
• Optimización: Desktop y móvil, professional feed`,

      facebook: `
• Estilo: Conversacional, community-focused, familiar
• Colores: Amigables, cálidos, accesibles
• Composición: Natural, storytelling, emocional
• Elementos: Personal, relatable, community-building
• Optimización: Móvil y desktop, social sharing`,

      twitter: `
• Estilo: Conciso, trending, conversacional
• Colores: Contrastantes, que destaquen en timeline
• Composición: Simple, directo, impacto inmediato
• Elementos: Trending, actual, conversational
• Optimización: Móvil-first, quick consumption`
    }

    return specs[platform] || specs.instagram
  }

  /**
   * Realiza llamada directa a la API de Nano Banana (sin reintentos, manejados por middleware)
   */
  private async callNanoBananaAPI(payload: any): Promise<any> {
    const startTime = Date.now()

    try {
      // Simular llamada a Nano Banana (agente de Gemini para imágenes)
      // En implementación real, esto sería una llamada HTTP a la API de Nano Banana
      const response = await this.simulateNanoBananaCall(payload)

      const latency = Date.now() - startTime

      // Log exitoso de API
      loggingService.logNanoBanana(
        'generateImage',
        response.jobId,
        true,
        latency,
        response.sizeBytes
      )

      return {
        ...response,
        cost: this.estimateImageCost(response.sizeBytes, payload.dimensions)
      }

    } catch (error) {
      const latency = Date.now() - startTime

      // Si ya es un GenerationError, re-lanzarlo
      if (error && typeof error === 'object' && 'type' in error) {
        loggingService.logNanoBanana(
          'generateImage',
          'unknown',
          false,
          latency,
          undefined,
          error as any
        )
        throw error
      }

      // Convertir error genérico a GenerationError
      const generationError = GenerationErrorFactory.fromError(error as Error, 'NANO_BANANA_API_FAILURE')

      loggingService.logNanoBanana(
        'generateImage',
        'unknown',
        false,
        latency,
        undefined,
        generationError
      )

      throw generationError
    }
  }

  /**
   * Simula llamada a Nano Banana (en implementación real sería llamada HTTP real)
   */
  private async simulateNanoBananaCall(payload: any): Promise<any> {
    // Simular delay de generación de imagen
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000))

    // Simular respuesta exitosa
    const mockResponse = {
      imageUrl: `https://generated-images.nano-banana.com/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
      width: payload.dimensions?.width || 1080,
      height: payload.dimensions?.height || 1080,
      format: 'jpeg',
      sizeBytes: Math.floor(200000 + Math.random() * 300000), // 200KB - 500KB
      jobId: `nb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Simular posibles errores (5% de probabilidad)
    if (Math.random() < 0.05) {
      // Crear error específico de Nano Banana
      throw GenerationErrorFactory.createNanoBananaError(
        'Nano Banana API temporarily unavailable',
        {
          jobId: mockResponse.jobId,
          imageParams: payload
        }
      )
    }

    return mockResponse
  }

  /**
   * Estima el costo de generación de imagen
   */
  private estimateImageCost(sizeBytes: number, dimensions: any): number {
    // Costo base por imagen + costo por tamaño
    const baseCost = 0.02 // $0.02 por imagen base
    const sizeCost = (sizeBytes / 1000000) * 0.01 // $0.01 por MB
    const dimensionMultiplier = (dimensions.width * dimensions.height) / (1080 * 1080) // Factor por resolución

    return baseCost + sizeCost + (baseCost * dimensionMultiplier * 0.1)
  }

  /**
   * Valida que un recurso sea compatible con generación de imágenes
   */
  validateResource(resource: Resource): boolean {
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

    return supportedTypes.includes(resource.mimeType) && resource.sizeBytes <= maxSize
  }

  /**
   * Estima tiempo de generación basado en tipo de contenido
   */
  estimateGenerationTime(contentType: 'simple' | 'template' | 'carousel', carouselLength?: number): number {
    const baseTimes = {
      simple: 15000,    // 15 segundos
      template: 30000,  // 30 segundos
      carousel: 45000   // 45 segundos base
    }

    let estimatedTime = baseTimes[contentType]

    if (contentType === 'carousel' && carouselLength) {
      estimatedTime += (carouselLength - 1) * 25000 // 25 segundos adicionales por imagen
    }

    return estimatedTime
  }

  /**
   * Obtiene dimensiones optimizadas para una plataforma
   */
  getPlatformDimensions(platform: SocialNetwork): { width: number; height: number; ratio: string } {
    return this.platformDimensions[platform]
  }

  /**
   * Configura parámetros de reintentos
   */
  setRetryConfig(attempts: number, delay: number): void {
    this.retryAttempts = Math.max(1, attempts)
    this.retryDelay = Math.max(1000, delay)
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getServiceStats(): {
    platformDimensions: typeof this.platformDimensions
    retryConfig: { attempts: number; delay: number }
    endpoint: string
  } {
    return {
      platformDimensions: this.platformDimensions,
      retryConfig: {
        attempts: this.retryAttempts,
        delay: this.retryDelay
      },
      endpoint: this.nanoBananaEndpoint
    }
  }

  /**
   * Verifica estado del servicio Nano Banana
   */
  async checkServiceHealth(): Promise<{ status: 'online' | 'offline'; latency?: number }> {
    try {
      const startTime = Date.now()

      // Simular health check
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))

      const latency = Date.now() - startTime

      return {
        status: 'online',
        latency
      }
    } catch (error) {
      return { status: 'offline' }
    }
  }
}

/**
 * Factory function para crear instancia del servicio
 */
export function createGeminiImageService(): GeminiImageService {
  try {
    return new GeminiImageService()
  } catch (error) {
    console.error('❌ Error creando servicio de imágenes Gemini:', error)
    throw error
  }
}