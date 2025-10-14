import { AgentManager } from './AgentManager'
import type { ResourceData, TemplateData, WorkspaceData } from './types'

export interface SemanticResourceIndex {
  resourceId: string
  name: string
  visualSummary: string
  distinctiveFeatures: string[]
  predominantColors: string[]
  brandCompatibility: {
    level: 'high' | 'medium' | 'low'
    justification: string
  }
  recommendedUses: string[]
  risks: string[]
  networkSuitability: Record<string, string>
}

export interface SemanticTemplateIndex {
  templateId: string
  name: string
  layoutStrengths: string[]
  textCapacity: {
    headline: 'high' | 'medium' | 'low'
    subhead: 'high' | 'medium' | 'low'
    cta: 'high' | 'medium' | 'low'
  }
  networkAptitude: Record<string, string>
  colorMapping: {
    background: string
    accent: string
    text: string
  }
  risks: string[]
  businessObjectiveSuitability: Record<string, string>
}

export interface SemanticAnalysisResult {
  resources: SemanticResourceIndex[]
  templates: SemanticTemplateIndex[]
  campaignId: string
  analysisTimestamp: string
}

export class SemanticResourceAnalyzerAgent {
  constructor(private agentManager: AgentManager) {}

  async analyzeResourcesAndTemplates(params: {
    resources: ResourceData[]
    templates: TemplateData[]
    workspace: WorkspaceData
    campaignId: string
    restrictions?: string[]
  }): Promise<SemanticAnalysisResult> {
    console.log('🔍 SemanticResourceAnalyzerAgent: Analyzing resources and templates...')

    const { resources, templates, workspace, campaignId, restrictions = [] } = params

    try {
      const prompt = this.buildAnalysisPrompt(resources, templates, workspace, restrictions)
      
      const response = await this.agentManager.executeAgentRequest({
        agentId: 'visual-analyzer',
        prompt,
        context: {
          campaignId,
          timestamp: new Date().toISOString(),
          resources,
          templates,
          workspace,
          restrictions
        }
      })

      // Parse AI response and structure it
      const analysisResult = this.parseAnalysisResponse(response.response, resources, templates, campaignId)
      
      console.log('✅ Semantic analysis completed:', {
        resourcesAnalyzed: analysisResult.resources.length,
        templatesAnalyzed: analysisResult.templates.length
      })

      return analysisResult

    } catch (error) {
      console.error('❌ Error in semantic analysis:', error)
      
      // Fallback to deterministic analysis
      return this.generateFallbackAnalysis(resources, templates, workspace, campaignId)
    }
  }

  private buildAnalysisPrompt(
    resources: ResourceData[],
    templates: TemplateData[],
    workspace: WorkspaceData,
    restrictions: string[]
  ): string {
    return `
Eres un analista visual senior especializado en branding y creatividad para redes sociales. 

CONTEXTO DE MARCA:
- Nombre: ${workspace.name}
- Colores: Primario ${workspace.branding.primaryColor}, Secundario ${workspace.branding.secondaryColor}
- Slogan: "${workspace.branding.slogan}"
- Descripción: ${workspace.branding.description}

RESTRICCIONES A EVITAR:
${restrictions.length > 0 ? restrictions.join(', ') : 'Ninguna restricción específica'}

RECURSOS A ANALIZAR (${resources.length}):
${resources.map(r => `- ${r.name} (${r.type}): ${r.url}`).join('\n')}

TEMPLATES A ANALIZAR (${templates.length}):
${templates.map(t => `- ${t.name} (${t.type}): Redes ${t.socialNetworks.join(', ')}`).join('\n')}

INSTRUCCIONES:
1. Para cada recurso, describe: composición, iluminación, ángulo, fondo, textura, colores predominantes
2. Evalúa compatibilidad con la paleta de marca (alto/medio/bajo) con justificación
3. Propón usos específicos (hero de single, primer slot de carrusel, etc.)
4. Identifica riesgos (legibilidad, contraste, elementos problemáticos)
5. Para cada template, analiza jerarquía visual, capacidad de texto, adecuación por red
6. Evita suposiciones técnicas no presentes

Responde en formato JSON estructurado con análisis detallado y práctico.
`
  }

