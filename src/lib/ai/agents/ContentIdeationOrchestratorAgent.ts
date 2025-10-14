import { AgentManager } from './AgentManager'
import type { 
  CampaignData, 
  WorkspaceData, 
  ResourceData, 
  TemplateData 
} from './types'
import type { 
  SemanticAnalysisResult, 
  SemanticResourceIndex, 
  SemanticTemplateIndex 
} from './SemanticResourceAnalyzerAgent'
import type { TemporalPlan, TimeSlot } from './TemporalPlannerService'

export interface ContentIdea {
  slotId: string
  slotOrder: number
  scheduledDate: string
  socialNetworks: string[]
  objective: string
  format: 'text-only' | 'text-with-image' | 'text-with-carousel'
  recommendedTemplate: {
    templateId: string
    name: string
    justification: string
  }
  resourceStrategy: {
    required: string[]
    optional: string[]
    fallback: string[]
    policy: string
  }
  creativeDirection: {
    internalTitle: string
    messagePillars: string[]
    tone: string
    hooks: string[]
    mainCTA: string
  }
  networkVariations: Record<string, {
    cropSuggestion: string
    copyNotes: string[]
    hashtags: string[]
  }>
  qualityChecklist: {
    logoInSafeArea: boolean
    contrastRatio: 'high' | 'medium' | 'low'
    textDensity: 'high' | 'medium' | 'low'
    predictedRisks: string[]
  }
}

export interface ContentIdeationResult {
  campaignId: string
  totalIdeas: number
  ideas: ContentIdea[]
  validationResults: {
    consistencyCheck: boolean
    restrictionsCompliance: boolean
    legibilitySignals: boolean
    errors: string[]
    warnings: string[]
  }
  generationTimestamp: string
}

export interface ContentIdeationParams {
  campaign: CampaignData
  workspace: WorkspaceData
  semanticAnalysis: SemanticAnalysisResult
  temporalPlan: TemporalPlan
  restrictions?: string[]
  businessObjectives?: string[]
}

export class ContentIdeationOrchestratorAgent {
  constructor(private agentManager: AgentManager) {}

  async generateContentIdeas(params: ContentIdeationParams): Promise<ContentIdeationResult> {
    console.log('🎨 ContentIdeationOrchestratorAgent: Generating content ideas...')

    const { campaign, workspace, semanticAnalysis, temporalPlan, restrictions = [], businessObjectives = [] } = params

    try {
      // Generar prompt para el agente de IA
      const prompt = this.buildIdeationPrompt(campaign, workspace, semanticAnalysis, temporalPlan, restrictions, businessObjectives)
      
      const response = await this.agentManager.executeAgentRequest({
        agentId: 'campaign-planner',
        prompt,
        context: {
          campaignId: campaign.id,
          timestamp: new Date().toISOString(),
          campaign,
          workspace,
          semanticAnalysis,
          temporalPlan,
          restrictions,
          businessObjectives
        }
      })

      // Procesar respuesta de IA
      const ideationResult = this.parseIdeationResponse(response.response, campaign.id, temporalPlan)
      
      // Validar resultado
      const validationResults = this.validateIdeationResult(ideationResult, semanticAnalysis, restrictions)
      
      const finalResult: ContentIdeationResult = {
        ...ideationResult,
        validationResults,
        generationTimestamp: new Date().toISOString()
      }

      console.log('✅ Content ideation completed:', {
        totalIdeas: finalResult.totalIdeas,
        validationPassed: validationResults.consistencyCheck && validationResults.restrictionsCompliance,
        errors: validationResults.errors.length,
        warnings: validationResults.warnings.length
      })

      return finalResult

    } catch (error) {
      console.error('❌ Error in content ideation:', error)
      
      // Fallback a generación determinística
      return this.generateFallbackContentIdeas(params)
    }
  }

