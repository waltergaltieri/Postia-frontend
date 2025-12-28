// Specialized Content Generation Agents
export { TextOnlyAgent, createTextOnlyAgent } from './TextOnlyAgent'
export { TextImageAgent, createTextImageAgent } from './TextImageAgent'
export { TextTemplateAgent, createTextTemplateAgent } from './TextTemplateAgent'
export { CarouselAgent, createCarouselAgent } from './CarouselAgent'

// AI Agent Service and Core Agents
export { AIAgentService, getAIAgentService, createAIAgentService } from './AIAgentService'
export { AgentManager } from './AgentManager'
export { ContentCreatorAgent } from './ContentCreatorAgent'
export { BrandStrategistAgent } from './BrandStrategistAgent'
export { CampaignPlannerAgent } from './CampaignPlannerAgent'

// Import factory functions for internal use
import { createTextOnlyAgent } from './TextOnlyAgent'
import { createTextImageAgent } from './TextImageAgent'
import { createTextTemplateAgent } from './TextTemplateAgent'
import { createCarouselAgent } from './CarouselAgent'

// Agent Types and Interfaces
export type {
  TextOnlyGenerationParams,
  TextOnlyGenerationResult
} from './TextOnlyAgent'

export type {
  TextImageGenerationParams,
  TextImageGenerationResult
} from './TextImageAgent'

export type {
  TextTemplateGenerationParams,
  TextTemplateGenerationResult
} from './TextTemplateAgent'

export type {
  CarouselAgentGenerationParams,
  CarouselGenerationResult
} from './CarouselAgent'

// Re-export common types
export type {
  ContentPlanItem,
  WorkspaceData,
  ResourceData,
  TemplateData
} from './types'

/**
 * Agent Factory - Creates the appropriate agent based on content type
 */
export function createContentGenerationAgent(contentType: string, templateType?: string) {
  switch (contentType) {
    case 'text-only':
      return createTextOnlyAgent()
    
    case 'text-with-image':
      return createTextImageAgent()
    
    case 'text-with-carousel':
      if (templateType === 'carousel') {
        return createCarouselAgent()
      } else {
        return createTextTemplateAgent()
      }
    
    default:
      if (contentType.includes('template') || templateType) {
        if (templateType === 'carousel') {
          return createCarouselAgent()
        } else {
          return createTextTemplateAgent()
        }
      }
      
      throw new Error(`Unsupported content type: ${contentType}`)
  }
}

/**
 * Get agent capabilities for a specific content type
 */
export function getAgentCapabilities(contentType: string, templateType?: string) {
  const agent = createContentGenerationAgent(contentType, templateType)
  return agent.getAgentStats()
}

/**
 * Estimate processing time for content generation
 */
export function estimateContentGenerationTime(
  contentType: string,
  contentPlan: any,
  template?: any,
  resourceCount: number = 1
): number {
  try {
    const agent = createContentGenerationAgent(contentType, template?.type)
    
    if ('estimateProcessingTime' in agent) {
      if (contentType === 'text-only') {
        return (agent as any).estimateProcessingTime(contentPlan)
      } else if (contentType === 'text-with-image') {
        return (agent as any).estimateProcessingTime(contentPlan, resourceCount)
      } else if (template) {
        return (agent as any).estimateProcessingTime(contentPlan, template, resourceCount)
      }
    }
    
    // Fallback estimates
    const baseEstimates = {
      'text-only': 5000,
      'text-with-image': 25000,
      'text-with-carousel': 90000
    }
    
    return baseEstimates[contentType as keyof typeof baseEstimates] || 15000
  } catch (error) {
    console.warn('Error estimating processing time:', error)
    return 15000 // Default fallback
  }
}

/**
 * Validate if content type and resources are compatible
 */
export function validateContentGenerationParams(
  contentType: string,
  resources: any[],
  template?: any,
  platform?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  try {
    const agent = createContentGenerationAgent(contentType, template?.type)
    
    // Validate resources if agent has validation method
    if ('validateResources' in agent) {
      const resourceValidation = (agent as any).validateResources(resources)
      if (!resourceValidation.valid) {
        errors.push(...resourceValidation.errors)
      }
    }
    
    // Validate template compatibility if agent has validation method
    if (template && 'validateTemplateAndResources' in agent) {
      const templateValidation = (agent as any).validateTemplateAndResources(template, resources, platform)
      if (!templateValidation.valid) {
        errors.push(...templateValidation.errors)
      }
    }
    
    // Validate carousel specific requirements
    if (contentType === 'text-with-carousel' && 'validateCarouselTemplateAndResources' in agent) {
      const carouselValidation = (agent as any).validateCarouselTemplateAndResources(template, resources, platform)
      if (!carouselValidation.valid) {
        errors.push(...carouselValidation.errors)
      }
    }
    
  } catch (error) {
    errors.push(`Agent creation failed: ${error}`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get all supported content types
 */
export function getSupportedContentTypes(): Array<{
  type: string
  name: string
  description: string
  requiresTemplate: boolean
  requiresResources: boolean
  supportedPlatforms: string[]
}> {
  return [
    {
      type: 'text-only',
      name: 'Solo Texto',
      description: 'Contenido optimizado de solo texto para redes sociales',
      requiresTemplate: false,
      requiresResources: false,
      supportedPlatforms: ['instagram', 'linkedin', 'twitter', 'facebook']
    },
    {
      type: 'text-with-image',
      name: 'Texto + Imagen Simple',
      description: 'Texto con imagen generada basada en recursos',
      requiresTemplate: false,
      requiresResources: true,
      supportedPlatforms: ['instagram', 'linkedin', 'twitter', 'facebook']
    },
    {
      type: 'text-image-template',
      name: 'Texto + Imagen con Diseño',
      description: 'Texto con imagen profesional usando templates',
      requiresTemplate: true,
      requiresResources: true,
      supportedPlatforms: ['instagram', 'linkedin', 'twitter', 'facebook']
    },
    {
      type: 'text-with-carousel',
      name: 'Carrusel',
      description: 'Múltiples imágenes coherentes con textos integrados',
      requiresTemplate: true,
      requiresResources: true,
      supportedPlatforms: ['instagram', 'linkedin', 'facebook']
    }
  ]
}