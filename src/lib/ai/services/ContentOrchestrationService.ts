import { AgentManager } from '../agents/AgentManager'
import { GeminiService, createGeminiService } from '../GeminiService'
import { SemanticResourceAnalyzerAgent, type SemanticAnalysisResult } from '../agents/SemanticResourceAnalyzerAgent'
import { TemporalPlannerService, type TemporalPlan } from '../agents/TemporalPlannerService'
import { ContentIdeationOrchestratorAgent, type ContentIdeationResult } from '../agents/ContentIdeationOrchestratorAgent'
import type { 
  CampaignData, 
  WorkspaceData, 
  ResourceData, 
  TemplateData 
} from '../agents/types'

export interface ContentOrchestrationParams {
  campaign: CampaignData
  workspace: WorkspaceData
  resources: ResourceData[]
  templates: TemplateData[]
  restrictions?: string[]
  businessObjectives?: string[]
}

export interface ContentOrchestrationResult {
  campaignId: string
  phase: 'content-orchestration'
  semanticAnalysis: SemanticAnalysisResult
  temporalPlan: TemporalPlan
  contentIdeas: ContentIdeationResult
  consolidatedPlan: ConsolidatedContentPlan
  qualityControl: QualityControlResult
  executionTimestamp: string
  processingTimeMs: number
}

export interface ConsolidatedContentPlan {
  totalSlots: number
  slots: ConsolidatedSlot[]
  summary: {
    networkDistribution: Record<string, number>
    formatDistribution: Record<string, number>
    priorityDistribution: Record<string, number>
    resourceUsage: Record<string, number>
    templateUsage: Record<string, number>
  }
}

export interface ConsolidatedSlot {
  slotId: string
  order: number
  scheduledDate: string
  socialNetworks: string[]
  format: 'single' | 'carousel'
  templateSummary: string
  ideaSummary: string
  resourceRequirements: string[]
  validationStatus: 'passed' | 'warning' | 'error'
  validationNotes: string[]
}

export interface QualityControlResult {
  templateConsistency: boolean
  resourceAvailability: boolean
  restrictionsCompliance: boolean
  legibilitySignals: boolean
  brandAlignment: boolean
  overallScore: number
  criticalIssues: string[]
  recommendations: string[]
}

export interface ValidationInput {
  campaign: CampaignData
  workspace: WorkspaceData
  resources: ResourceData[]
  templates: TemplateData[]
}

export class ContentOrchestrationService {
  private agentManager: AgentManager
  private semanticAnalyzer: SemanticResourceAnalyzerAgent
  private temporalPlanner: TemporalPlannerService
  private contentOrchestrator: ContentIdeationOrchestratorAgent

  constructor() {
    try {
      const geminiService = createGeminiService()
      this.agentManager = new AgentManager(geminiService)
      this.semanticAnalyzer = new SemanticResourceAnalyzerAgent(this.agentManager)
      this.temporalPlanner = new TemporalPlannerService()
      this.contentOrchestrator = new ContentIdeationOrchestratorAgent(this.agentManager)
      
      console.log('✅ ContentOrchestrationService inicializado correctamente')
    } catch (error) {
      console.error('❌ Error inicializando ContentOrchestrationService:', error)
      throw error
    }
  }

