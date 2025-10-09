import { 
  ContentDescription, 
  BrandManual, 
  SocialNetwork, 
  Template,
  CreateContentDescriptionData 
} from '../database/types'

export interface GeminiConfig {
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface GenerateDescriptionsParams {
  campaignObjective: string
  campaignInstructions: string
  brandManual: BrandManual
  platformDistribution: Record<SocialNetwork, number>
  dateRange: { start: Date, end: Date }
  publicationsPerDay: number
}

export interface GenerateTextParams {
  description: ContentDescription
  brandManual: BrandManual
  platform: SocialNetwork
}

export interface TemplateTextArea {
  id: string
  name: string
  maxLength: number
  placeholder?: string
}

export interface GenerateTemplateTextParams {
  description: ContentDescription
  template: Template
  textAreas: TemplateTextArea[]
  brandManual: BrandManual
}

export interface GeminiResponse {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class GeminiService {
  private config: GeminiConfig
  private retryAttempts: number = 3
  private retryDelay: number = 1000

  constructor(config: GeminiConfig) {
    this.config = {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-1.5-flash',
      ...config
    }
  }

  /**
   * Genera descripciones de contenido para una campaña
   */
  async generateContentDescriptions(
    params: GenerateDescriptionsParams
  ): Promise<CreateContentDescriptionData[]> {
    const prompt = this.buildDescriptionsPrompt(params)
    
    try {
      const response = await this.callGeminiAPI(prompt)
      return this.parseDescriptionsResponse(response.text, params)
    } catch (error) {
      console.error('Error generating content descriptions:', error)
      throw new Error('Failed to generate content descriptions')
    }
  }

  /**
   * Genera texto para una publicación específica
   */
  async generatePublicationText(params: GenerateTextParams): Promise<string> {
    const prompt = this.buildPublicationTextPrompt(params)
    
    try {
      const response = await this.callGeminiAPI(prompt)
      return this.cleanGeneratedText(response.text)
    } catch (error) {
      console.error('Error generating publication text:', error)
      throw new Error('Failed to generate publication text')
    }
  }

  /**
   * Genera texto para áreas específicas de un template
   */
  async generateTemplateText(
    params: GenerateTemplateTextParams
  ): Promise<Record<string, string>> {
    const prompt = this.buildTemplateTextPrompt(params)
    
    try {
      const response = await this.callGeminiAPI(prompt)
      return this.parseTemplateTextResponse(response.text, params.textAreas)
    } catch (error) {
      console.error('Error generating template text:', error)
      throw new Error('Failed to generate template text')
    }
  }

  /**
   * Construye el prompt para generar descripciones de contenido
   */
  private buildDescriptionsPrompt(params: GenerateDescriptionsParams): string {
    const { campaignObjective, campaignInstructions, brandManual, platformDistribution, dateRange, publicationsPerDay } = params
    
    const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    const totalPublications = totalDays * publicationsPerDay
    
    const platformBreakdown = Object.entries(platformDistribution)
      .map(([platform, percentage]) => {
        const count = Math.round((totalPublications * percentage) / 100)
        return `${platform}: ${count} publicaciones (${percentage}%)`
      })
      .join('\n')

    return `
Eres un experto en marketing digital y creación de contenido para redes sociales. 

INFORMACIÓN DE LA MARCA:
- Tono de voz: ${brandManual.brandVoice}
- Valores: ${brandManual.brandValues.join(', ')}
- Audiencia objetivo: ${brandManual.targetAudience}
- Mensajes clave: ${brandManual.keyMessages.join(', ')}
- Qué hacer: ${brandManual.dosDonts.dos.join(', ')}
- Qué NO hacer: ${brandManual.dosDonts.donts.join(', ')}

OBJETIVO DE LA CAMPAÑA:
${campaignObjective}

INSTRUCCIONES DETALLADAS:
${campaignInstructions}

DISTRIBUCIÓN DE CONTENIDO:
${platformBreakdown}

Fechas: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}
Total de publicaciones: ${totalPublications}

TAREA:
Genera ${totalPublications} descripciones de contenido específicas y detalladas. Cada descripción debe:
1. Ser única y específica para la plataforma
2. Alinearse con el tono de voz y valores de la marca
3. Seguir las instrucciones de la campaña
4. Ser apropiada para la audiencia objetivo
5. Incluir el tipo de contenido recomendado (texto simple, imagen simple, template, carrusel)

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido con el siguiente formato:
{
  "descriptions": [
    {
      "platform": "instagram|linkedin|twitter|facebook",
      "contentType": "text_simple|text_image_simple|text_image_template|carousel",
      "description": "Descripción detallada del contenido a crear"
    }
  ]
}

No incluyas texto adicional fuera del JSON.
`
  }

