export interface AgentCapability {
  id: string
  name: string
  description: string
}

export interface AgentModel {
  id: string
  name: string
  provider: 'gemini' | 'openai' | 'claude'
  maxTokens: number
  supportsVision: boolean
  costPerToken: number
}

export interface AgentTask {
  id: string
  agentId: string
  type: string
  input: any
  output?: any
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  error?: string
  metadata?: Record<string, any>
}

export interface AgentWorkflow {
  id: string
  name: string
  description: string
  steps: AgentWorkflowStep[]
  enabled: boolean
}

export interface AgentWorkflowStep {
  id: string
  agentId: string
  order: number
  input: Record<string, any>
  conditions?: Record<string, any>
  onSuccess?: string // Next step ID
  onFailure?: string // Next step ID or 'end'
}

export interface AgentMetrics {
  agentId: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  totalTokensUsed: number
  lastUsed: Date
}

// Tipos específicos para diferentes tipos de agentes

export interface ContentCreatorAgent {
  generatePost: (params: {
    topic: string
    platform: string
    tone: string
    length: number
  }) => Promise<string>
  
  generateHashtags: (content: string, platform: string) => Promise<string[]>
  
  optimizeContent: (content: string, platform: string) => Promise<string>
}

export interface BrandStrategistAgent {
  analyzeBrand: (brandData: any) => Promise<{
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    recommendations: string[]
  }>
  
  developStrategy: (objectives: string[], timeframe: string) => Promise<{
    strategy: string
    tactics: string[]
    kpis: string[]
  }>
}

export interface CampaignOptimizerAgent {
  analyzePerformance: (metrics: any) => Promise<{
    insights: string[]
    recommendations: string[]
    optimizations: string[]
  }>
  
  predictPerformance: (campaignData: any) => Promise<{
    expectedReach: number
    expectedEngagement: number
    confidence: number
  }>
}

export interface VisualContentAdvisorAgent {
  describeImage: (imageUrl: string) => Promise<string>
  
  suggestVisuals: (content: string, platform: string) => Promise<{
    type: string
    description: string
    elements: string[]
  }>
  
  optimizeVisualContent: (description: string) => Promise<string>
}

export interface AnalyticsInterpreterAgent {
  interpretMetrics: (data: any) => Promise<{
    summary: string
    trends: string[]
    insights: string[]
    recommendations: string[]
  }>
  
  generateReport: (data: any, timeframe: string) => Promise<string>
}

export interface CampaignPlannerAgent {
  planCampaignContent: (params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
  }) => Promise<ContentPlanItem[]>
  
  regenerateContentPlan: (params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    previousPlan?: ContentPlanItem[]
  }) => Promise<ContentPlanItem[]>
  
  regenerateSpecificItem: (params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    itemIndex: number
    previousPlan: ContentPlanItem[]
  }) => Promise<ContentPlanItem>
}

// Tipos de datos para el Campaign Planner
export interface CampaignData {
  id: string
  name: string
  objective: string
  startDate: string
  endDate: string
  socialNetworks: string[]
  intervalHours: number
  contentType: 'unified' | 'optimized'
  optimizationSettings?: Record<string, any>
  prompt: string
  templateIds?: string[] // Plantillas específicas seleccionadas para esta campaña
}

export interface WorkspaceData {
  id: string
  name: string
  branding: {
    primaryColor: string
    secondaryColor: string
    logo?: string
    slogan: string
    description: string
    whatsapp?: string
  }
}

export interface ResourceData {
  id: string
  name: string
  url: string
  type: 'image' | 'video'
  mimeType: string
}

export interface TemplateData {
  id: string
  name: string
  type: 'single' | 'carousel'
  socialNetworks: string[]
  images: string[]
  description?: string // Descripción de cuándo y cómo usar esta plantilla
}

export interface ContentPlanItem {
  id: string
  title: string
  description: string
  socialNetwork: 'instagram' | 'tiktok' | 'linkedin'
  scheduledDate: string
  templateId?: string
  resourceIds: string[]
  contentType: 'text-only' | 'text-with-image' | 'text-with-carousel'
  estimatedReach?: number
  priority: 'high' | 'medium' | 'low'
  tags: string[]
  notes?: string
}

// Tipos para configuración avanzada de agentes

export interface AgentPersonality {
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'creative'
  style: 'concise' | 'detailed' | 'conversational' | 'technical'
  expertise: string[]
  limitations: string[]
}

export interface AgentLearning {
  enabled: boolean
  feedbackWeight: number
  adaptationRate: number
  memorySize: number
}

export interface AgentSecurity {
  allowedDomains: string[]
  restrictedTopics: string[]
  maxRequestsPerHour: number
  requiresApproval: boolean
}

export interface AdvancedAgentConfig {
  personality: AgentPersonality
  learning: AgentLearning
  security: AgentSecurity
  customInstructions: string[]
  integrations: string[]
}

// Eventos del sistema de agentes

export interface AgentEvent {
  id: string
  type: 'request' | 'response' | 'error' | 'config_change'
  agentId: string
  timestamp: Date
  data: any
}

export interface AgentEventListener {
  eventType: string
  callback: (event: AgentEvent) => void
}

// Tipos para el sistema de plugins de agentes

export interface AgentPlugin {
  id: string
  name: string
  version: string
  description: string
  capabilities: string[]
  install: () => Promise<void>
  uninstall: () => Promise<void>
  execute: (input: any) => Promise<any>
}

export interface AgentPluginRegistry {
  register: (plugin: AgentPlugin) => void
  unregister: (pluginId: string) => void
  list: () => AgentPlugin[]
  get: (pluginId: string) => AgentPlugin | undefined
}