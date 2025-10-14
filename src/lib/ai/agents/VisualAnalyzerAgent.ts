import { AgentManager } from './AgentManager'
import type { ResourceData } from './types'

export interface ResourceAnalysis {
  id: string
  name: string
  type: string
  description: string
  suggestedUse: string[]
  compatibleNetworks: string[]
  contentTypes: string[]
  mood: string
  colors: string[]
  elements: string[]
}

export class VisualAnalyzerAgent {
  private agentManager: AgentManager

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager
  }

  async analyzeResources(resources: ResourceData[]): Promise<ResourceAnalysis[]> {
    if (resources.length === 0) {
      return []
    }

    const analyses: ResourceAnalysis[] = []

    for (const resource of resources) {
      try {
        const analysis = await this.analyzeResource(resource)
        analyses.push(analysis)
      } catch (error) {
        console.error(`Error analyzing resource ${resource.name}:`, error)
        // Fallback analysis
        analyses.push(this.createFallbackAnalysis(resource))
      }
    }

    return analyses
  }

  private async analyzeResource(resource: ResourceData): Promise<ResourceAnalysis> {
    const prompt = this.buildAnalysisPrompt(resource)

    const response = await this.agentManager.executeAgentRequest({
      agentId: 'visual-analyzer',
      prompt,
      context: {
        resource: {
          id: resource.id,
          name: resource.name,
          type: resource.type,
          url: resource.url
        }
      }
    })

    return this.parseAnalysisResponse(response.response, resource)
  }

  private buildAnalysisPrompt(resource: ResourceData): string {
    return `
Eres un experto analista de contenido visual para marketing digital. Tu tarea es analizar un recurso visual y proporcionar información detallada para su uso en campañas de redes sociales.

RECURSO A ANALIZAR:
- Nombre: ${resource.name}
- Tipo: ${resource.type}
- URL: ${resource.url}

INSTRUCCIONES:
1. Analiza el contenido visual del recurso
2. Describe qué se ve en la imagen/video
3. Identifica el mood/ambiente que transmite
4. Sugiere usos apropiados para redes sociales
5. Recomienda tipos de contenido compatibles
6. Identifica colores predominantes
7. Lista elementos visuales importantes

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido:
{
  "description": "Descripción detallada de lo que se ve en el recurso",
  "suggestedUse": ["uso1", "uso2", "uso3"],
  "compatibleNetworks": ["instagram", "facebook", "linkedin"],
  "contentTypes": ["post", "story", "carousel"],
  "mood": "profesional|casual|elegante|divertido|serio|creativo",
  "colors": ["#color1", "#color2", "#color3"],
  "elements": ["elemento1", "elemento2", "elemento3"]
}

EJEMPLO:
{
  "description": "Logo corporativo con tipografía moderna sobre fondo blanco, incluye símbolo geométrico en color azul",
  "suggestedUse": ["branding", "watermark", "header", "footer"],
  "compatibleNetworks": ["instagram", "facebook", "linkedin", "twitter"],
  "contentTypes": ["post", "story", "carousel", "reel"],
  "mood": "profesional",
  "colors": ["#ffffff", "#0066cc", "#333333"],
  "elements": ["logo", "tipografia", "simbolo", "fondo_limpio"]
}

NO incluyas texto adicional, solo el JSON.
`
  }

  private parseAnalysisResponse(response: string, resource: ResourceData): ResourceAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        id: resource.id,
        name: resource.name,
        type: resource.type,
        description: parsed.description || 'Recurso visual para campaña',
        suggestedUse: Array.isArray(parsed.suggestedUse) ? parsed.suggestedUse : ['general'],
        compatibleNetworks: Array.isArray(parsed.compatibleNetworks) ? parsed.compatibleNetworks : ['instagram', 'facebook'],
        contentTypes: Array.isArray(parsed.contentTypes) ? parsed.contentTypes : ['post'],
        mood: parsed.mood || 'neutral',
        colors: Array.isArray(parsed.colors) ? parsed.colors : [],
        elements: Array.isArray(parsed.elements) ? parsed.elements : []
      }
    } catch (error) {
      console.error('Error parsing analysis response:', error)
      return this.createFallbackAnalysis(resource)
    }
  }

  private createFallbackAnalysis(resource: ResourceData): ResourceAnalysis {
    return {
      id: resource.id,
      name: resource.name,
      type: resource.type,
      description: `Recurso ${resource.type} disponible para usar en la campaña`,
      suggestedUse: resource.type === 'image' ? ['post', 'story'] : ['reel', 'video'],
      compatibleNetworks: ['instagram', 'facebook', 'linkedin'],
      contentTypes: resource.type === 'image' ? ['post', 'story', 'carousel'] : ['reel', 'video'],
      mood: 'neutral',
      colors: [],
      elements: [resource.type]
    }
  }
}