  private buildIdeationPrompt(
    campaign: CampaignData,
    workspace: WorkspaceData,
    semanticAnalysis: SemanticAnalysisResult,
    temporalPlan: TemporalPlan,
    restrictions: string[],
    businessObjectives: string[]
  ): string {
    return `
Eres un director creativo senior de social media. Convierte el brief y branding en ideas de contenido accionables.

CONTEXTO DE CAMPAÑA:
- Nombre: ${campaign.name}
- Objetivo: ${campaign.objective}
- Descripción: ${campaign.prompt}
- Redes objetivo: ${campaign.socialNetworks.join(', ')}
- Duración: ${temporalPlan.totalSlots} publicaciones

BRANDING:
- Marca: ${workspace.name}
- Colores: ${workspace.branding.primaryColor}, ${workspace.branding.secondaryColor}
- Slogan: "${workspace.branding.slogan}"
- Descripción: ${workspace.branding.description}

OBJETIVOS DE NEGOCIO:
${businessObjectives.length > 0 ? businessObjectives.join(', ') : 'No especificados'}

RESTRICCIONES:
${restrictions.length > 0 ? restrictions.join(', ') : 'Ninguna restricción específica'}

RECURSOS DISPONIBLES:
${semanticAnalysis.resources.map(r => 
  `- ${r.name}: ${r.visualSummary} (Compatibilidad: ${r.brandCompatibility.level})`
).join('\n')}

TEMPLATES DISPONIBLES:
${semanticAnalysis.templates.map(t => 
  `- ${t.name}: ${t.layoutStrengths.join(', ')}`
).join('\n')}

SLOTS DE PUBLICACIÓN:
${temporalPlan.slots.slice(0, 5).map(slot => 
  `- Slot ${slot.order + 1}: ${new Date(slot.scheduledDate).toLocaleDateString('es-ES', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`
).join('\n')}
${temporalPlan.slots.length > 5 ? `... y ${temporalPlan.slots.length - 5} slots más` : ''}

INSTRUCCIONES:
1. Para cada slot, selecciona el template que mejor atienda el objetivo y red
2. Define formato (text-only/text-with-image/text-with-carousel) coherente con template
3. Establece estrategia de recursos: requeridos, opcionales, fallback
4. Redacta dirección creativa: título interno, pilares de mensaje, tono, hooks, CTA
5. Especifica variaciones por red: crop, notas de copy, hashtags orientativos
6. Incluye checklist de calidad: logo, contraste, densidad de texto, riesgos

EVITA:
- Copies finales extensos (solo lineamientos)
- Contradecir restricciones de marca
- Proponer recursos inexistentes sin fallback
- Ideas que excedan capacidad de texto del template

Responde en formato JSON estructurado con ideas detalladas y accionables.
`
  }

  private parseIdeationResponse(
    aiResponse: any,
    campaignId: string,
    temporalPlan: TemporalPlan
  ): ContentIdeationResult {
    try {
      const parsed = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse
      
      const ideas = this.extractContentIdeas(parsed.ideas || [], temporalPlan.slots)
      
      return {
        campaignId,
        totalIdeas: ideas.length,
        ideas,
        validationResults: {
          consistencyCheck: true,
          restrictionsCompliance: true,
          legibilitySignals: true,
          errors: [],
          warnings: []
        },
        generationTimestamp: new Date().toISOString()
      }
    } catch (error) {
      console.warn('⚠️ Could not parse AI ideation response, using fallback')
      throw error
    }
  }

  private extractContentIdeas(aiIdeas: any[], timeSlots: TimeSlot[]): ContentIdea[] {
    return timeSlots.map((slot, index) => {
      const aiIdea = aiIdeas[index] || {}
      
      return {
        slotId: slot.id,
        slotOrder: slot.order,
        scheduledDate: slot.scheduledDate,
        socialNetworks: aiIdea.socialNetworks || ['instagram'],
        objective: aiIdea.objective || 'Generar engagement y awareness',
        format: aiIdea.format || 'text-only',
        recommendedTemplate: {
          templateId: aiIdea.recommendedTemplate?.templateId || 'template-default',
          name: aiIdea.recommendedTemplate?.name || 'Template por defecto',
          justification: aiIdea.recommendedTemplate?.justification || 'Selección automática basada en formato'
        },
        resourceStrategy: {
          required: aiIdea.resourceStrategy?.required || [],
          optional: aiIdea.resourceStrategy?.optional || [],
          fallback: aiIdea.resourceStrategy?.fallback || ['default-brand-image'],
          policy: aiIdea.resourceStrategy?.policy || 'Usar recursos de marca si no hay específicos disponibles'
        },
        creativeDirection: {
          internalTitle: aiIdea.creativeDirection?.internalTitle || `Contenido ${index + 1}`,
          messagePillars: aiIdea.creativeDirection?.messagePillars || ['Calidad', 'Confianza', 'Innovación'],
          tone: aiIdea.creativeDirection?.tone || 'profesional y cercano',
          hooks: aiIdea.creativeDirection?.hooks || ['¿Sabías que...?', 'Descubre cómo...'],
          mainCTA: aiIdea.creativeDirection?.mainCTA || 'Conoce más'
        },
        networkVariations: this.generateNetworkVariations(aiIdea.networkVariations, slot),
        qualityChecklist: {
          logoInSafeArea: aiIdea.qualityChecklist?.logoInSafeArea ?? true,
          contrastRatio: aiIdea.qualityChecklist?.contrastRatio || 'medium',
          textDensity: aiIdea.qualityChecklist?.textDensity || 'medium',
          predictedRisks: aiIdea.qualityChecklist?.predictedRisks || []
        }
      }
    })
  }

  private generateNetworkVariations(aiVariations: any, slot: TimeSlot): Record<string, any> {
    const defaultVariations = {
      instagram: {
        cropSuggestion: 'Cuadrado 1:1 para feed, vertical 9:16 para stories',
        copyNotes: ['Usar emojis para mayor engagement', 'Incluir pregunta para generar comentarios'],
        hashtags: ['#marca', '#calidad', '#innovacion']
      },
      facebook: {
        cropSuggestion: 'Horizontal 16:9 o cuadrado 1:1',
        copyNotes: ['Texto más descriptivo permitido', 'Incluir call-to-action claro'],
        hashtags: ['#empresa', '#servicio', '#calidad']
      },
      linkedin: {
        cropSuggestion: 'Horizontal 16:9 profesional',
        copyNotes: ['Tono profesional y educativo', 'Incluir insights del sector'],
        hashtags: ['#profesional', '#industria', '#liderazgo']
      }
    }

    return aiVariations || defaultVariations
  }

  private validateIdeationResult(
    result: ContentIdeationResult,
    semanticAnalysis: SemanticAnalysisResult,
    restrictions: string[]
  ): {
    consistencyCheck: boolean
    restrictionsCompliance: boolean
    legibilitySignals: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Validar consistencia de templates
    const availableTemplateIds = semanticAnalysis.templates.map(t => t.templateId)
    result.ideas.forEach((idea, index) => {
      if (!availableTemplateIds.includes(idea.recommendedTemplate.templateId)) {
        errors.push(`Idea ${index + 1}: Template ${idea.recommendedTemplate.templateId} no está disponible`)
      }
    })

    // Validar cumplimiento de restricciones
    restrictions.forEach(restriction => {
      result.ideas.forEach((idea, index) => {
        const ideaText = JSON.stringify(idea).toLowerCase()
        if (ideaText.includes(restriction.toLowerCase())) {
          errors.push(`Idea ${index + 1}: Contiene elemento restringido "${restriction}"`)
        }
      })
    })

    // Validar señales de legibilidad
    result.ideas.forEach((idea, index) => {
      if (idea.qualityChecklist.textDensity === 'high' && idea.qualityChecklist.contrastRatio === 'low') {
        warnings.push(`Idea ${index + 1}: Alta densidad de texto con bajo contraste puede afectar legibilidad`)
      }
      
      if (!idea.qualityChecklist.logoInSafeArea) {
        warnings.push(`Idea ${index + 1}: Logo puede no estar en área segura`)
      }
    })

    // Validar fallbacks
    result.ideas.forEach((idea, index) => {
      if (idea.resourceStrategy.required.length > 0 && idea.resourceStrategy.fallback.length === 0) {
        warnings.push(`Idea ${index + 1}: Recursos requeridos sin fallback definido`)
      }
    })

    return {
      consistencyCheck: !result.ideas.some(idea => 
        !availableTemplateIds.includes(idea.recommendedTemplate.templateId)
      ),
      restrictionsCompliance: errors.filter(e => e.includes('restringido')).length === 0,
      legibilitySignals: warnings.filter(w => w.includes('legibilidad')).length === 0,
      errors,
      warnings
    }
  }

  private generateFallbackContentIdeas(params: ContentIdeationParams): ContentIdeationResult {
    console.log('🔄 Generating fallback content ideas...')

    const { campaign, workspace, semanticAnalysis, temporalPlan } = params

    const fallbackIdeas: ContentIdea[] = temporalPlan.slots.map((slot, index) => {
      const socialNetwork = campaign.socialNetworks[index % campaign.socialNetworks.length]
      const template = semanticAnalysis.templates[index % semanticAnalysis.templates.length]
      const resource = semanticAnalysis.resources[index % semanticAnalysis.resources.length]

      return {
        slotId: slot.id,
        slotOrder: slot.order,
        scheduledDate: slot.scheduledDate,
        socialNetworks: [socialNetwork],
        objective: this.generateObjectiveForSlot(index, campaign.objective),
        format: template?.templateId.includes('carousel') ? 'text-with-carousel' : 'text-with-image',
        recommendedTemplate: {
          templateId: template?.templateId || 'template-default',
          name: template?.name || 'Template por defecto',
          justification: 'Selección automática basada en disponibilidad'
        },
        resourceStrategy: {
          required: resource ? [resource.resourceId] : [],
          optional: [],
          fallback: ['brand-logo', 'default-background'],
          policy: 'Usar recursos de marca como fallback'
        },
        creativeDirection: this.generateCreativeDirection(index, campaign, workspace),
        networkVariations: this.generateNetworkVariations(null, slot),
        qualityChecklist: {
          logoInSafeArea: true,
          contrastRatio: 'medium',
          textDensity: 'medium',
          predictedRisks: ['Revisar contraste final', 'Validar legibilidad en móvil']
        }
      }
    })

    return {
      campaignId: campaign.id,
      totalIdeas: fallbackIdeas.length,
      ideas: fallbackIdeas,
      validationResults: {
        consistencyCheck: true,
        restrictionsCompliance: true,
        legibilitySignals: true,
        errors: [],
        warnings: ['Generado con algoritmo de fallback - revisar manualmente']
      },
      generationTimestamp: new Date().toISOString()
    }
  }

  private generateObjectiveForSlot(index: number, campaignObjective: string): string {
    const objectives = [
      'Generar awareness de marca',
      'Aumentar engagement con la audiencia',
      'Educar sobre beneficios del producto',
      'Mostrar casos de uso reales',
      'Impulsar conversiones',
      'Fortalecer confianza y credibilidad'
    ]

    const baseObjective = objectives[index % objectives.length]
    return `${baseObjective} - ${campaignObjective}`
  }

  private generateCreativeDirection(index: number, campaign: CampaignData, workspace: WorkspaceData) {
    const themes = [
      {
        title: 'Presentación de valor',
        pillars: ['Calidad', 'Innovación', 'Confianza'],
        hooks: ['¿Sabías que...?', 'Descubre por qué...'],
        cta: 'Conoce más'
      },
      {
        title: 'Beneficios clave',
        pillars: ['Eficiencia', 'Resultados', 'Satisfacción'],
        hooks: ['Imagínate poder...', 'La diferencia está en...'],
        cta: 'Prueba ahora'
      },
      {
        title: 'Casos de éxito',
        pillars: ['Experiencia', 'Testimonios', 'Resultados'],
        hooks: ['Nuestros clientes dicen...', 'Casos reales de...'],
        cta: 'Ver más casos'
      }
    ]

    const theme = themes[index % themes.length]

    return {
      internalTitle: `${theme.title} - ${campaign.name}`,
      messagePillars: theme.pillars,
      tone: 'profesional y cercano',
      hooks: theme.hooks,
      mainCTA: theme.cta
    }
  }
}