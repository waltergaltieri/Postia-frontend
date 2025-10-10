import { AgentManager, AgentRequest } from './AgentManager'
import { BrandStrategistAgent as IBrandStrategistAgent } from './types'

export class BrandStrategistAgent implements IBrandStrategistAgent {
  private agentManager: AgentManager
  private agentId = 'brand-strategist'

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager
  }

  async analyzeBrand(brandData: any): Promise<{
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    recommendations: string[]
  }> {
    const prompt = `
Realiza un análisis completo de marca basado en los siguientes datos:

DATOS DE LA MARCA:
${JSON.stringify(brandData, null, 2)}

ANÁLISIS REQUERIDO:
Proporciona un análisis SWOT enfocado en la presencia digital y estrategia de contenido.

FORMATO DE RESPUESTA:
Responde únicamente con un JSON válido con la siguiente estructura:
{
  "strengths": ["fortaleza 1", "fortaleza 2", ...],
  "weaknesses": ["debilidad 1", "debilidad 2", ...],
  "opportunities": ["oportunidad 1", "oportunidad 2", ...],
  "recommendations": ["recomendación 1", "recomendación 2", ...]
}

Cada array debe contener entre 3-5 elementos específicos y accionables.
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        analysisType: 'brand-swot',
        brandData
      },
      options: {
        temperature: 0.3,
        maxTokens: 2048
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    
    try {
      return JSON.parse(response.response)
    } catch (error) {
      throw new Error('Failed to parse brand analysis response')
    }
  }

  async developStrategy(objectives: string[], timeframe: string): Promise<{
    strategy: string
    tactics: string[]
    kpis: string[]
  }> {
    const prompt = `
Desarrolla una estrategia de marca completa basada en los siguientes objetivos:

OBJETIVOS:
${objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

TIMEFRAME: ${timeframe}

DESARROLLO REQUERIDO:
1. Estrategia general coherente
2. Tácticas específicas y accionables
3. KPIs medibles y relevantes

FORMATO DE RESPUESTA:
Responde únicamente con un JSON válido:
{
  "strategy": "descripción detallada de la estrategia general",
  "tactics": ["táctica 1", "táctica 2", ...],
  "kpis": ["kpi 1", "kpi 2", ...]
}

Las tácticas deben ser específicas y ejecutables.
Los KPIs deben ser medibles y relevantes para los objetivos.
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        objectives,
        timeframe,
        strategyType: 'comprehensive'
      },
      options: {
        temperature: 0.4,
        maxTokens: 3072
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    
    try {
      return JSON.parse(response.response)
    } catch (error) {
      throw new Error('Failed to parse strategy development response')
    }
  }

  async analyzeCompetitors(competitors: string[], industry: string): Promise<{
    analysis: Record<string, any>
    insights: string[]
    opportunities: string[]
  }> {
    const prompt = `
Analiza la competencia en la industria ${industry}:

COMPETIDORES:
${competitors.map((comp, i) => `${i + 1}. ${comp}`).join('\n')}

INDUSTRIA: ${industry}

ANÁLISIS REQUERIDO:
1. Análisis individual de cada competidor
2. Insights del mercado
3. Oportunidades identificadas

FORMATO DE RESPUESTA:
{
  "analysis": {
    "competitor1": {
      "strengths": ["..."],
      "weaknesses": ["..."],
      "strategy": "..."
    }
  },
  "insights": ["insight 1", "insight 2", ...],
  "opportunities": ["oportunidad 1", "oportunidad 2", ...]
}
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        competitors,
        industry,
        analysisType: 'competitive'
      },
      options: {
        temperature: 0.3,
        maxTokens: 4096
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    
    try {
      return JSON.parse(response.response)
    } catch (error) {
      throw new Error('Failed to parse competitor analysis response')
    }
  }

  async generateBrandGuidelines(brandInfo: {
    name: string
    values: string[]
    mission: string
    vision: string
    targetAudience: string
  }): Promise<{
    voiceAndTone: string
    messagingPillars: string[]
    contentThemes: string[]
    dosDonts: {
      dos: string[]
      donts: string[]
    }
  }> {
    const prompt = `
Genera guías de marca completas basadas en la siguiente información:

INFORMACIÓN DE LA MARCA:
- Nombre: ${brandInfo.name}
- Valores: ${brandInfo.values.join(', ')}
- Misión: ${brandInfo.mission}
- Visión: ${brandInfo.vision}
- Audiencia objetivo: ${brandInfo.targetAudience}

GUÍAS REQUERIDAS:
1. Voz y tono de la marca
2. Pilares de messaging
3. Temas de contenido
4. Qué hacer y qué no hacer

FORMATO DE RESPUESTA:
{
  "voiceAndTone": "descripción detallada de la voz y tono",
  "messagingPillars": ["pilar 1", "pilar 2", "pilar 3"],
  "contentThemes": ["tema 1", "tema 2", ...],
  "dosDonts": {
    "dos": ["hacer 1", "hacer 2", ...],
    "donts": ["no hacer 1", "no hacer 2", ...]
  }
}
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        brandInfo,
        guidelineType: 'comprehensive'
      },
      options: {
        temperature: 0.4,
        maxTokens: 3072
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    
    try {
      return JSON.parse(response.response)
    } catch (error) {
      throw new Error('Failed to parse brand guidelines response')
    }
  }

  async assessBrandHealth(metrics: {
    awareness: number
    sentiment: number
    engagement: number
    reach: number
    conversions: number
  }): Promise<{
    overallScore: number
    assessment: string
    criticalAreas: string[]
    recommendations: string[]
  }> {
    const prompt = `
Evalúa la salud de la marca basándote en las siguientes métricas:

MÉTRICAS (escala 1-100):
- Awareness: ${metrics.awareness}
- Sentiment: ${metrics.sentiment}
- Engagement: ${metrics.engagement}
- Reach: ${metrics.reach}
- Conversions: ${metrics.conversions}

EVALUACIÓN REQUERIDA:
1. Score general de salud de marca
2. Evaluación cualitativa
3. Áreas críticas que necesitan atención
4. Recomendaciones específicas

FORMATO DE RESPUESTA:
{
  "overallScore": número_entre_1_y_100,
  "assessment": "evaluación detallada de la salud de la marca",
  "criticalAreas": ["área crítica 1", "área crítica 2", ...],
  "recommendations": ["recomendación 1", "recomendación 2", ...]
}
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        metrics,
        assessmentType: 'brand-health'
      },
      options: {
        temperature: 0.2,
        maxTokens: 2048
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    
    try {
      return JSON.parse(response.response)
    } catch (error) {
      throw new Error('Failed to parse brand health assessment response')
    }
  }

  async generatePositioningStatement(brandInfo: {
    name: string
    category: string
    targetAudience: string
    keyBenefit: string
    differentiators: string[]
    competitors: string[]
  }): Promise<string> {
    const prompt = `
Crea un positioning statement profesional para la marca:

INFORMACIÓN DE LA MARCA:
- Nombre: ${brandInfo.name}
- Categoría: ${brandInfo.category}
- Audiencia objetivo: ${brandInfo.targetAudience}
- Beneficio clave: ${brandInfo.keyBenefit}
- Diferenciadores: ${brandInfo.differentiators.join(', ')}
- Principales competidores: ${brandInfo.competitors.join(', ')}

REQUISITOS:
1. Claro y conciso
2. Diferenciador
3. Relevante para la audiencia
4. Memorable
5. Auténtico a la marca

Responde únicamente con el positioning statement, sin formato adicional.
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        brandInfo,
        outputType: 'positioning-statement'
      },
      options: {
        temperature: 0.5,
        maxTokens: 512
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    return response.response.trim()
  }
}