  private parseAnalysisResponse(
    aiResponse: any,
    resources: ResourceData[],
    templates: TemplateData[],
    campaignId: string
  ): SemanticAnalysisResult {
    try {
      // Try to parse AI response as JSON
      const parsed = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse
      
      return {
        resources: this.extractResourceAnalysis(parsed.resources || [], resources),
        templates: this.extractTemplateAnalysis(parsed.templates || [], templates),
        campaignId,
        analysisTimestamp: new Date().toISOString()
      }
    } catch (error) {
      console.warn('⚠️ Could not parse AI response, using fallback analysis')
      return this.generateFallbackAnalysis(resources, templates, { name: 'Unknown' } as WorkspaceData, campaignId)
    }
  }

  private extractResourceAnalysis(aiResources: any[], originalResources: ResourceData[]): SemanticResourceIndex[] {
    return originalResources.map((resource, index) => {
      const aiAnalysis = aiResources[index] || {}
      
      return {
        resourceId: resource.id,
        name: resource.name,
        visualSummary: aiAnalysis.visualSummary || this.generateDefaultVisualSummary(resource),
        distinctiveFeatures: aiAnalysis.distinctiveFeatures || this.generateDefaultFeatures(resource),
        predominantColors: aiAnalysis.predominantColors || ['#000000', '#FFFFFF'],
        brandCompatibility: {
          level: aiAnalysis.brandCompatibility?.level || 'medium',
          justification: aiAnalysis.brandCompatibility?.justification || 'Análisis automático basado en tipo de recurso'
        },
        recommendedUses: aiAnalysis.recommendedUses || this.generateDefaultUses(resource),
        risks: aiAnalysis.risks || this.generateDefaultRisks(resource),
        networkSuitability: aiAnalysis.networkSuitability || this.generateDefaultNetworkSuitability(resource)
      }
    })
  }

  private extractTemplateAnalysis(aiTemplates: any[], originalTemplates: TemplateData[]): SemanticTemplateIndex[] {
    return originalTemplates.map((template, index) => {
      const aiAnalysis = aiTemplates[index] || {}
      
      return {
        templateId: template.id,
        name: template.name,
        layoutStrengths: aiAnalysis.layoutStrengths || this.generateDefaultLayoutStrengths(template),
        textCapacity: aiAnalysis.textCapacity || {
          headline: 'medium',
          subhead: 'medium',
          cta: 'high'
        },
        networkAptitude: aiAnalysis.networkAptitude || this.generateDefaultNetworkAptitude(template),
        colorMapping: aiAnalysis.colorMapping || {
          background: '#FFFFFF',
          accent: '#3B82F6',
          text: '#000000'
        },
        risks: aiAnalysis.risks || this.generateDefaultTemplateRisks(template),
        businessObjectiveSuitability: aiAnalysis.businessObjectiveSuitability || this.generateDefaultBusinessSuitability(template)
      }
    })
  }

  private generateFallbackAnalysis(
    resources: ResourceData[],
    templates: TemplateData[],
    workspace: WorkspaceData,
    campaignId: string
  ): SemanticAnalysisResult {
    console.log('🔄 Generating fallback semantic analysis...')

    const resourceAnalysis: SemanticResourceIndex[] = resources.map(resource => ({
      resourceId: resource.id,
      name: resource.name,
      visualSummary: this.generateDefaultVisualSummary(resource),
      distinctiveFeatures: this.generateDefaultFeatures(resource),
      predominantColors: ['#3B82F6', '#FFFFFF'],
      brandCompatibility: {
        level: 'medium',
        justification: 'Análisis automático - requiere revisión manual para optimización'
      },
      recommendedUses: this.generateDefaultUses(resource),
      risks: this.generateDefaultRisks(resource),
      networkSuitability: this.generateDefaultNetworkSuitability(resource)
    }))

    const templateAnalysis: SemanticTemplateIndex[] = templates.map(template => ({
      templateId: template.id,
      name: template.name,
      layoutStrengths: this.generateDefaultLayoutStrengths(template),
      textCapacity: {
        headline: template.type === 'carousel' ? 'high' : 'medium',
        subhead: 'medium',
        cta: 'high'
      },
      networkAptitude: this.generateDefaultNetworkAptitude(template),
      colorMapping: {
        background: workspace.branding?.primaryColor || '#FFFFFF',
        accent: workspace.branding?.secondaryColor || '#3B82F6',
        text: '#000000'
      },
      risks: this.generateDefaultTemplateRisks(template),
      businessObjectiveSuitability: this.generateDefaultBusinessSuitability(template)
    }))

    return {
      resources: resourceAnalysis,
      templates: templateAnalysis,
      campaignId,
      analysisTimestamp: new Date().toISOString()
    }
  }

