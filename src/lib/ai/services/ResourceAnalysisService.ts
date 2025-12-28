import { AgentManager } from '../agents/AgentManager'
import { VisualAnalyzerAgent } from '../agents/VisualAnalyzerAgent'
import { CarouselAnalyzerAgent } from '../agents/CarouselAnalyzerAgent'
import { SemanticResourceAnalyzerAgent } from '../agents/SemanticResourceAnalyzerAgent'
import { ResourceAnalysisRepository } from '../../database/repositories/ResourceAnalysisRepository'
import { TemplateAnalysisRepository } from '../../database/repositories/TemplateAnalysisRepository'
import type { ResourceData, TemplateData, WorkspaceData } from '../agents/types'
import type { ResourceAnalysis } from '../agents/VisualAnalyzerAgent'
import type { CarouselAnalysis } from '../agents/CarouselAnalyzerAgent'
import type { SemanticAnalysisResult } from '../agents/SemanticResourceAnalyzerAgent'
import type { ResourceAnalysisRecord } from '../../database/repositories/ResourceAnalysisRepository'
import type { TemplateAnalysisRecord } from '../../database/repositories/TemplateAnalysisRepository'

/**
 * Service for analyzing resources and templates immediately upon upload/creation
 * This optimizes campaign creation by pre-computing AI analyses
 */
export class ResourceAnalysisService {
  private agentManager: AgentManager
  private visualAnalyzer: VisualAnalyzerAgent
  private carouselAnalyzer: CarouselAnalyzerAgent
  private semanticAnalyzer: SemanticResourceAnalyzerAgent
  private resourceAnalysisRepo: ResourceAnalysisRepository
  private templateAnalysisRepo: TemplateAnalysisRepository
  private analysisVersion = '2.0' // Incrementado para las nuevas funcionalidades

  constructor() {
    // Import GeminiService for AgentManager
    const { GeminiService } = require('../GeminiService')
    const geminiService = new GeminiService()
    
    this.agentManager = new AgentManager(geminiService)
    this.visualAnalyzer = new VisualAnalyzerAgent(this.agentManager)
    this.carouselAnalyzer = new CarouselAnalyzerAgent(this.agentManager)
    this.semanticAnalyzer = new SemanticResourceAnalyzerAgent(this.agentManager)
    this.resourceAnalysisRepo = new ResourceAnalysisRepository()
    this.templateAnalysisRepo = new TemplateAnalysisRepository()
  }

  /**
   * Analyze a resource immediately after upload
   * This runs in background and doesn't block the user
   */
  async analyzeResourceOnUpload(
    resource: ResourceData,
    workspace: WorkspaceData
  ): Promise<ResourceAnalysisRecord> {
    console.log(`🔍 Starting background analysis for resource: ${resource.name}`)

    try {
      // Step 1: Visual analysis
      console.log('📊 Running visual analysis...')
      const visualAnalyses = await this.visualAnalyzer.analyzeResources([resource])
      const visualAnalysis = visualAnalyses[0]

      // Step 2: Semantic analysis (simplified for single resource)
      console.log('🧠 Running semantic analysis...')
      const semanticResult = await this.semanticAnalyzer.analyzeResourcesAndTemplates({
        resources: [resource],
        templates: [], // No templates for resource analysis
        workspace,
        campaignId: `analysis-${Date.now()}`, // Temporary ID for analysis
        restrictions: []
      })

      const semanticAnalysis = semanticResult.resources[0] || null

      // Step 3: Store analysis in database
      const analysisRecord = this.resourceAnalysisRepo.create({
        resourceId: resource.id,
        workspaceId: workspace.id,
        visualAnalysis,
        semanticAnalysis,
        analysisVersion: this.analysisVersion
      })

      console.log('💾 Analysis saved to database:', {
        analysisId: analysisRecord.id,
        resourceId: resource.id,
        resourceName: resource.name,
        visualDescription: visualAnalysis.description,
        semanticCompatibility: semanticAnalysis?.brandCompatibility?.level,
        suggestedUses: visualAnalysis.suggestedUse
      })

      return analysisRecord

    } catch (error) {
      console.error(`❌ Error analyzing resource ${resource.name}:`, error)
      
      // Return fallback analysis
      return this.createFallbackResourceAnalysis(resource, workspace)
    }
  }

