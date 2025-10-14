import { GeminiService } from '../GeminiService'
import { AgentManager, AgentConfig } from './AgentManager'
import { ContentCreatorAgent } from './ContentCreatorAgent'
import { BrandStrategistAgent } from './BrandStrategistAgent'
import { CampaignPlannerAgent } from './CampaignPlannerAgent'
import { AgentTask, AgentMetrics, CampaignData, WorkspaceData, ResourceData, TemplateData, ContentPlanItem } from './types'

export class AIAgentService {
  private geminiService: GeminiService
  private agentManager: AgentManager
  private contentCreator: ContentCreatorAgent
  private brandStrategist: BrandStrategistAgent
  private campaignPlanner: CampaignPlannerAgent
  private tasks: Map<string, AgentTask> = new Map()
  private metrics: Map<string, AgentMetrics> = new Map()

  constructor() {
    // Inicializar servicios base
    this.geminiService = this.createGeminiService()
    this.agentManager = new AgentManager(
      this.geminiService,
      parseInt(process.env.AI_MAX_CONCURRENT_REQUESTS || '5')
    )

    // Inicializar agentes especializados
    this.contentCreator = new ContentCreatorAgent(this.agentManager)
    this.brandStrategist = new BrandStrategistAgent(this.agentManager)
    this.campaignPlanner = new CampaignPlannerAgent(this.agentManager)

    // Inicializar métricas para agentes predeterminados
    this.initializeMetrics()
  }

