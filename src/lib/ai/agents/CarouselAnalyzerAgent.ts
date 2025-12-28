import { AgentManager } from './AgentManager'
import type { TemplateData } from './types'

export interface CarouselImageAnalysis {
  imageIndex: number
  imageUrl: string
  description: string
  visualElements: string[]
  colors: string[]
  lighting: string
  composition: string
  style: string
  mood: string
  textAreas: string[]
  focusPoints: string[]
}

export interface CarouselAnalysis {
  templateId: string
  templateName: string
  type: 'carousel'
  overallDescription: string
  totalImages: number
  imageAnalyses: CarouselImageAnalysis[]
  narrativeFlow: string
  consistencyScore: number
  suggestedUse: string[]
  compatibleNetworks: string[]
  overallMood: string
  dominantColors: string[]
  designStyle: string
}

export class CarouselAnalyzerAgent {
  private agentManager: AgentManager

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager
  }

  async analyzeCarouselTemplate(template: TemplateData): Promise<CarouselAnalysis> {
    if (template.type !== 'carousel' || !template.images || template.images.length === 0) {
      throw new Error('Template must be of type carousel with images')
    }

    console.log(`🎠 Analyzing carousel template: ${template.name} with ${template.images.length} images`)

    try {
      // Analyze each image individually
      const imageAnalyses: CarouselImageAnalysis[] = []
      
      for (let i = 0; i < template.images.length; i++) {
        const imageUrl = template.images[i]
        console.log(`🖼️ Analyzing image ${i + 1}/${template.images.length}: ${imageUrl}`)
        
        const imageAnalysis = await this.analyzeCarouselImage(imageUrl, i, template.name)
        imageAnalyses.push(imageAnalysis)
      }

      // Generate overall carousel analysis
      const overallAnalysis = await this.generateOverallCarouselAnalysis(template, imageAnalyses)

      return {
        templateId: template.id,
        templateName: template.name,
        type: 'carousel',
        totalImages: template.images.length,
        imageAnalyses,
        ...overallAnalysis
      }

    } catch (error) {
      console.error(`❌ Error analyzing carousel template ${template.name}:`, error)
      return this.createFallbackCarouselAnalysis(template)
    }
  }

  private async analyzeCarouselImage(
    imageUrl: string, 
    index: number, 
    templateName: string
  ): Promise<CarouselImageAnalysis> {
    const prompt = this.buildImageAnalysisPrompt(imageUrl, index, templateName)

    const response = await this.agentManager.executeAgentRequest({
      agentId: 'carousel-image-analyzer',
      prompt,
      context: {
        imageUrl,
        index,
        templateName
      }
    })

    return this.parseImageAnalysisResponse(response.response, imageUrl, index)
  }

  private buildImageAnalysisPrompt(imageUrl: string, index: number, templateName: string): string {
    return `
Eres un experto analista de contenido visual especializado en carruseles de redes sociales. Tu tarea es analizar UNA imagen específica de un carrusel y proporcionar una descripción extremadamente detallada.

IMAGEN A ANALIZAR:
- URL: ${imageUrl}
- Posición en carrusel: Imagen ${index + 1}
- Template: ${templateName}

INSTRUCCIONES PARA ANÁLISIS DETALLADO:
1. DESCRIPCIÓN VISUAL COMPLETA: Describe TODOS los elementos visibles con máximo detalle
2. ELEMENTOS ESPECÍFICOS: Identifica objetos, personas, productos, textos, iconos, formas geométricas
3. COLORES EXACTOS: Especifica tonalidades precisas (ej: "azul navy #1a237e", "rosa coral #ff7043")
4. ILUMINACIÓN DETALLADA: Tipo, dirección, intensidad, sombras, reflejos
5. COMPOSICIÓN VISUAL: Distribución de elementos, equilibrio, jerarquía visual, puntos focales
6. ESTILO Y TÉCNICA: Estilo de diseño, técnica utilizada, acabados
7. ÁREAS DE TEXTO: Identifica espacios destinados para texto, títulos, CTAs
8. PUNTOS FOCALES: Elementos que captan más atención visual

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido:
{
  "description": "Descripción extremadamente detallada de TODOS los elementos visuales presentes en esta imagen específica del carrusel",
  "visualElements": ["elemento1", "elemento2", "elemento3"],
  "colors": ["#color1", "#color2", "#color3"],
  "lighting": "natural|artificial|suave|dramática|frontal|lateral|contraluz|dorada|fría|mixta",
  "composition": "centrada|regla_tercios|diagonal|simetrica|asimetrica|primer_plano|plano_general|grid",
  "style": "minimalista|vintage|moderno|corporativo|artístico|editorial|lifestyle|producto|ilustrativo",
  "mood": "profesional|casual|elegante|divertido|serio|creativo|inspiracional|energético|relajado",
  "textAreas": ["área_título", "área_subtítulo", "área_cta", "área_descripción"],
  "focusPoints": ["punto_focal_1", "punto_focal_2"]
}

EJEMPLO:
{
  "description": "Imagen minimalista que muestra un smartphone dorado sobre una superficie de mármol blanco con vetas grises. El dispositivo está posicionado en el tercio derecho siguiendo la regla de los tercios. La pantalla muestra una interfaz de aplicación con iconos coloridos sobre fondo blanco. La iluminación es suave y natural, proveniente del lado izquierdo, creando una sombra sutil que se extiende hacia la esquina inferior derecha. En la parte superior izquierda hay espacio negativo ideal para texto. El fondo presenta un degradado sutil de blanco a gris muy claro. Se aprecia un reflejo tenue del dispositivo en la superficie marmórea.",
  "visualElements": ["smartphone", "pantalla", "interfaz", "iconos", "mármol", "sombra", "reflejo", "degradado"],
  "colors": ["#ffd700", "#ffffff", "#f5f5f5", "#e0e0e0", "#2196f3", "#4caf50"],
  "lighting": "suave",
  "composition": "regla_tercios",
  "style": "minimalista",
  "mood": "profesional",
  "textAreas": ["área_superior_izquierda", "área_inferior"],
  "focusPoints": ["smartphone_central", "interfaz_pantalla"]
}

NO incluyas texto adicional, solo el JSON.
`
  }

  private async generateOverallCarouselAnalysis(
    template: TemplateData, 
    imageAnalyses: CarouselImageAnalysis[]
  ): Promise<Omit<CarouselAnalysis, 'templateId' | 'templateName' | 'type' | 'totalImages' | 'imageAnalyses'>> {
    const prompt = this.buildOverallAnalysisPrompt(template, imageAnalyses)

    const response = await this.agentManager.executeAgentRequest({
      agentId: 'carousel-overall-analyzer',
      prompt,
      context: {
        template,
        imageAnalyses
      }
    })

    return this.parseOverallAnalysisResponse(response.response, imageAnalyses)
  }

  private buildOverallAnalysisPrompt(template: TemplateData, imageAnalyses: CarouselImageAnalysis[]): string {
    const imagesSummary = imageAnalyses.map((img, i) => 
      `Imagen ${i + 1}: ${img.description.substring(0, 200)}...`
    ).join('\n')

    return `
Eres un experto analista de carruseles para redes sociales. Analiza el carrusel completo basándote en el análisis individual de cada imagen.

TEMPLATE CARRUSEL:
- Nombre: ${template.name}
- Total de imágenes: ${template.images.length}
- Redes sociales: ${template.socialNetworks.join(', ')}

ANÁLISIS INDIVIDUAL DE IMÁGENES:
${imagesSummary}

INSTRUCCIONES:
1. DESCRIPCIÓN GENERAL: Resume el carrusel completo y su propósito
2. FLUJO NARRATIVO: Explica cómo las imágenes se conectan entre sí
3. CONSISTENCIA: Evalúa la coherencia visual entre imágenes (1-10)
4. ESTILO DOMINANTE: Identifica el estilo visual predominante
5. COLORES DOMINANTES: Los colores más presentes en todo el carrusel
6. MOOD GENERAL: El ambiente/sentimiento que transmite el conjunto

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido:
{
  "overallDescription": "Descripción completa del carrusel como conjunto, explicando su propósito y contenido general",
  "narrativeFlow": "Explicación de cómo las imágenes se conectan y fluyen narrativamente",
  "consistencyScore": 8,
  "suggestedUse": ["uso1", "uso2", "uso3"],
  "compatibleNetworks": ["instagram", "facebook", "linkedin"],
  "overallMood": "profesional|casual|elegante|divertido|serio|creativo",
  "dominantColors": ["#color1", "#color2", "#color3"],
  "designStyle": "minimalista|vintage|moderno|corporativo|artístico"
}

NO incluyas texto adicional, solo el JSON.
`
  }

  private parseImageAnalysisResponse(
    response: string, 
    imageUrl: string, 
    index: number
  ): CarouselImageAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        imageIndex: index,
        imageUrl,
        description: parsed.description || `Imagen ${index + 1} del carrusel`,
        visualElements: Array.isArray(parsed.visualElements) ? parsed.visualElements : [],
        colors: Array.isArray(parsed.colors) ? parsed.colors : [],
        lighting: parsed.lighting || 'natural',
        composition: parsed.composition || 'centrada',
        style: parsed.style || 'moderno',
        mood: parsed.mood || 'neutral',
        textAreas: Array.isArray(parsed.textAreas) ? parsed.textAreas : [],
        focusPoints: Array.isArray(parsed.focusPoints) ? parsed.focusPoints : []
      }
    } catch (error) {
      console.error('Error parsing image analysis response:', error)
      return this.createFallbackImageAnalysis(imageUrl, index)
    }
  }

  private parseOverallAnalysisResponse(
    response: string, 
    imageAnalyses: CarouselImageAnalysis[]
  ): Omit<CarouselAnalysis, 'templateId' | 'templateName' | 'type' | 'totalImages' | 'imageAnalyses'> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        overallDescription: parsed.overallDescription || 'Carrusel para redes sociales',
        narrativeFlow: parsed.narrativeFlow || 'Secuencia de imágenes relacionadas',
        consistencyScore: typeof parsed.consistencyScore === 'number' ? parsed.consistencyScore : 7,
        suggestedUse: Array.isArray(parsed.suggestedUse) ? parsed.suggestedUse : ['carousel', 'storytelling'],
        compatibleNetworks: Array.isArray(parsed.compatibleNetworks) ? parsed.compatibleNetworks : ['instagram', 'facebook'],
        overallMood: parsed.overallMood || 'neutral',
        dominantColors: Array.isArray(parsed.dominantColors) ? parsed.dominantColors : [],
        designStyle: parsed.designStyle || 'moderno'
      }
    } catch (error) {
      console.error('Error parsing overall analysis response:', error)
      return this.createFallbackOverallAnalysis(imageAnalyses)
    }
  }

  private createFallbackImageAnalysis(imageUrl: string, index: number): CarouselImageAnalysis {
    return {
      imageIndex: index,
      imageUrl,
      description: `Imagen ${index + 1} del carrusel disponible para análisis`,
      visualElements: ['imagen', 'contenido'],
      colors: [],
      lighting: 'natural',
      composition: 'centrada',
      style: 'moderno',
      mood: 'neutral',
      textAreas: ['área_principal'],
      focusPoints: ['centro']
    }
  }

  private createFallbackOverallAnalysis(
    imageAnalyses: CarouselImageAnalysis[]
  ): Omit<CarouselAnalysis, 'templateId' | 'templateName' | 'type' | 'totalImages' | 'imageAnalyses'> {
    return {
      overallDescription: `Carrusel con ${imageAnalyses.length} imágenes para redes sociales`,
      narrativeFlow: 'Secuencia de imágenes que cuentan una historia visual',
      consistencyScore: 7,
      suggestedUse: ['carousel', 'storytelling', 'producto'],
      compatibleNetworks: ['instagram', 'facebook', 'linkedin'],
      overallMood: 'neutral',
      dominantColors: [],
      designStyle: 'moderno'
    }
  }

  private createFallbackCarouselAnalysis(template: TemplateData): CarouselAnalysis {
    const fallbackImages: CarouselImageAnalysis[] = template.images.map((url, index) => 
      this.createFallbackImageAnalysis(url, index)
    )

    return {
      templateId: template.id,
      templateName: template.name,
      type: 'carousel',
      totalImages: template.images.length,
      imageAnalyses: fallbackImages,
      ...this.createFallbackOverallAnalysis(fallbackImages)
    }
  }
}