  /**
   * Analyze a template immediately after creation
   */
  async analyzeTemplateOnCreation(
    template: TemplateData,
    workspace: WorkspaceData
  ): Promise<TemplateAnalysisRecord> {
    console.log(`🎨 Starting background analysis for template: ${template.name}`)

    try {
      let detailedAnalysis: any = null

      // Check if it's a carousel template for detailed visual analysis
      if (template.type === 'carousel' && template.images && template.images.length > 0) {
        console.log('🎠 Running detailed carousel analysis...')
        const carouselAnalysis = await this.carouselAnalyzer.analyzeCarouselTemplate(template)
        
        detailedAnalysis = {
          type: 'carousel',
          carouselAnalysis,
          overallDescription: carouselAnalysis.overallDescription,
          imageAnalyses: carouselAnalysis.imageAnalyses,
          narrativeFlow: carouselAnalysis.narrativeFlow,
          consistencyScore: carouselAnalysis.consistencyScore,
          dominantColors: carouselAnalysis.dominantColors,
          designStyle: carouselAnalysis.designStyle
        }

        console.log(`🎨 Carousel analysis completed: ${carouselAnalysis.imageAnalyses.length} images analyzed`)
      }

      // Semantic analysis for template (always run)
      console.log('🧠 Running template semantic analysis...')
      const semanticResult = await this.semanticAnalyzer.analyzeResourcesAndTemplates({
        resources: [], // No resources for template analysis
        templates: [template],
        workspace,
        campaignId: `template-analysis-${Date.now()}`,
        restrictions: []
      })

      const semanticAnalysis = semanticResult.templates[0] || null

      // Combine detailed analysis with semantic analysis
      const combinedAnalysis = {
        ...semanticAnalysis,
        detailedVisualAnalysis: detailedAnalysis
      }

      // Store analysis in database
      const analysisRecord = this.templateAnalysisRepo.create({
        templateId: template.id,
        workspaceId: workspace.id,
        semanticAnalysis: combinedAnalysis,
        analysisVersion: this.analysisVersion
      })

      console.log('💾 Template analysis saved to database:', {
        analysisId: analysisRecord.id,
        templateId: template.id,
        templateName: template.name,
        templateType: template.type,
        hasDetailedAnalysis: !!detailedAnalysis,
        imagesAnalyzed: detailedAnalysis?.carouselAnalysis?.imageAnalyses?.length || 0,
        layoutStrengths: semanticAnalysis?.layoutStrengths,
        networkAptitude: semanticAnalysis?.networkAptitude
      })

      return analysisRecord

    } catch (error) {
      console.error(`❌ Error analyzing template ${template.name}:`, error)
      
      return this.createFallbackTemplateAnalysis(template, workspace)
    }
  }

  /**
   * Get cached analysis for resources (for campaign creation)
   */
  async getCachedResourceAnalyses(
    resourceIds: string[],
    workspaceId: string
  ): Promise<Record<string, ResourceAnalysisRecord>> {
    console.log('🔍 Looking up cached analyses for resources:', resourceIds)
    
    const cachedAnalyses = this.resourceAnalysisRepo.findByResourceIds(resourceIds)
    
    console.log(`📊 Found ${Object.keys(cachedAnalyses).length}/${resourceIds.length} cached resource analyses`)
    
    return cachedAnalyses
  }