  /**
   * Ejecuta la Fase 1 completa de orquestación de contenido
   */
  async executePhase1(params: ContentOrchestrationParams): Promise<ContentOrchestrationResult> {
    const startTime = Date.now()
    console.log('🚀 ContentOrchestrationService: Iniciando Fase 1 - Orquestación de ideas de contenido')

    try {
      // 1. Validación de insumos
      console.log('📋 Paso 1: Validación de insumos...')
      const validation = this.validateInputs(params)
      if (!validation.isValid) {
        throw new Error(`Validación fallida: ${validation.errors.join(', ')}`)
      }

      // 2. Agente 1 — Descriptor Semántico de Recursos
      console.log('🔍 Paso 2: Análisis semántico de recursos y templates...')
      const semanticAnalysis = await this.semanticAnalyzer.analyzeResourcesAndTemplates({
        resources: params.resources,
        templates: params.templates,
        workspace: params.workspace,
        campaignId: params.campaign.id,
        restrictions: params.restrictions
      })

      // 3. Planificador Temporal (función determinística)
      console.log('📅 Paso 3: Planificación temporal de slots...')
      const temporalPlan = this.temporalPlanner.calculatePublicationSlots({
        campaignId: params.campaign.id,
        startDate: params.campaign.startDate,
        endDate: params.campaign.endDate,
        intervalHours: params.campaign.intervalHours
      })

      // 4. Agente 2 — Ideador Orquestador
      console.log('🎨 Paso 4: Generación de ideas de contenido...')
      const contentIdeas = await this.contentOrchestrator.generateContentIdeas({
        campaign: params.campaign,
        workspace: params.workspace,
        semanticAnalysis,
        temporalPlan,
        restrictions: params.restrictions,
        businessObjectives: params.businessObjectives
      })

      // 5. Compilación para UI
      console.log('📊 Paso 5: Compilación de plan consolidado...')
      const consolidatedPlan = this.compileConsolidatedPlan(contentIdeas, semanticAnalysis, temporalPlan)

      // 6. Control de calidad
      console.log('✅ Paso 6: Control de calidad...')
      const qualityControl = this.performQualityControl(
        params,
        semanticAnalysis,
        contentIdeas,
        consolidatedPlan
      )

      const processingTime = Date.now() - startTime

      const result: ContentOrchestrationResult = {
        campaignId: params.campaign.id,
        phase: 'content-orchestration',
        semanticAnalysis,
        temporalPlan,
        contentIdeas,
        consolidatedPlan,
        qualityControl,
        executionTimestamp: new Date().toISOString(),
        processingTimeMs: processingTime
      }

      console.log('🎉 Fase 1 completada exitosamente:', {
        processingTimeMs: processingTime,
        totalSlots: consolidatedPlan.totalSlots,
        qualityScore: qualityControl.overallScore,
        criticalIssues: qualityControl.criticalIssues.length
      })

      return result

    } catch (error) {
      console.error('❌ Error en Fase 1:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      throw new Error(`Error en orquestación de contenido: ${errorMessage}`)
    }
  }

  /**
   * Validación de insumos según especificación
   */
  private validateInputs(params: ContentOrchestrationParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validar templates
    if (!params.templates || params.templates.length === 0) {
      errors.push('Debe haber al menos un template seleccionado')
    }

    // Validar ventana temporal
    if (!params.campaign.startDate || !params.campaign.endDate) {
      errors.push('Fechas de inicio y fin son requeridas')
    }

    if (params.campaign.startDate && params.campaign.endDate) {
      const start = new Date(params.campaign.startDate)
      const end = new Date(params.campaign.endDate)
      
      if (start >= end) {
        errors.push('La fecha de fin debe ser posterior a la fecha de inicio')
      }
    }

    // Validar intervalo
    if (!params.campaign.intervalHours || params.campaign.intervalHours <= 0) {
      errors.push('El intervalo debe ser mayor a cero')
    }

    // Validar redes objetivo
    if (!params.campaign.socialNetworks || params.campaign.socialNetworks.length === 0) {
      errors.push('Debe especificar al menos una red social objetivo')
    }

    // Normalizar redes objetivo (según especificación)
    if (params.campaign.socialNetworks) {
      params.campaign.socialNetworks = params.campaign.socialNetworks.map(network => 
        network.toLowerCase().trim()
      )
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Compilación del plan consolidado para UI
   */
  private compileConsolidatedPlan(
    contentIdeas: ContentIdeationResult,
    semanticAnalysis: SemanticAnalysisResult,
    temporalPlan: TemporalPlan
  ): ConsolidatedContentPlan {
    const slots: ConsolidatedSlot[] = contentIdeas.ideas.map(idea => {
      const template = semanticAnalysis.templates.find(t => t.templateId === idea.recommendedTemplate.templateId)
      
      return {
        slotId: idea.slotId,
        order: idea.slotOrder,
        scheduledDate: idea.scheduledDate,
        socialNetworks: idea.socialNetworks,
        format: idea.format,
        templateSummary: `${idea.recommendedTemplate.name} (${idea.format})`,
        ideaSummary: `${idea.creativeDirection.internalTitle} - ${idea.objective}`,
        resourceRequirements: [
          ...idea.resourceStrategy.required,
          ...idea.resourceStrategy.optional
        ],
        validationStatus: this.determineSlotValidationStatus(idea, template),
        validationNotes: this.generateSlotValidationNotes(idea, template)
      }
    })

    // Calcular estadísticas
    const networkDistribution = this.calculateDistribution(slots, slot => slot.socialNetworks)
    const formatDistribution = this.calculateDistribution(slots, slot => [slot.format])
    const priorityDistribution = this.calculateDistribution(
      contentIdeas.ideas, 
      idea => [idea.qualityChecklist.contrastRatio]
    )
    const resourceUsage = this.calculateResourceUsage(contentIdeas.ideas)
    const templateUsage = this.calculateTemplateUsage(contentIdeas.ideas)

    return {
      totalSlots: slots.length,
      slots,
      summary: {
        networkDistribution,
        formatDistribution,
        priorityDistribution,
        resourceUsage,
        templateUsage
      }
    }
  }

  private determineSlotValidationStatus(idea: any, template: any): 'passed' | 'warning' | 'error' {
    if (!template) return 'error'
    if (idea.qualityChecklist.predictedRisks.length > 0) return 'warning'
    if (!idea.qualityChecklist.logoInSafeArea) return 'warning'
    return 'passed'
  }

  private generateSlotValidationNotes(idea: any, template: any): string[] {
    const notes: string[] = []
    
    if (!template) {
      notes.push('Template no encontrado')
    }
    
    if (idea.qualityChecklist.predictedRisks.length > 0) {
      notes.push(`Riesgos: ${idea.qualityChecklist.predictedRisks.join(', ')}`)
    }
    
    if (!idea.qualityChecklist.logoInSafeArea) {
      notes.push('Verificar posición del logo')
    }
    
    if (idea.qualityChecklist.textDensity === 'high') {
      notes.push('Alta densidad de texto - revisar legibilidad')
    }

    return notes
  }

  private calculateDistribution<T>(items: T[], extractor: (item: T) => string[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    
    items.forEach(item => {
      const values = extractor(item)
      values.forEach(value => {
        distribution[value] = (distribution[value] || 0) + 1
      })
    })
    
    return distribution
  }

  private calculateResourceUsage(ideas: any[]): Record<string, number> {
    const usage: Record<string, number> = {}
    
    ideas.forEach(idea => {
      const allResources = [
        ...idea.resourceStrategy.required,
        ...idea.resourceStrategy.optional
      ]
      
      allResources.forEach(resourceId => {
        usage[resourceId] = (usage[resourceId] || 0) + 1
      })
    })
    
    return usage
  }

  private calculateTemplateUsage(ideas: any[]): Record<string, number> {
    const usage: Record<string, number> = {}
    
    ideas.forEach(idea => {
      const templateId = idea.recommendedTemplate.templateId
      usage[templateId] = (usage[templateId] || 0) + 1
    })
    
    return usage
  }

  /**
   * Control de calidad según especificación
   */
  private performQualityControl(
    params: ContentOrchestrationParams,
    semanticAnalysis: SemanticAnalysisResult,
    contentIdeas: ContentIdeationResult,
    consolidatedPlan: ConsolidatedContentPlan
  ): QualityControlResult {
    const issues: string[] = []
    const recommendations: string[] = []

    // 1. Consistencia de plantillas y recursos propuestos
    const templateConsistency = this.checkTemplateConsistency(contentIdeas, semanticAnalysis, issues)
    
    // 2. Disponibilidad de recursos
    const resourceAvailability = this.checkResourceAvailability(contentIdeas, params.resources, issues)
    
    // 3. Cumplimiento de restricciones
    const restrictionsCompliance = this.checkRestrictionsCompliance(
      contentIdeas, 
      params.restrictions || [], 
      issues
    )
    
    // 4. Señales tempranas de legibilidad
    const legibilitySignals = this.checkLegibilitySignals(contentIdeas, issues, recommendations)
    
    // 5. Alineación con marca
    const brandAlignment = this.checkBrandAlignment(contentIdeas, params.workspace, issues, recommendations)

    // Calcular score general
    const checks = [templateConsistency, resourceAvailability, restrictionsCompliance, legibilitySignals, brandAlignment]
    const overallScore = Math.round((checks.filter(Boolean).length / checks.length) * 100)

    return {
      templateConsistency,
      resourceAvailability,
      restrictionsCompliance,
      legibilitySignals,
      brandAlignment,
      overallScore,
      criticalIssues: issues,
      recommendations
    }
  }

  private checkTemplateConsistency(
    contentIdeas: ContentIdeationResult,
    semanticAnalysis: SemanticAnalysisResult,
    issues: string[]
  ): boolean {
    const availableTemplateIds = semanticAnalysis.templates.map(t => t.templateId)
    let isConsistent = true

    contentIdeas.ideas.forEach((idea, index) => {
      if (!availableTemplateIds.includes(idea.recommendedTemplate.templateId)) {
        issues.push(`Slot ${index + 1}: Template "${idea.recommendedTemplate.templateId}" no está disponible`)
        isConsistent = false
      }
    })

    return isConsistent
  }

  private checkResourceAvailability(
    contentIdeas: ContentIdeationResult,
    availableResources: ResourceData[],
    issues: string[]
  ): boolean {
    const availableResourceIds = availableResources.map(r => r.id)
    let allAvailable = true

    contentIdeas.ideas.forEach((idea, index) => {
      idea.resourceStrategy.required.forEach(resourceId => {
        if (!availableResourceIds.includes(resourceId)) {
          issues.push(`Slot ${index + 1}: Recurso requerido "${resourceId}" no está disponible`)
          allAvailable = false
        }
      })
    })

    return allAvailable
  }

  private checkRestrictionsCompliance(
    contentIdeas: ContentIdeationResult,
    restrictions: string[],
    issues: string[]
  ): boolean {
    let isCompliant = true

    restrictions.forEach(restriction => {
      contentIdeas.ideas.forEach((idea, index) => {
        const ideaContent = JSON.stringify(idea).toLowerCase()
        if (ideaContent.includes(restriction.toLowerCase())) {
          issues.push(`Slot ${index + 1}: Contiene elemento restringido "${restriction}"`)
          isCompliant = false
        }
      })
    })

    return isCompliant
  }

  private checkLegibilitySignals(
    contentIdeas: ContentIdeationResult,
    issues: string[],
    recommendations: string[]
  ): boolean {
    let hasGoodLegibility = true

    contentIdeas.ideas.forEach((idea, index) => {
      // Densidad de texto vs contraste
      if (idea.qualityChecklist.textDensity === 'high' && idea.qualityChecklist.contrastRatio === 'low') {
        issues.push(`Slot ${index + 1}: Alta densidad de texto con bajo contraste`)
        hasGoodLegibility = false
      }

      // Logo en área segura
      if (!idea.qualityChecklist.logoInSafeArea) {
        recommendations.push(`Slot ${index + 1}: Verificar posición del logo en área segura`)
      }

      // Riesgos predichos
      if (idea.qualityChecklist.predictedRisks.length > 0) {
        recommendations.push(`Slot ${index + 1}: Revisar riesgos: ${idea.qualityChecklist.predictedRisks.join(', ')}`)
      }
    })

    return hasGoodLegibility
  }

  private checkBrandAlignment(
    contentIdeas: ContentIdeationResult,
    workspace: WorkspaceData,
    issues: string[],
    recommendations: string[]
  ): boolean {
    let isAligned = true

    // Verificar que se use el branding consistentemente
    contentIdeas.ideas.forEach((idea, index) => {
      const hasSlogan = JSON.stringify(idea).includes(workspace.branding.slogan || '')
      const hasBrandName = JSON.stringify(idea).includes(workspace.name)

      if (!hasBrandName) {
        recommendations.push(`Slot ${index + 1}: Considerar incluir nombre de marca "${workspace.name}"`)
      }

      if (workspace.branding.slogan && !hasSlogan) {
        recommendations.push(`Slot ${index + 1}: Considerar incluir slogan "${workspace.branding.slogan}"`)
      }
    })

    return isAligned
  }

  /**
   * Exportar resultado de la Fase 1 para la siguiente fase
   */
  async exportForPhase2(result: ContentOrchestrationResult): Promise<string> {
    const exportData = {
      phase1Result: result,
      readyForPhase2: result.qualityControl.overallScore >= 70,
      criticalIssues: result.qualityControl.criticalIssues,
      nextSteps: [
        'Revisar y aprobar ideas de contenido',
        'Proceder a generación de materiales (Fase 2)',
        'Ajustar recursos o templates si es necesario'
      ]
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Obtener resumen ejecutivo de la Fase 1
   */
  getExecutiveSummary(result: ContentOrchestrationResult): {
    campaignName: string
    totalContent: number
    qualityScore: number
    readyForProduction: boolean
    keyMetrics: Record<string, any>
    nextActions: string[]
  } {
    return {
      campaignName: result.campaignId,
      totalContent: result.consolidatedPlan.totalSlots,
      qualityScore: result.qualityControl.overallScore,
      readyForProduction: result.qualityControl.overallScore >= 70 && result.qualityControl.criticalIssues.length === 0,
      keyMetrics: {
        processingTime: `${result.processingTimeMs}ms`,
        networksCount: Object.keys(result.consolidatedPlan.summary.networkDistribution).length,
        templatesUsed: Object.keys(result.consolidatedPlan.summary.templateUsage).length,
        resourcesUsed: Object.keys(result.consolidatedPlan.summary.resourceUsage).length
      },
      nextActions: result.qualityControl.criticalIssues.length > 0 
        ? ['Resolver problemas críticos', 'Revisar configuración']
        : ['Aprobar plan', 'Proceder a Fase 2']
    }
  }
}