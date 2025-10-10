// Core agent management
export { AgentManager } from './AgentManager'
export { AIAgentService, getAIAgentService, createAIAgentService } from './AIAgentService'

// Specialized agents
export { ContentCreatorAgent } from './ContentCreatorAgent'
export { BrandStrategistAgent } from './BrandStrategistAgent'

// Types from AgentManager
export type {
    AgentConfig,
    AgentRequest,
    AgentResponse
} from './AgentManager'

// Types from types.ts
export type {
    AgentCapability,
    AgentModel,
    AgentTask,
    AgentWorkflow,
    AgentWorkflowStep,
    AgentMetrics,
    ContentCreatorAgent as IContentCreatorAgent,
    BrandStrategistAgent as IBrandStrategistAgent,
    CampaignOptimizerAgent,
    VisualContentAdvisorAgent,
    AnalyticsInterpreterAgent,
    AgentPersonality,
    AgentLearning,
    AgentSecurity,
    AdvancedAgentConfig,
    AgentEvent,
    AgentEventListener,
    AgentPlugin,
    AgentPluginRegistry
} from './types'

// Import AgentConfig for utility functions
import type { AgentConfig } from './AgentManager'

// Utility functions
export function createDefaultAgentConfig(
    id: string,
    name: string,
    description: string,
    capabilities: string[]
): AgentConfig {
    return {
        id,
        name,
        description,
        model: process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 4096,
        capabilities,
        enabled: true
    }
}

export function validateAgentConfig(config: AgentConfig): boolean {
    return !!(
        config.id &&
        config.name &&
        config.description &&
        config.model &&
        config.capabilities &&
        config.capabilities.length > 0
    )
}

// Agent factory functions
export function createContentCreatorConfig(): AgentConfig {
    return createDefaultAgentConfig(
        'content-creator',
        'Creador de Contenido',
        'Especializado en crear contenido para redes sociales',
        ['content-generation', 'copywriting', 'hashtag-generation']
    )
}

export function createBrandStrategistConfig(): AgentConfig {
    return createDefaultAgentConfig(
        'brand-strategist',
        'Estratega de Marca',
        'Especializado en estrategia de marca y posicionamiento',
        ['brand-analysis', 'strategy-development', 'market-research']
    )
}

// Constants
export const AGENT_CAPABILITIES = {
    CONTENT_GENERATION: 'content-generation',
    COPYWRITING: 'copywriting',
    HASHTAG_GENERATION: 'hashtag-generation',
    BRAND_ANALYSIS: 'brand-analysis',
    STRATEGY_DEVELOPMENT: 'strategy-development',
    MARKET_RESEARCH: 'market-research',
    CAMPAIGN_ANALYSIS: 'campaign-analysis',
    PERFORMANCE_OPTIMIZATION: 'performance-optimization',
    DATA_ANALYSIS: 'data-analysis',
    VISUAL_PLANNING: 'visual-planning',
    IMAGE_DESCRIPTION: 'image-description',
    DESIGN_GUIDANCE: 'design-guidance',
    DATA_INTERPRETATION: 'data-interpretation',
    INSIGHT_GENERATION: 'insight-generation',
    REPORTING: 'reporting'
} as const

export const AGENT_MODELS = {
    GEMINI_FLASH: 'gemini-1.5-flash',
    GEMINI_PRO: 'gemini-1.5-pro',
    GEMINI_VISION: 'gemini-1.5-flash'
} as const

export const AGENT_TASK_TYPES = {
    GENERATE_POST: 'generate-post',
    GENERATE_HASHTAGS: 'generate-hashtags',
    OPTIMIZE_CONTENT: 'optimize-content',
    ANALYZE_BRAND: 'analyze-brand',
    DEVELOP_STRATEGY: 'develop-strategy',
    ANALYZE_CAMPAIGN: 'analyze-campaign',
    GENERATE_REPORT: 'generate-report'
} as const