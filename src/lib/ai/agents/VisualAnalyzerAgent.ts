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
  lighting?: string
  composition?: string
  style?: string
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
Eres un experto analista de contenido visual para marketing digital. Tu tarea es analizar un recurso visual y proporcionar una descripción extremadamente detallada para su uso en campañas de redes sociales.

RECURSO A ANALIZAR:
- Nombre: ${resource.name}
- Tipo: ${resource.type}
- URL: ${resource.url}

INSTRUCCIONES PARA DESCRIPCIÓN DETALLADA:
1. ELEMENTOS VISUALES: Describe TODOS los objetos, personas, productos, textos, logos, símbolos que aparecen
2. COLORES: Identifica colores específicos (no solo "azul", sino "azul marino", "azul cielo", etc.)
3. ILUMINACIÓN: Describe el tipo de iluminación (natural, artificial, suave, dramática, frontal, lateral)
4. COMPOSICIÓN: Explica la disposición de elementos, perspectiva, encuadre, profundidad de campo
5. ESTILO VISUAL: Identifica el estilo (minimalista, vintage, moderno, corporativo, artístico)
6. TEXTURAS Y MATERIALES: Describe superficies, texturas, materiales visibles
7. AMBIENTE Y CONTEXTO: Explica el entorno, situación, momento del día si es relevante
8. DETALLES ESPECÍFICOS: Menciona pequeños detalles que podrían ser importantes

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido:
{
  "description": "Descripción extremadamente detallada de TODOS los elementos visuales, colores específicos, iluminación, composición, texturas, ambiente y detalles presentes en la imagen/video",
  "suggestedUse": ["uso1", "uso2", "uso3"],
  "compatibleNetworks": ["instagram", "facebook", "linkedin"],
  "contentTypes": ["post", "story", "carousel"],
  "mood": "profesional|casual|elegante|divertido|serio|creativo|inspiracional|energético",
  "colors": ["#color1", "#color2", "#color3"],
  "elements": ["elemento1", "elemento2", "elemento3"],
  "lighting": "natural|artificial|suave|dramática|frontal|lateral|contraluz|dorada|fría",
  "composition": "centrada|regla_tercios|diagonal|simetrica|asimetrica|primer_plano|plano_general",
  "style": "minimalista|vintage|moderno|corporativo|artístico|editorial|lifestyle|producto"
}

EJEMPLO DE DESCRIPCIÓN DETALLADA:
{
  "description": "Imagen de producto que muestra un smartphone negro mate con pantalla encendida mostrando una interfaz azul. El dispositivo está posicionado en diagonal sobre una superficie de mármol blanco con vetas grises sutiles. La iluminación es suave y difusa, proveniente del lado izquierdo, creando una sombra sutil hacia la derecha. En el fondo se aprecia un ambiente de oficina desenfocado con tonos neutros. La pantalla del teléfono muestra iconos coloridos y texto en tipografía sans-serif. Hay un reflejo sutil de la pantalla en la superficie de mármol. La composición sigue la regla de los tercios con el dispositivo ocupando el tercio derecho de la imagen.",
  "suggestedUse": ["producto", "tecnología", "lifestyle", "corporativo"],
  "compatibleNetworks": ["instagram", "facebook", "linkedin", "twitter"],
  "contentTypes": ["post", "story", "carousel", "reel"],
  "mood": "profesional",
  "colors": ["#000000", "#ffffff", "#2196f3", "#f5f5f5", "#9e9e9e"],
  "elements": ["smartphone", "pantalla", "interfaz", "mármol", "sombra", "reflejo", "iconos"],
  "lighting": "suave",
  "composition": "regla_tercios",
  "style": "producto"
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
        elements: Array.isArray(parsed.elements) ? parsed.elements : [],
        lighting: parsed.lighting || 'natural',
        composition: parsed.composition || 'centrada',
        style: parsed.style || 'moderno'
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
      elements: [resource.type],
      lighting: 'natural',
      composition: 'centrada',
      style: 'moderno'
    }
  }
}