// Import services
import { GeminiService } from './GeminiService'
import { NanoBananaService } from './NanoBananaService'
import { ContentGenerationService } from './ContentGenerationService'

// Import AI Agents
import { 
  AIAgentService, 
  getAIAgentService, 
  createAIAgentService,
  AgentManager,
  ContentCreatorAgent,
  BrandStrategistAgent
} from './agents'

// Re-export services
export { 
  GeminiService, 
  NanoBananaService, 
  ContentGenerationService,
  AIAgentService,
  getAIAgentService,
  createAIAgentService,
  AgentManager,
  ContentCreatorAgent,
  BrandStrategistAgent
}

// Types exports
export type {
  GeminiConfig,
  GenerateTextParams,
  GenerateTemplateTextParams,
  GeminiResponse,
  TemplateTextArea
} from './GeminiService'

export type {
  NanoBananaConfig,
  GenerateSimpleImageParams,
  GenerateTemplateImageParams,
  GenerateCarouselParams,
  ImageGenerationResult,
  CarouselGenerationResult
} from './NanoBananaService'

export type {
  GenerateDescriptionsParams,
  ContentGenerationResult,
  RegenerateDescriptionParams,
  GenerationStatus
} from './ContentGenerationService'

// Error handling types (import directly from ErrorHandler when needed)
export type AIErrorType = 
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN_ERROR'

// Factory functions for easy service creation
export function createGeminiService(): GeminiService {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  return new GeminiService({ apiKey })
}

export function createNanoBananaService(): NanoBananaService {
  const apiKey = process.env.NANO_BANANA_API_KEY
  
  if (!apiKey) {
    throw new Error('NANO_BANANA_API_KEY environment variable is required')
  }

  return new NanoBananaService({ apiKey })
}

export function createContentGenerationService(): ContentGenerationService {
  const geminiService = createGeminiService()
  return new ContentGenerationService(geminiService)
}

export function createAIServices() {
  try {
    return {
      gemini: createGeminiService(),
      nanoBanana: createNanoBananaService(),
      contentGeneration: createContentGenerationService(),
      agents: getAIAgentService()
    }
  } catch (error) {
    console.error('Failed to create AI services:', error)
    throw error
  }
}

// Service status checker
export async function checkAIServicesStatus() {
  try {
    const services = createAIServices()
    
    const [geminiStatus, nanoBananaStatus] = await Promise.allSettled([
      // Gemini doesn't have a health endpoint, so we'll simulate it
      Promise.resolve({ status: 'online' as const, service: 'gemini' }),
      services.nanoBanana.getServiceStatus().then((status: any) => ({ ...status, service: 'nanoBanana' }))
    ])

    return {
      gemini: geminiStatus.status === 'fulfilled' ? geminiStatus.value : { status: 'offline' as const, service: 'gemini' },
      nanoBanana: nanoBananaStatus.status === 'fulfilled' ? nanoBananaStatus.value : { status: 'offline' as const, service: 'nanoBanana' }
    }
  } catch (error) {
    return {
      gemini: { status: 'offline' as const, service: 'gemini' },
      nanoBanana: { status: 'offline' as const, service: 'nanoBanana' }
    }
  }
}