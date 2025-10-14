// Core agent management
export { AgentManager } from './AgentManager'
export { AIAgentService, getAIAgentService, createAIAgentService } from './AIAgentService'

// Specialized agents
export { ContentCreatorAgent } from './ContentCreatorAgent'
export { BrandStrategistAgent } from './BrandStrategistAgent'
export { CampaignPlannerAgent } from './CampaignPlannerAgent'

// Phase 1 - Content Orchestration agents
export { SemanticResourceAnalyzerAgent } from './SemanticResourceAnalyzerAgent'
export { TemporalPlannerService } from './TemporalPlannerService'
export { ContentIdeationOrchestratorAgent } from './ContentIdeationOrchestratorAgent'

// Services
export { getCampaignPlannerService, CampaignPlannerService } from '../services/CampaignPlannerService'
export type {
    GenerateContentPlanParams,
    RegenerateContentPlanParams,
    RegenerateContentItemParams
} from '../services/CampaignPlannerService'

// Phase 1 - Content Orchestration Service
export { ContentOrchestrationService } from '../services/ContentOrchestrationService'
export type {
    ContentOrchestrationParams,
    ContentOrchestrationResult,
    ConsolidatedContentPlan,
    QualityControlResult
} from '../services/ContentOrchestrationService'

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
    CampaignPlannerAgent as ICampaignPlannerAgent,
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
        model: process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash-001',
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

export function createCampaignPlannerConfig(): AgentConfig {
    return createDefaultAgentConfig(
        'campaign-planner',
        'Planificador de Campañas',
        'Especializado en planificar y estructurar contenido de campañas',
        ['campaign-planning', 'content-strategy', 'brand-alignment', 'content-scheduling']
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
    CAMPAIGN_PLANNING: 'campaign-planning',
    CONTENT_STRATEGY: 'content-strategy',
    BRAND_ALIGNMENT: 'brand-alignment',
    CONTENT_SCHEDULING: 'content-scheduling',
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
    GEMINI_FLASH: 'gemini-1.5-flash-001',
    GEMINI_PRO: 'gemini-1.5-pro-001',
    GEMINI_VISION: 'gemini-1.5-flash-001'
} as const

export const AGENT_TASK_TYPES = {
    GENERATE_POST: 'generate-post',
    GENERATE_HASHTAGS: 'generate-hashtags',
    OPTIMIZE_CONTENT: 'optimize-content',
    ANALYZE_BRAND: 'analyze-brand',
    DEVELOP_STRATEGY: 'develop-strategy',
    ANALYZE_CAMPAIGN: 'analyze-campaign',
    PLAN_CAMPAIGN_CONTENT: 'plan-campaign-content',
    REGENERATE_CONTENT_PLAN: 'regenerate-content-plan',
    REGENERATE_SPECIFIC_ITEM: 'regenerate-specific-item',
    GENERATE_REPORT: 'generate-report',
    // Phase 1 tasks
    ANALYZE_RESOURCES_TEMPLATES: 'analyze-resources-templates',
    CALCULATE_TEMPORAL_SLOTS: 'calculate-temporal-slots',
    GENERATE_CONTENT_IDEAS: 'generate-content-ideas',
    ORCHESTRATE_CONTENT_PHASE1: 'orchestrate-content-phase1'
} as const