  private generateDefaultVisualSummary(resource: ResourceData): string {
    const summaries = {
      image: 'Imagen con composición equilibrada, iluminación natural, enfoque nítido',
      video: 'Video con movimiento fluido, buena calidad visual, duración apropiada'
    }
    return summaries[resource.type] || 'Recurso visual de calidad estándar'
  }

  private generateDefaultFeatures(resource: ResourceData): string[] {
    const features = {
      image: ['Composición centrada', 'Colores vibrantes', 'Fondo limpio', 'Alta resolución'],
      video: ['Movimiento suave', 'Audio claro', 'Transiciones fluidas', 'Formato optimizado']
    }
    return features[resource.type] || ['Características estándar']
  }

  private generateDefaultUses(resource: ResourceData): string[] {
    const uses = {
      image: ['Hero de publicación single', 'Primer slide de carrusel', 'Fondo de historia'],
      video: ['Contenido de reel', 'Historia animada', 'Post con video']
    }
    return uses[resource.type] || ['Uso general en publicaciones']
  }

  private generateDefaultRisks(resource: ResourceData): string[] {
    const risks = {
      image: ['Posible pérdida de calidad en redimensionado', 'Contraste variable según fondo'],
      video: ['Tamaño de archivo grande', 'Compatibilidad con diferentes dispositivos']
    }
    return risks[resource.type] || ['Riesgos mínimos identificados']
  }

  private generateDefaultNetworkSuitability(resource: ResourceData): Record<string, string> {
    return {
      instagram: 'Excelente para feed y stories',
      facebook: 'Bueno para publicaciones orgánicas',
      linkedin: 'Apropiado con enfoque profesional',
      twitter: 'Requiere optimización de tamaño',
      tiktok: resource.type === 'video' ? 'Ideal para contenido vertical' : 'Limitado'
    }
  }

  private generateDefaultLayoutStrengths(template: TemplateData): string[] {
    const strengths = {
      single: ['Jerarquía visual clara', 'Espacio amplio para contenido principal', 'Área destacada para CTA'],
      carousel: ['Narrativa secuencial', 'Múltiples puntos de información', 'Engagement prolongado']
    }
    return strengths[template.type] || ['Layout versátil y funcional']
  }

  private generateDefaultNetworkAptitude(template: TemplateData): Record<string, string> {
    const aptitudes: Record<string, Record<string, string>> = {
      single: {
        instagram: 'Formato cuadrado 1:1 ideal',
        facebook: 'Adaptable a diferentes ratios',
        linkedin: 'Profesional y directo',
        twitter: 'Requiere texto conciso'
      },
      carousel: {
        instagram: 'Formato nativo, alta interacción',
        facebook: 'Buen engagement, múltiples slides',
        linkedin: 'Ideal para contenido educativo',
        twitter: 'No soportado nativamente'
      }
    }
    
    return aptitudes[template.type] || {
      instagram: 'Adaptable',
      facebook: 'Compatible',
      linkedin: 'Funcional'
    }
  }

  private generateDefaultTemplateRisks(template: TemplateData): string[] {
    const risks = {
      single: ['Sobrecarga de información en espacio limitado', 'Dependencia de una sola imagen impactante'],
      carousel: ['Pérdida de audiencia en slides posteriores', 'Complejidad en diseño consistente']
    }
    return risks[template.type] || ['Riesgos estándar de diseño']
  }

  private generateDefaultBusinessSuitability(template: TemplateData): Record<string, string> {
    return {
      awareness: template.type === 'single' ? 'Excelente para impacto visual' : 'Bueno para storytelling',
      engagement: template.type === 'carousel' ? 'Ideal para interacción' : 'Bueno para reacciones',
      conversion: 'Apropiado con CTA claro',
      education: template.type === 'carousel' ? 'Perfecto para contenido paso a paso' : 'Limitado'
    }
  }
}