import { GeminiService } from '../GeminiService'

export interface AgentConfig {
  id: string
  name: string
  description: string
  model: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  capabilities: string[]
  enabled: boolean
}

export interface AgentRequest {
  agentId: string
  prompt: string
  context?: Record<string, any>
  options?: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
  }
}

export interface AgentResponse {
  agentId: string
  response: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata?: Record<string, any>
}

export class AgentManager {
  private agents: Map<string, AgentConfig> = new Map()
  private geminiService: GeminiService
  private maxConcurrentRequests: number
  private activeRequests: number = 0
  private requestQueue: Array<() => Promise<void>> = []

  constructor(geminiService: GeminiService, maxConcurrentRequests: number = 5) {
    this.geminiService = geminiService
    this.maxConcurrentRequests = maxConcurrentRequests
    this.initializeDefaultAgents()
  }

  /**
   * Inicializa agentes predeterminados del sistema
   */
  private initializeDefaultAgents(): void {
    const defaultAgents: AgentConfig[] = [
      {
        id: 'content-creator',
        name: 'Creador de Contenido',
        description: 'Especializado en crear contenido para redes sociales',
        model: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: 'Eres un experto creador de contenido para redes sociales. Tu objetivo es crear contenido atractivo, relevante y alineado con la marca.',
        capabilities: ['content-generation', 'copywriting', 'hashtag-generation'],
        enabled: true
      },
      {
        id: 'brand-strategist',
        name: 'Estratega de Marca',
        description: 'Especializado en estrategia de marca y posicionamiento',
        model: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
        temperature: 0.5,
        maxTokens: 8192,
        systemPrompt: 'Eres un estratega de marca experto. Tu función es analizar y desarrollar estrategias de marca coherentes y efectivas.',
        capabilities: ['brand-analysis', 'strategy-development', 'market-research'],
        enabled: true
      },
      {
        id: 'visual-analyzer',
        name: 'Analizador Visual',
        description: 'Especializado en análisis de contenido visual y recursos',
        model: process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash',
        temperature: 0.3,
        maxTokens: 2048,
        systemPrompt: 'Eres un experto analista de contenido visual. Tu función es analizar imágenes y videos para determinar su mejor uso en campañas de marketing.',
        capabilities: ['visual-analysis', 'content-categorization', 'resource-optimization'],
        enabled: true
      },
      {
        id: 'campaign-planner',
        name: 'Planificador de Campañas',
        description: 'Especializado en planificación estratégica de contenido',
        model: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
        temperature: 0.6,
        maxTokens: 8192,
        systemPrompt: 'Eres un experto planificador de campañas de marketing digital. Tu función es crear planes detallados de contenido basados en objetivos de marca y análisis de recursos.',
        capabilities: ['campaign-planning', 'content-strategy', 'resource-allocation'],
        enabled: true
      },
      {
        id: 'campaign-optimizer',
        name: 'Optimizador de Campañas',
        description: 'Especializado en optimización y análisis de campañas',
        model: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',
        temperature: 0.3,
        maxTokens: 4096,
        systemPrompt: 'Eres un especialista en optimización de campañas digitales. Tu objetivo es analizar datos y sugerir mejoras.',
        capabilities: ['campaign-analysis', 'performance-optimization', 'data-analysis'],
        enabled: true
      },
      {
        id: 'visual-content-advisor',
        name: 'Asesor de Contenido Visual',
        description: 'Especializado en describir y planificar contenido visual',
        model: process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash',
        temperature: 0.6,
        maxTokens: 4096,
        systemPrompt: 'Eres un experto en contenido visual para redes sociales. Tu función es describir, planificar y optimizar contenido visual.',
        capabilities: ['visual-planning', 'image-description', 'design-guidance'],
        enabled: true
      },
      {
        id: 'analytics-interpreter',
        name: 'Intérprete de Analytics',
        description: 'Especializado en interpretar métricas y generar insights',
        model: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
        temperature: 0.2,
        maxTokens: 6144,
        systemPrompt: 'Eres un analista de datos especializado en métricas de redes sociales. Tu función es interpretar datos y generar insights accionables.',
        capabilities: ['data-interpretation', 'insight-generation', 'reporting'],
        enabled: true
      },
      {
        id: 'campaign-planner',
        name: 'Planificador de Campañas',
        description: 'Especializado en planificar y estructurar contenido de campañas',
        model: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
        temperature: 0.7,
        maxTokens: 8192,
        systemPrompt: 'Eres un experto planificador de campañas de marketing digital. Tu función es crear planes detallados de contenido para campañas de redes sociales, considerando la identidad de marca, objetivos y recursos disponibles.',
        capabilities: ['campaign-planning', 'content-strategy', 'brand-alignment', 'content-scheduling'],
        enabled: true
      }
    ]

    defaultAgents.forEach(agent => {
      this.agents.set(agent.id, agent)
    })
  }