  private createGeminiService(): GeminiService {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }
    return new GeminiService({ apiKey })
  }

  private initializeMetrics(): void {
    const defaultAgents = this.agentManager.listAgents()
    defaultAgents.forEach(agent => {
      this.metrics.set(agent.id, {
        agentId: agent.id,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalTokensUsed: 0,
        lastUsed: new Date()
      })
    })
  }

  // Métodos para gestión de agentes

  /**
   * Lista todos los agentes disponibles
   */
  getAvailableAgents(): AgentConfig[] {
    return this.agentManager.listAgents()
  }

  /**
   * Lista agentes habilitados
   */
  getEnabledAgents(): AgentConfig[] {
    return this.agentManager.listEnabledAgents()
  }

  /**
   * Obtiene información de un agente específico
   */
  getAgent(agentId: string): AgentConfig | undefined {
    return this.agentManager.getAgent(agentId)
  }

  /**
   * Habilita o deshabilita un agente
   */
  toggleAgent(agentId: string, enabled: boolean): boolean {
    return this.agentManager.toggleAgent(agentId, enabled)
  }

  /**
   * Registra un nuevo agente personalizado
   */
  registerCustomAgent(config: AgentConfig): void {
    this.agentManager.registerAgent(config)
    this.metrics.set(config.id, {
      agentId: config.id,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      lastUsed: new Date()
    })
  }

  // Métodos para Content Creator Agent

  /**
   * Genera una publicación usando el agente creador de contenido
   */
  async generatePost(params: {
    topic: string
    platform: string
    tone: string
    length: number
  }): Promise<string> {
    const startTime = Date.now()
    try {
      const result = await this.contentCreator.generatePost(params)
      this.updateMetrics('content-creator', startTime, true)
      return result
    } catch (error) {
      this.updateMetrics('content-creator', startTime, false)
      throw error
    }
  }

  /**
   * Genera hashtags para contenido
   */
  async generateHashtags(content: string, platform: string): Promise<string[]> {
    const startTime = Date.now()
    try {
      const result = await this.contentCreator.generateHashtags(content, platform)
      this.updateMetrics('content-creator', startTime, true)
      return result
    } catch (error) {
      this.updateMetrics('content-creator', startTime, false)
      throw error
    }
  }

  /**
   * Optimiza contenido existente
   */
  async optimizeContent(content: string, platform: string): Promise<string> {
    const startTime = Date.now()
    try {
      const result = await this.contentCreator.optimizeContent(content, platform)
      this.updateMetrics('content-creator', startTime, true)
      return result
    } catch (error) {
      this.updateMetrics('content-creator', startTime, false)
      throw error
    }
  }

  /**
   * Genera ideas de contenido
   */
  async generateContentIdeas(params: {
    topic: string
    platform: string
    count: number
    audience?: string
  }): Promise<string[]> {
    const startTime = Date.now()
    try {
      const result = await this.contentCreator.generateContentIdeas(params)
      this.updateMetrics('content-creator', startTime, true)
      return result
    } catch (error) {
      this.updateMetrics('content-creator', startTime, false)
      throw error
    }
  }

  // Métodos para Brand Strategist Agent

  /**
   * Analiza una marca
   */
  async analyzeBrand(brandData: any): Promise<{
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    recommendations: string[]
  }> {
    const startTime = Date.now()
    try {
      const result = await this.brandStrategist.analyzeBrand(brandData)
      this.updateMetrics('brand-strategist', startTime, true)
      return result
    } catch (error) {
      this.updateMetrics('brand-strategist', startTime, false)
      throw error
    }
  }

  /**
   * Desarrolla estrategia de marca
   */
  async developStrategy(objectives: string[], timeframe: string): Promise<{
    strategy: string
    tactics: string[]
    kpis: string[]
  }> {
    const startTime = Date.now()
    try {
      const result = await this.brandStrategist.developStrategy(objectives, timeframe)
      this.updateMetrics('brand-strategist', startTime, true)
      return result
    } catch (error) {
      this.updateMetrics('brand-strategist', startTime, false)
      throw error
    }
  }

  // Métodos para Campaign Planner Agent

  /**
   * Planifica el contenido de una campaña
   */
  async planCampaignContent(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
  }): Promise<ContentPlanItem[]> {
    const startTime = Date.now()
    try {
      const result = await this.campaignPlanner.planCampaignContent(params)
      this.updateMetrics('campaign-planner', startTime, true)
      return result
    } catch (error) {
      this.updateMetrics('campaign-planner', startTime, false)
      throw error
    }
  }

  /**
   * Regenera el plan completo de contenido de una campaña
   */
  async regenerateCampaignContent(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    previousPlan?: ContentPlanItem[]
  }): Promise<ContentPlanItem[]> {
    const startTime = Date.now()
    try {
      const result = await this.campaignPlanner.regenerateContentPlan(params)
      this.updateMetrics('campaign-planner', startTime, true)
      return result
    } catch (error) {
      this.updateMetrics('campaign-planner', startTime, false)
      throw error
    }
  }

  /**
   * Regenera un elemento específico del plan de contenido
   */
  async regenerateSpecificContentItem(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    itemIndex: number
    previousPlan: ContentPlanItem[]
  }): Promise<ContentPlanItem> {
    const startTime = Date.now()
    try {
      const result = await this.campaignPlanner.regenerateSpecificItem(params)
      this.updateMetrics('campaign-planner', startTime, true)
      return result
    } catch (error) {
      this.updateMetrics('campaign-planner', startTime, false)
      throw error
    }
  }

  // Métodos para gestión de tareas

  /**
   * Crea una nueva tarea para un agente
   */
  async createTask(agentId: string, type: string, input: any): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const task: AgentTask = {
      id: taskId,
      agentId,
      type,
      input,
      status: 'pending',
      createdAt: new Date()
    }

    this.tasks.set(taskId, task)
    
    // Ejecutar tarea en background
    this.executeTask(taskId).catch(error => {
      console.error(`Task ${taskId} failed:`, error)
    })

    return taskId
  }

  /**
   * Obtiene el estado de una tarea
   */
  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Lista todas las tareas
   */
  getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * Lista tareas por agente
   */
  getTasksByAgent(agentId: string): AgentTask[] {
    return Array.from(this.tasks.values()).filter(task => task.agentId === agentId)
  }

  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    try {
      task.status = 'running'
      
      // Aquí puedes agregar lógica específica para diferentes tipos de tareas
      let result: any
      
      switch (task.type) {
        case 'generate-post':
          result = await this.generatePost(task.input)
          break
        case 'generate-hashtags':
          result = await this.generateHashtags(task.input.content, task.input.platform)
          break
        case 'analyze-brand':
          result = await this.analyzeBrand(task.input)
          break
        case 'plan-campaign-content':
          result = await this.planCampaignContent(task.input)
          break
        case 'regenerate-content-plan':
          result = await this.regenerateCampaignContent(task.input)
          break
        case 'regenerate-specific-item':
          result = await this.regenerateSpecificContentItem(task.input)
          break
        default:
          throw new Error(`Unknown task type: ${task.type}`)
      }

      task.output = result
      task.status = 'completed'
      task.completedAt = new Date()
      
    } catch (error) {
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : 'Unknown error'
      task.completedAt = new Date()
    }
  }

  // Métodos para métricas y monitoreo

  /**
   * Actualiza métricas de un agente
   */
  private updateMetrics(agentId: string, startTime: number, success: boolean, tokensUsed?: number): void {
    const metrics = this.metrics.get(agentId)
    if (!metrics) return

    const responseTime = Date.now() - startTime
    
    metrics.totalRequests++
    if (success) {
      metrics.successfulRequests++
    } else {
      metrics.failedRequests++
    }
    
    // Calcular promedio de tiempo de respuesta
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / 
      metrics.totalRequests
    )
    
    if (tokensUsed) {
      metrics.totalTokensUsed += tokensUsed
    }
    
    metrics.lastUsed = new Date()
  }

  /**
   * Obtiene métricas de un agente
   */
  getAgentMetrics(agentId: string): AgentMetrics | undefined {
    return this.metrics.get(agentId)
  }

  /**
   * Obtiene métricas de todos los agentes
   */
  getAllMetrics(): AgentMetrics[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Obtiene estadísticas del sistema
   */
  getSystemStats(): {
    totalAgents: number
    enabledAgents: number
    activeRequests: number
    queuedRequests: number
    totalTasks: number
    completedTasks: number
    failedTasks: number
  } {
    const agentStats = this.agentManager.getStats()
    const tasks = Array.from(this.tasks.values())
    
    return {
      ...agentStats,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length
    }
  }

  /**
   * Verifica el estado de salud del sistema
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    agents: Record<string, 'online' | 'offline'>
    lastCheck: Date
  }> {
    const agents = this.agentManager.listEnabledAgents()
    const agentStatus: Record<string, 'online' | 'offline'> = {}
    
    // Verificar cada agente con una solicitud simple
    for (const agent of agents) {
      try {
        await this.agentManager.executeAgentRequest({
          agentId: agent.id,
          prompt: 'Responde con "OK" si estás funcionando correctamente.',
          options: { maxTokens: 10 }
        })
        agentStatus[agent.id] = 'online'
      } catch (error) {
        agentStatus[agent.id] = 'offline'
      }
    }

    const onlineCount = Object.values(agentStatus).filter(status => status === 'online').length
    const totalCount = Object.keys(agentStatus).length
    
    let systemStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (onlineCount === totalCount) {
      systemStatus = 'healthy'
    } else if (onlineCount > totalCount / 2) {
      systemStatus = 'degraded'
    } else {
      systemStatus = 'unhealthy'
    }

    return {
      status: systemStatus,
      agents: agentStatus,
      lastCheck: new Date()
    }
  }
}

// Singleton instance
let aiAgentServiceInstance: AIAgentService | null = null

export function getAIAgentService(): AIAgentService {
  if (!aiAgentServiceInstance) {
    aiAgentServiceInstance = new AIAgentService()
  }
  return aiAgentServiceInstance
}

export function createAIAgentService(): AIAgentService {
  return new AIAgentService()
}