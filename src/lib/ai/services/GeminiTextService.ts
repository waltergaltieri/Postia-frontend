import { SocialNetwork, BrandManual } from '../../database/types'
import { getValidatedGeminiConfig } from '../config/gemini-config'
import { RetryMiddleware } from '../middleware/RetryMiddleware'
import { loggingService } from '../monitoring/LoggingService'
import { metricsService } from '../monitoring/MetricsService'
import { notificationService } from '../monitoring/NotificationService'
import { GenerationErrorFactory } from '../types/errors'

export interface PlatformLimits {
  instagram: number
  linkedin: number
  twitter: number
  facebook: number
  tiktok: number
}

export interface TextGenerationParams {
  contentIdea: string
  platform: SocialNetwork
  brandManual: BrandManual
  contentType: 'text_simple' | 'text_image_simple' | 'text_image_template' | 'carousel'
  additionalContext?: string
}

export interface TemplateTextGenerationParams {
  contentIdea: string
  templateDescription: string
  textAreas: Array<{
    id: string
    name: string
    maxLength: number
    placeholder?: string
  }>
  brandManual: BrandManual
}

export interface TextGenerationResult {
  text: string
  platform: SocialNetwork
  characterCount: number
  withinLimits: boolean
  metadata: {
    prompt: string
    model: string
    generationTime: number
    retryCount: number
  }
}

export interface TemplateTextResult {
  texts: Record<string, string>
  metadata: {
    prompt: string
    model: string
    generationTime: number
    retryCount: number
  }
}

/**
 * Servicio especializado para generación de texto con Gemini
 * Utiliza prompts de calidad extrema optimizados para redes sociales
 */
export class GeminiTextService {
  private config: ReturnType<typeof getValidatedGeminiConfig>
  private retryMiddleware: RetryMiddleware
  private retryAttempts: number = 3
  private retryDelay: number = 1000

  // Límites de caracteres por plataforma social
  private readonly platformLimits: PlatformLimits = {
    instagram: 2200,
    linkedin: 3000,
    twitter: 280,
    facebook: 63206,
    tiktok: 2200
  }

  constructor() {
    this.config = getValidatedGeminiConfig()
    this.retryMiddleware = RetryMiddleware.forTextGeneration()
  }