  /**
   * Registra un nuevo agente
   */
  registerAgent(config: AgentConfig): void {
    this.agents.set(config.id, config)
  }

  /**
   * Obtiene la configuración de un agente
   */
  getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId)
  }

  /**
   * Lista todos los agentes disponibles
   */
  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values())
  }

  /**
   * Lista agentes habilitados
   */
  listEnabledAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).filter(agent => agent.enabled)
  }

  /**
   * Habilita o deshabilita un agente
   */
  toggleAgent(agentId: string, enabled: boolean): boolean {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.enabled = enabled
      return true
    }
    return false
  }

  /**
   * Ejecuta una solicitud a un agente específico
   */
  async executeAgentRequest(request: AgentRequest): Promise<AgentResponse> {
    const agent = this.agents.get(request.agentId)
    
    if (!agent) {
      throw new Error(`Agent ${request.agentId} not found`)
    }

    if (!agent.enabled) {
      throw new Error(`Agent ${request.agentId} is disabled`)
    }

    return this.processRequest(agent, request)
  }

  /**
   * Procesa una solicitud con control de concurrencia
   */
  private async processRequest(agent: AgentConfig, request: AgentRequest): Promise<AgentResponse> {
    return new Promise((resolve, reject) => {
      const executeRequest = async () => {
        try {
          this.activeRequests++
          
          // Construir prompt completo con contexto del agente
          const fullPrompt = this.buildAgentPrompt(agent, request)
          
          // Configurar el servicio Gemini para este agente
          const originalConfig = { ...this.geminiService['config'] }
          this.geminiService.updateConfig({
            model: agent.model,
          })

          // Ejecutar la solicitud
          const response = await this.geminiService['callGeminiAPI'](fullPrompt)
          
          // Restaurar configuración original
          this.geminiService.updateConfig(originalConfig)

          const agentResponse: AgentResponse = {
            agentId: request.agentId,
            response: response.text,
            usage: response.usage,
            metadata: {
              model: agent.model,
              temperature: request.options?.temperature || agent.temperature,
              timestamp: new Date().toISOString()
            }
          }

          resolve(agentResponse)
        } catch (error) {
          reject(error)
        } finally {
          this.activeRequests--
          this.processQueue()
        }
      }

      if (this.activeRequests < this.maxConcurrentRequests) {
        executeRequest()
      } else {
        this.requestQueue.push(executeRequest)
      }
    })
  }

  /**
   * Procesa la cola de solicitudes pendientes
   */
  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const nextRequest = this.requestQueue.shift()
      if (nextRequest) {
        nextRequest()
      }
    }
  }

  /**
   * Construye el prompt completo para un agente
   */
  private buildAgentPrompt(agent: AgentConfig, request: AgentRequest): string {
    let prompt = ''

    // Agregar prompt del sistema si existe
    if (agent.systemPrompt) {
      prompt += `SISTEMA: ${agent.systemPrompt}\n\n`
    }

    // Agregar contexto si existe
    if (request.context) {
      prompt += 'CONTEXTO:\n'
      Object.entries(request.context).forEach(([key, value]) => {
        prompt += `${key}: ${JSON.stringify(value)}\n`
      })
      prompt += '\n'
    }

    // Agregar capacidades del agente
    prompt += `CAPACIDADES: ${agent.capabilities.join(', ')}\n\n`

    // Agregar el prompt principal
    prompt += `SOLICITUD: ${request.prompt}`

    return prompt
  }

  /**
   * Ejecuta múltiples solicitudes en paralelo
   */
  async executeBatch(requests: AgentRequest[]): Promise<AgentResponse[]> {
    const promises = requests.map(request => this.executeAgentRequest(request))
    return Promise.all(promises)
  }

  /**
   * Obtiene estadísticas del gestor de agentes
   */
  getStats(): {
    totalAgents: number
    enabledAgents: number
    activeRequests: number
    queuedRequests: number
  } {
    return {
      totalAgents: this.agents.size,
      enabledAgents: this.listEnabledAgents().length,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length
    }
  }

  /**
   * Actualiza la configuración de un agente existente
   */
  updateAgent(agentId: string, updates: Partial<AgentConfig>): boolean {
    const agent = this.agents.get(agentId)
    if (agent) {
      Object.assign(agent, updates)
      return true
    }
    return false
  }

  /**
   * Elimina un agente (solo agentes personalizados, no los predeterminados)
   */
  removeAgent(agentId: string): boolean {
    const defaultAgentIds = ['content-creator', 'brand-strategist', 'campaign-optimizer', 'visual-content-advisor', 'analytics-interpreter']
    
    if (defaultAgentIds.includes(agentId)) {
      throw new Error('Cannot remove default system agents')
    }

    return this.agents.delete(agentId)
  }
}