  /**
   * Get cached analysis for templates (for campaign creation)
   */
  async getCachedTemplateAnalyses(
    templateIds: string[],
    workspaceId: string
  ): Promise<Record<string, TemplateAnalysisRecord>> {
    console.log('🔍 Looking up cached analyses for templates:', templateIds)
    
    const cachedAnalyses = this.templateAnalysisRepo.findByTemplateIds(templateIds)
    
    console.log(`📊 Found ${Object.keys(cachedAnalyses).length}/${templateIds.length} cached template analyses`)
    
    return cachedAnalyses
  }

  /**
   * Check if resource needs analysis (not analyzed or outdated)
   */
  async needsAnalysis(resourceId: string, workspaceId: string): Promise<boolean> {
    return this.resourceAnalysisRepo.needsAnalysis(resourceId, this.analysisVersion)
  }

  /**
   * Batch analyze multiple resources (for existing resources)
   */
  async batchAnalyzeResources(
    resources: ResourceData[],
    workspace: WorkspaceData,
    onProgress?: (completed: number, total: number) => void
  ): Promise<ResourceAnalysisRecord[]> {
    console.log(`🔄 Starting batch analysis of ${resources.length} resources`)
    
    const results: ResourceAnalysisRecord[] = []
    
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i]
      
      try {
        const analysis = await this.analyzeResourceOnUpload(resource, workspace)
        results.push(analysis)
        
        if (onProgress) {
          onProgress(i + 1, resources.length)
        }
        
        console.log(`✅ Analyzed ${i + 1}/${resources.length}: ${resource.name}`)
        
      } catch (error) {
        console.error(`❌ Failed to analyze resource ${resource.name}:`, error)
        
        // Add fallback analysis
        const fallback = this.createFallbackResourceAnalysis(resource, workspace)
        results.push(fallback)
      }
    }
    
    console.log(`🎉 Batch analysis completed: ${results.length} resources analyzed`)
    return results
  }

  private createFallbackResourceAnalysis(
    resource: ResourceData,
    workspace: WorkspaceData
  ): ResourceAnalysisRecord {
    const fallbackVisualAnalysis = {
      id: resource.id,
      name: resource.name,
      type: resource.type,
      description: `Recurso ${resource.type} disponible para usar en campañas`,
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

    return this.resourceAnalysisRepo.create({
      resourceId: resource.id,
      workspaceId: workspace.id,
      visualAnalysis: fallbackVisualAnalysis,
      semanticAnalysis: null,
      analysisVersion: this.analysisVersion
    })
  }

  private createFallbackTemplateAnalysis(
    template: TemplateData,
    workspace: WorkspaceData
  ): TemplateAnalysisRecord {
    const fallbackSemanticAnalysis = {
      templateId: template.id,
      name: template.name,
      layoutStrengths: template.type === 'single' ? ['Jerarquía visual clara'] : ['Narrativa secuencial'],
      textCapacity: {
        headline: 'medium',
        subhead: 'medium',
        cta: 'high'
      },
      networkAptitude: template.socialNetworks.reduce((acc, network) => {
        acc[network] = 'Compatible'
        return acc
      }, {} as Record<string, string>),
      colorMapping: {
        background: workspace.branding?.primaryColor || '#FFFFFF',
        accent: workspace.branding?.secondaryColor || '#3B82F6',
        text: '#000000'
      },
      risks: ['Riesgos estándar de diseño'],
      businessObjectiveSuitability: {
        awareness: 'Apropiado',
        engagement: 'Bueno',
        conversion: 'Funcional'
      }
    }

    return this.templateAnalysisRepo.create({
      templateId: template.id,
      workspaceId: workspace.id,
      semanticAnalysis: fallbackSemanticAnalysis,
      analysisVersion: this.analysisVersion
    })
  }
}

// Singleton instance
let resourceAnalysisServiceInstance: ResourceAnalysisService | null = null

export function getResourceAnalysisService(): ResourceAnalysisService {
  if (!resourceAnalysisServiceInstance) {
    resourceAnalysisServiceInstance = new ResourceAnalysisService()
  }
  return resourceAnalysisServiceInstance
}