  /**
   * Genera texto optimizado para una plataforma social específica
   */
  async generateSocialText(params: TextGenerationParams): Promise<TextGenerationResult> {
    const operationId = `text_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()
    
    // Iniciar tracking de operación
    metricsService.startOperationTracking(operationId, 'generateSocialText')
    
    // Log inicio de operación
    loggingService.info('Starting social text generation', {
      platform: params.platform,
      contentType: params.contentType,
      operationId
    }, 'ai-generation')
    
    const prompt = this.buildExtremeQualityTextPrompt(params)
    
    try {
      // Usar retry middleware para la llamada a Gemini
      const result = await this.retryMiddleware.executeWithRetry(
        () => this.callGeminiAPI(prompt),
        `generateSocialText_${params.platform}`
      )
      
      const generationTime = metricsService.endOperationTracking(operationId)
      const cleanText = this.cleanGeneratedText(result.result.text)
      const characterCount = cleanText.length
      const withinLimits = characterCount <= this.platformLimits[params.platform]
      
      // Registrar métricas de éxito
      metricsService.recordGeminiAPIUsage(
        'generateContent',
        true,
        generationTime,
        result.result.tokenCount,
        result.result.cost
      )
      
      metricsService.recordAgentPerformance(
        'text-only',
        true,
        generationTime,
        result.context.attempt - 1,
        result.result.tokenCount
      )
      
      // Log éxito
      loggingService.logAIOperation(
        'generateSocialText',
        'text-only',
        operationId,
        params.additionalContext || 'unknown',
        true,
        generationTime,
        {
          platform: params.platform,
          characterCount,
          withinLimits,
          retryCount: result.context.attempt - 1
        }
      )
      
      return {
        text: cleanText,
        platform: params.platform,
        characterCount,
        withinLimits,
        metadata: {
          prompt,
          model: this.config.defaultModel,
          generationTime,
          retryCount: result.context.attempt - 1
        }
      }
    } catch (error) {
      const generationTime = metricsService.endOperationTracking(operationId)
      const generationError = GenerationErrorFactory.fromError(error as Error, 'GEMINI_API_FAILURE')
      
      // Registrar métricas de error
      metricsService.recordGeminiAPIUsage(
        'generateContent',
        false,
        generationTime,
        undefined,
        undefined,
        generationError
      )
      
      metricsService.recordAgentPerformance(
        'text-only',
        false,
        generationTime,
        this.retryAttempts,
        undefined
      )
      
      // Log error
      loggingService.logAIOperation(
        'generateSocialText',
        'text-only',
        operationId,
        params.additionalContext || 'unknown',
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
        agentType: 'text-only',
        publicationId: operationId
      })
      
      throw new Error(`Failed to generate text for ${params.platform}: ${error}`)
    }
  }

  /**
   * Genera textos específicos para áreas de un template
   */
  async generateTemplateTexts(params: TemplateTextGenerationParams): Promise<TemplateTextResult> {
    const startTime = Date.now()
    let retryCount = 0
    
    const prompt = this.buildExtremeQualityTemplatePrompt(params)
    
    try {
      const result = await this.retryMiddleware.executeWithRetry(
        () => this.callGeminiAPI(prompt),
        'generateTemplateTexts'
      )
      const generationTime = Date.now() - startTime
      
      const parsedTexts = this.parseTemplateTextResponse(result.result.text, params.textAreas)
      
      return {
        texts: parsedTexts,
        metadata: {
          prompt,
          model: this.config.defaultModel,
          generationTime,
          retryCount: result.context.attempt - 1
        }
      }
    } catch (error) {
      console.error('Error generating template texts:', error)
      throw new Error(`Failed to generate template texts: ${error}`)
    }
  }

  /**
   * Construye prompt de calidad extrema para texto de redes sociales
   */
  private buildExtremeQualityTextPrompt(params: TextGenerationParams): string {
    const { contentIdea, platform, brandManual, contentType, additionalContext } = params
    const charLimit = this.platformLimits[platform]
    
    const platformSpecs = this.getPlatformSpecifications(platform)
    const contentTypeGuidance = this.getContentTypeGuidance(contentType)
    
    return `
ERES UN COPYWRITER EXPERTO DE NIVEL MUNDIAL especializado en ${platform.toUpperCase()}.

MISIÓN CRÍTICA: Crear contenido de CALIDAD EXTREMA que genere engagement masivo y conversiones.

═══════════════════════════════════════════════════════════════════════════════

📋 INFORMACIÓN DE MARCA (SEGUIR AL 100%):
• Tono de voz: ${brandManual.brandVoice}
• Valores fundamentales: ${brandManual.brandValues.join(' | ')}
• Audiencia objetivo: ${brandManual.targetAudience}
• Mensajes clave: ${brandManual.keyMessages.join(' | ')}
• OBLIGATORIO hacer: ${brandManual.dosDonts.dos.join(' | ')}
• PROHIBIDO hacer: ${brandManual.dosDonts.donts.join(' | ')}

═══════════════════════════════════════════════════════════════════════════════

🎯 IDEA DE CONTENIDO:
${contentIdea}

${additionalContext ? `\n🔍 CONTEXTO ADICIONAL:\n${additionalContext}\n` : ''}

═══════════════════════════════════════════════════════════════════════════════

📱 ESPECIFICACIONES DE ${platform.toUpperCase()}:
${platformSpecs}

🎨 TIPO DE CONTENIDO: ${contentType}
${contentTypeGuidance}

═══════════════════════════════════════════════════════════════════════════════

⚡ REQUISITOS DE CALIDAD EXTREMA:

1. LÍMITE CRÍTICO: MÁXIMO ${charLimit} caracteres (CONTAR CADA CARÁCTER)
2. ENGAGEMENT: Usar técnicas psicológicas de persuasión
3. HOOK PODEROSO: Primeras 3 palabras deben capturar atención inmediata
4. STORYTELLING: Crear narrativa emocional conectiva
5. CALL-TO-ACTION: Incluir CTA específico y accionable
6. HASHTAGS: ${this.getHashtagGuidance(platform)}
7. EMOJIS: Usar estratégicamente para aumentar engagement
8. FORMATO: Optimizado para lectura rápida en móvil

═══════════════════════════════════════════════════════════════════════════════

🚀 TÉCNICAS AVANZADAS A APLICAR:
• Principio de escasez y urgencia
• Prueba social y autoridad
• Storytelling con arco narrativo completo
• Preguntas retóricas para engagement
• Números específicos y datos concretos
• Lenguaje sensorial y emocional
• Patrones de lenguaje hipnótico

═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIÓN FINAL:
Genera ÚNICAMENTE el texto final de la publicación. Sin comillas, sin explicaciones, sin formato adicional.
El texto debe ser PERFECTO para publicar directamente en ${platform}.

TEXTO FINAL:
`
  }

  /**
   * Construye prompt de calidad extrema para textos de template
   */
  private buildExtremeQualityTemplatePrompt(params: TemplateTextGenerationParams): string {
    const { contentIdea, templateDescription, textAreas, brandManual } = params
    
    const areasDescription = textAreas
      .map(area => `• ${area.name}: MÁXIMO ${area.maxLength} caracteres${area.placeholder ? ` (ejemplo: ${area.placeholder})` : ''}`)
      .join('\n')

    return `
ERES UN DISEÑADOR DE CONTENIDO EXPERTO DE NIVEL MUNDIAL especializado en templates visuales.

MISIÓN CRÍTICA: Crear textos de CALIDAD EXTREMA para template que generen impacto visual máximo.

═══════════════════════════════════════════════════════════════════════════════

📋 INFORMACIÓN DE MARCA (SEGUIR AL 100%):
• Tono de voz: ${brandManual.brandVoice}
• Valores fundamentales: ${brandManual.brandValues.join(' | ')}
• Audiencia objetivo: ${brandManual.targetAudience}
• Mensajes clave: ${brandManual.keyMessages.join(' | ')}

═══════════════════════════════════════════════════════════════════════════════

🎯 IDEA DE CONTENIDO:
${contentIdea}

🎨 DESCRIPCIÓN DEL TEMPLATE:
${templateDescription}

═══════════════════════════════════════════════════════════════════════════════

📐 ÁREAS DE TEXTO DISPONIBLES:
${areasDescription}

═══════════════════════════════════════════════════════════════════════════════

⚡ REQUISITOS DE CALIDAD EXTREMA:

1. LÍMITES CRÍTICOS: Respetar EXACTAMENTE los límites de caracteres
2. JERARQUÍA VISUAL: Crear flujo de lectura natural
3. IMPACTO INMEDIATO: Cada texto debe tener punch visual
4. COHERENCIA: Todos los textos deben complementarse perfectamente
5. LEGIBILIDAD: Optimizado para lectura rápida en diseño
6. BRAND VOICE: Mantener consistencia de marca en cada área
7. ACCIÓN: Incluir elementos que motiven engagement

═══════════════════════════════════════════════════════════════════════════════

🎯 TÉCNICAS ESPECÍFICAS PARA TEMPLATE:
• Títulos con poder de parada
• Subtítulos que amplifican el mensaje
• Textos de apoyo concisos y potentes
• CTAs específicos y accionables
• Uso estratégico de números y datos
• Palabras de alto impacto emocional

═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIÓN FINAL:
Genera ÚNICAMENTE un JSON válido con los textos para cada área.
Cada texto debe ser PERFECTO para el diseño visual del template.

FORMATO REQUERIDO:
{
  ${textAreas.map(area => `"${area.id}": "texto optimizado para ${area.name}"`).join(',\n  ')}
}

JSON FINAL:
`
  }

  /**
   * Obtiene especificaciones detalladas por plataforma
   */
  private getPlatformSpecifications(platform: SocialNetwork): string {
    const specs = {
      instagram: `
• Audiencia: Visual-first, lifestyle, aspiracional
• Tono: Auténtico, inspiracional, visualmente atractivo
• Formato: Párrafos cortos, line breaks estratégicos
• Hashtags: 5-10 hashtags relevantes y específicos
• Emojis: Uso liberal para expresión emocional
• Engagement: Preguntas en stories, polls, interacción directa`,

      linkedin: `
• Audiencia: Profesionales, decision makers, networking
• Tono: Profesional pero humano, thought leadership
• Formato: Párrafos estructurados, bullets points
• Hashtags: 3-5 hashtags profesionales e industria
• Emojis: Uso moderado y profesional
• Engagement: Insights valiosos, debate profesional`,

      twitter: `
• Audiencia: Conversacional, trending topics, tiempo real
• Tono: Conciso, ingenioso, conversacional
• Formato: Máxima concisión, cada palabra cuenta
• Hashtags: 1-2 hashtags trending o específicos
• Emojis: Uso estratégico para expresión rápida
• Engagement: Retweets, replies, trending participation`,

      facebook: `
• Audiencia: Diversa, comunidades, sharing personal
• Tono: Conversacional, community-focused, storytelling
• Formato: Párrafos naturales, storytelling extendido
• Hashtags: Uso mínimo, enfoque en contenido
• Emojis: Uso natural para expresión emocional
• Engagement: Shares, comments, community building`,

      tiktok: `
• Audiencia: Gen Z, Millennials, entertainment-first
• Tono: Auténtico, trendy, entertainment value
• Formato: Captions que complementen video
• Hashtags: Mix de trending y nicho específico
• Emojis: Uso creativo y expresivo
• Engagement: Challenges, trends, viral potential`
    }

    return specs[platform] || specs.instagram
  }

  /**
   * Obtiene orientación específica por tipo de contenido
   */
  private getContentTypeGuidance(contentType: string): string {
    const guidance: Record<string, string> = {
      text_simple: `
🔤 CONTENIDO SOLO TEXTO:
• Máximo impacto con palabras únicamente
• Storytelling poderoso sin apoyo visual
• Hooks ultra-potentes en primeras líneas
• Estructura que mantenga atención completa`,

      text_image_simple: `
📸 CONTENIDO TEXTO + IMAGEN:
• Texto que complemente imagen perfectamente
• Descripción que amplifique impacto visual
• Conexión emocional entre texto e imagen
• CTA que aproveche el contexto visual`,

      text_image_template: `
🎨 CONTENIDO TEXTO + TEMPLATE:
• Texto que funcione con diseño específico
• Consideración de jerarquía visual del template
• Complemento perfecto con elementos gráficos
• Optimización para lectura en diseño`,

      carousel: `
🎠 CONTENIDO CARRUSEL:
• Texto que invite a deslizar y explorar
• Narrativa que se desarrolle en múltiples slides
• Hook que prometa valor en secuencia completa
• CTA que aproveche el formato interactivo`
    }

    return guidance[contentType] || guidance.text_simple
  }

  /**
   * Obtiene orientación específica para hashtags por plataforma
   */
  private getHashtagGuidance(platform: SocialNetwork): string {
    const guidance = {
      instagram: 'Usar 5-10 hashtags: mix de populares (#10k-100k posts) y nicho (#1k-10k posts)',
      linkedin: 'Usar 3-5 hashtags profesionales relevantes a la industria',
      twitter: 'Usar 1-2 hashtags máximo, preferir trending topics cuando sea relevante',
      facebook: 'Uso mínimo de hashtags, enfocarse en contenido natural',
      tiktok: 'Mix de hashtags trending y específicos del nicho, máximo 5-7'
    }

    return guidance[platform] || guidance.instagram
  }

  /**
   * Realiza llamada directa a la API de Gemini (sin reintentos, manejados por middleware)
   */
  private async callGeminiAPI(prompt: string): Promise<{ text: string; tokenCount?: number; cost?: number }> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(
        `${this.config.baseUrl}/models/${this.config.defaultModel}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.8, // Creatividad alta para contenido social
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          })
        }
      )

      const latency = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Crear error específico según el código de estado
        if (response.status === 429) {
          throw GenerationErrorFactory.createRateLimitError(
            `Rate limit exceeded: ${errorData.error?.message || response.statusText}`,
            100, // límite simulado
            0,    // restante simulado
            new Date(Date.now() + 60000), // reset en 1 minuto
            60
          )
        } else if (response.status >= 500) {
          throw GenerationErrorFactory.createGeminiError(
            `Gemini API server error: ${response.status} - ${errorData.error?.message || response.statusText}`,
            {
              model: this.config.defaultModel,
              statusCode: response.status,
              apiResponse: errorData
            }
          )
        } else {
          throw GenerationErrorFactory.createGeminiError(
            `Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
            {
              model: this.config.defaultModel,
              statusCode: response.status,
              apiResponse: errorData
            }
          )
        }
      }

      const data = await response.json()
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw GenerationErrorFactory.createGeminiError(
          'Invalid response format from Gemini API',
          {
            model: this.config.defaultModel,
            apiResponse: data
          }
        )
      }

      const text = data.candidates[0].content.parts[0].text
      
      // Estimar tokens y costo (en implementación real vendría de la API)
      const estimatedTokens = Math.ceil(text.length / 4) // Aproximación
      const estimatedCost = estimatedTokens * 0.0001 // $0.0001 por token (ejemplo)
      
      // Log exitoso de API
      loggingService.logGeminiAPI(
        this.config.defaultModel,
        'generateContent',
        true,
        latency,
        estimatedTokens
      )
      
      return { 
        text, 
        tokenCount: estimatedTokens,
        cost: estimatedCost
      }

    } catch (error) {
      const latency = Date.now() - startTime
      
      // Si ya es un GenerationError, re-lanzarlo
      if (error && typeof error === 'object' && 'type' in error) {
        loggingService.logGeminiAPI(
          this.config.defaultModel,
          'generateContent',
          false,
          latency,
          undefined,
          error as any
        )
        throw error
      }
      
      // Convertir error genérico a GenerationError
      const generationError = GenerationErrorFactory.fromError(error as Error, 'GEMINI_API_FAILURE')
      
      loggingService.logGeminiAPI(
        this.config.defaultModel,
        'generateContent',
        false,
        latency,
        undefined,
        generationError
      )
      
      throw generationError
    }
  }

  /**
   * Parsea respuesta JSON de textos de template
   */
  private parseTemplateTextResponse(
    response: string, 
    textAreas: Array<{ id: string; name: string; maxLength: number }>
  ): Record<string, string> {
    try {
      // Limpiar respuesta para extraer JSON válido
      const cleanResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim()

      const parsed = JSON.parse(cleanResponse)
      
      // Validar que todas las áreas requeridas estén presentes
      const result: Record<string, string> = {}
      for (const area of textAreas) {
        if (parsed[area.id]) {
          const text = parsed[area.id].trim()
          // Validar límite de caracteres
          if (text.length > area.maxLength) {
            console.warn(`Text for ${area.name} exceeds limit: ${text.length}/${area.maxLength}`)
            result[area.id] = text.substring(0, area.maxLength).trim()
          } else {
            result[area.id] = text
          }
        } else {
          throw new Error(`Missing text for area: ${area.name}`)
        }
      }

      return result
    } catch (error) {
      console.error('Error parsing template text response:', error)
      console.error('Raw response:', response)
      throw new Error('Failed to parse template text response')
    }
  }

  /**
   * Limpia el texto generado removiendo formato innecesario
   */
  private cleanGeneratedText(text: string): string {
    return text
      .trim()
      .replace(/^["']|["']$/g, '') // Remover comillas al inicio y final
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalizar líneas vacías múltiples
      .replace(/^\s*TEXTO FINAL:\s*/i, '') // Remover prefijo si existe
      .trim()
  }

  /**
   * Valida que el texto generado cumpla con los límites de la plataforma
   */
  validateTextLength(text: string, platform: SocialNetwork): boolean {
    return text.length <= this.platformLimits[platform]
  }

  /**
   * Obtiene el límite de caracteres para una plataforma
   */
  getPlatformLimit(platform: SocialNetwork): number {
    return this.platformLimits[platform]
  }

  /**
   * Configura parámetros de reintentos
   */
  setRetryConfig(attempts: number, delay: number): void {
    this.retryAttempts = Math.max(1, attempts)
    this.retryDelay = Math.max(100, delay)
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getServiceStats(): {
    platformLimits: PlatformLimits
    retryConfig: { attempts: number; delay: number }
    model: string
  } {
    return {
      platformLimits: this.platformLimits,
      retryConfig: {
        attempts: this.retryAttempts,
        delay: this.retryDelay
      },
      model: this.config.defaultModel
    }
  }
}

/**
 * Factory function para crear instancia del servicio
 */
export function createGeminiTextService(): GeminiTextService {
  try {
    return new GeminiTextService()
  } catch (error) {
    console.error('❌ Error creando servicio de texto Gemini:', error)
    throw error
  }
}