  /**
   * Construye el prompt para generar texto de publicación
   */
  private buildPublicationTextPrompt(params: GenerateTextParams): string {
    const { description, brandManual, platform } = params
    
    const platformLimits = {
      instagram: 2200,
      linkedin: 3000,
      twitter: 280,
      facebook: 63206
    }

    const charLimit = platformLimits[platform] || 2200

    return `
Eres un copywriter experto especializado en ${platform}.

INFORMACIÓN DE LA MARCA:
- Tono de voz: ${brandManual.brandVoice}
- Valores: ${brandManual.brandValues.join(', ')}
- Audiencia objetivo: ${brandManual.targetAudience}
- Mensajes clave: ${brandManual.keyMessages.join(', ')}
- Qué hacer: ${brandManual.dosDonts.dos.join(', ')}
- Qué NO hacer: ${brandManual.dosDonts.donts.join(', ')}

DESCRIPCIÓN DEL CONTENIDO:
${description.description}

PLATAFORMA: ${platform}
LÍMITE DE CARACTERES: ${charLimit}

TAREA:
Crea el texto final para esta publicación de ${platform}. El texto debe:
1. Seguir exactamente el tono de voz de la marca
2. Ser apropiado para ${platform}
3. Respetar el límite de ${charLimit} caracteres
4. Incluir hashtags relevantes si es apropiado para la plataforma
5. Ser engaging y alineado con los valores de la marca
6. Seguir las mejores prácticas de ${platform}

Responde ÚNICAMENTE con el texto final de la publicación, sin comillas ni formato adicional.
`
  }

  /**
   * Construye el prompt para generar texto de template
   */
  private buildTemplateTextPrompt(params: GenerateTemplateTextParams): string {
    const { description, template, textAreas, brandManual } = params
    
    const areasDescription = textAreas
      .map(area => `- ${area.name}: máximo ${area.maxLength} caracteres${area.placeholder ? ` (ej: ${area.placeholder})` : ''}`)
      .join('\n')

    return `
Eres un diseñador de contenido experto en templates para redes sociales.

INFORMACIÓN DE LA MARCA:
- Tono de voz: ${brandManual.brandVoice}
- Valores: ${brandManual.brandValues.join(', ')}
- Audiencia objetivo: ${brandManual.targetAudience}

DESCRIPCIÓN DEL CONTENIDO:
${description.description}

TEMPLATE: ${template.name}
ÁREAS DE TEXTO DISPONIBLES:
${areasDescription}

TAREA:
Genera texto específico para cada área del template. Cada texto debe:
1. Ser conciso y impactante
2. Respetar estrictamente el límite de caracteres
3. Seguir el tono de voz de la marca
4. Complementar los otros textos del template
5. Ser apropiado para el diseño visual

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido:
{
  ${textAreas.map(area => `"${area.id}": "texto para ${area.name}"`).join(',\n  ')}
}

No incluyas texto adicional fuera del JSON.
`
  }

  /**
   * Realiza llamada a la API de Gemini con reintentos
   */
  private async callGeminiAPI(prompt: string): Promise<GeminiResponse> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(
          `${this.config.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
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
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              }
            })
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
        }

        const data = await response.json()
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          throw new Error('Invalid response format from Gemini API')
        }

        const text = data.candidates[0].content.parts[0].text
        const usage = data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0
        } : undefined

        return { text, usage }

      } catch (error) {
        lastError = error as Error
        console.warn(`Gemini API attempt ${attempt} failed:`, error)
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('All Gemini API attempts failed')
  }

  /**
   * Parsea la respuesta de descripciones de contenido
   */
  private parseDescriptionsResponse(
    response: string, 
    params: GenerateDescriptionsParams
  ): CreateContentDescriptionData[] {
    try {
      const parsed = JSON.parse(response)
      
      if (!parsed.descriptions || !Array.isArray(parsed.descriptions)) {
        throw new Error('Invalid response format')
      }

      const descriptions: CreateContentDescriptionData[] = []
      const startDate = new Date(params.dateRange.start)
      const totalDays = Math.ceil((params.dateRange.end.getTime() - params.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      
      let currentDate = new Date(startDate)
      let dayIndex = 0

      for (const desc of parsed.descriptions) {
        // Calcular fecha programada distribuyendo las publicaciones
        const scheduledDate = new Date(currentDate)
        scheduledDate.setDate(startDate.getDate() + Math.floor(dayIndex / params.publicationsPerDay))
        
        descriptions.push({
          campaignId: '', // Se asignará en el servicio que llame a este método
          platform: desc.platform as SocialNetwork,
          scheduledDate,
          contentType: desc.contentType,
          description: desc.description,
          resourceIds: [],
          status: 'pending'
        })

        dayIndex++
      }

      return descriptions
    } catch (error) {
      console.error('Error parsing descriptions response:', error)
      throw new Error('Failed to parse AI response')
    }
  }

  /**
   * Parsea la respuesta de texto de template
   */
  private parseTemplateTextResponse(
    response: string, 
    textAreas: TemplateTextArea[]
  ): Record<string, string> {
    try {
      const parsed = JSON.parse(response)
      
      // Validar que todas las áreas requeridas estén presentes
      const result: Record<string, string> = {}
      for (const area of textAreas) {
        if (parsed[area.id]) {
          result[area.id] = parsed[area.id]
        } else {
          throw new Error(`Missing text for area: ${area.name}`)
        }
      }

      return result
    } catch (error) {
      console.error('Error parsing template text response:', error)
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
      .replace(/\n\s*\n/g, '\n') // Remover líneas vacías múltiples
      .trim()
  }

  /**
   * Configura nuevos parámetros del servicio
   */
  updateConfig(config: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Configura parámetros de reintentos
   */
  setRetryConfig(attempts: number, delay: number): void {
    this.retryAttempts = Math.max(1, attempts)
    this.retryDelay = Math.max(100, delay)
  }
}

// Factory function para crear instancia del servicio
export function createGeminiService(): GeminiService {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  return new GeminiService({ apiKey })
}