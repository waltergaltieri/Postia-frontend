import { AgentManager } from '../agents/AgentManager'
import { VisualAnalyzerAgent } from '../agents/VisualAnalyzerAgent'
import { SemanticResourceAnalyzerAgent } from '../agents/SemanticResourceAnalyzerAgent'
import type { ResourceData, TemplateData, WorkspaceData } from '../agents/types'
import type { ResourceAnalysis } from '../agents/VisualAnalyzerAgent'

export interface ResourceAnalysisRecord {
  id: string
  resourceId: string
  workspaceId: string
  visualAnalysis: ResourceAnalysis
  semanticAnalysis?: any
  analysisVersion: string
  createdAt: Date
  updatedAt: Date
}

export interface TemplateAnalysisRecord {
  id: string
  templateId: string
  workspaceId: string
  semanticAnalysis: any
  analysisVersion: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Client-side version of ResourceAnalysisService
 * This version doesn't access the database directly, instead uses API calls
 */
export class ClientResourceAnalysisService {
  private analysisVersion = '1.0'

  /**
   * Get cached analysis for resources via API call
   */
  async getCachedResourceAnalyses(
    resourceIds: string[],
    workspaceId: string
  ): Promise<Record<string, ResourceAnalysisRecord>> {
    console.log('🔍 Looking up cached analyses for resources via API:', resourceIds)
    
    if (resourceIds.length === 0) {
      return {}
    }
    
    try {
      const params = new URLSearchParams({
        resourceIds: resourceIds.join(','),
        workspaceId: workspaceId
      })

      const response = await fetch(`/api/analyses/resources?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        console.log(`📊 Found ${Object.keys(result.data).length}/${resourceIds.length} cached resource analyses`)
        return result.data
      } else {
        console.warn('⚠️ API returned error:', result.message)
        return {}
      }
    } catch (error) {
      console.error('❌ Error fetching cached resource analyses:', error)
      return {}
    }
  }

  /**
   * Get cached analysis for templates via API call
   */
  async getCachedTemplateAnalyses(
    templateIds: string[],
    workspaceId: string
  ): Promise<Record<string, TemplateAnalysisRecord>> {
    console.log('🔍 Looking up cached analyses for templates via API:', templateIds)
    
    if (templateIds.length === 0) {
      return {}
    }
    
    try {
      const params = new URLSearchParams({
        templateIds: templateIds.join(','),
        workspaceId: workspaceId
      })

      const response = await fetch(`/api/analyses/templates?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        console.log(`📊 Found ${Object.keys(result.data).length}/${templateIds.length} cached template analyses`)
        return result.data
      } else {
        console.warn('⚠️ API returned error:', result.message)
        return {}
      }
    } catch (error) {
      console.error('❌ Error fetching cached template analyses:', error)
      return {}
    }
  }

  /**
   * Check if resource needs analysis (client-side version)
   */
  async needsAnalysis(resourceId: string, workspaceId: string): Promise<boolean> {
    // For now, assume all resources need analysis since we can't check the database
    return true
  }

  /**
   * Create fallback analysis for resources when no cached analysis is available
   */
  createFallbackResourceAnalysis(
    resource: ResourceData,
    workspace: WorkspaceData
  ): ResourceAnalysisRecord {
    return {
      id: `fallback-${resource.id}-${Date.now()}`,
      resourceId: resource.id,
      workspaceId: workspace.id,
      visualAnalysis: {
        id: resource.id,
        name: resource.name,
        type: resource.type,
        description: `Recurso ${resource.type} disponible para usar en campañas`,
        suggestedUse: resource.type === 'image' ? ['post', 'story'] : ['reel', 'video'],
        compatibleNetworks: ['instagram', 'facebook', 'linkedin'],
        contentTypes: resource.type === 'image' ? ['post', 'story', 'carousel'] : ['reel', 'video'],
        mood: 'neutral',
        colors: [],
        elements: [resource.type]
      },
      semanticAnalysis: null,
      analysisVersion: this.analysisVersion,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Create fallback analysis for templates when no cached analysis is available
   */
  createFallbackTemplateAnalysis(
    template: TemplateData,
    workspace: WorkspaceData
  ): TemplateAnalysisRecord {
    return {
      id: `template-fallback-${template.id}-${Date.now()}`,
      templateId: template.id,
      workspaceId: workspace.id,
      semanticAnalysis: {
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
      },
      analysisVersion: this.analysisVersion,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
}

// Singleton instance for client-side use
let clientResourceAnalysisServiceInstance: ClientResourceAnalysisService | null = null

export function getClientResourceAnalysisService(): ClientResourceAnalysisService {
  if (!clientResourceAnalysisServiceInstance) {
    clientResourceAnalysisServiceInstance = new ClientResourceAnalysisService()
  }
  return clientResourceAnalysisServiceInstance
}