import { GenerationError, GenerationErrorType } from '../types/errors'

export interface APIUsageMetrics {
  service: 'gemini' | 'nano-banana'
  endpoint: string
  requestCount: number
  successCount: number
  errorCount: number
  totalTokens?: number
  totalCost?: number
  averageLatency: number
  lastUsed: Date
  rateLimitHits: number
}

export interface AgentPerformanceMetrics {
  agentType: string
  totalGenerations: number
  successfulGenerations: number
  failedGenerations: number
  averageGenerationTime: number
  averageRetryCount: number
  totalTokensUsed?: number
  totalImagesGenerated?: number
  qualityScore?: number
  lastUsed: Date
}

export interface SystemPerformanceMetrics {
  timestamp: Date
  cpuUsage?: number
  memoryUsage: number
  activeConnections: number
  queueLength: number
  throughput: number // operaciones por minuto
  errorRate: number // porcentaje
  averageResponseTime: number
}

export interface CampaignMetrics {
  campaignId: string
  totalPublications: number
  completedPublications: number
  failedPublications: number
  totalGenerationTime: number
  averageTimePerPublication: number
  agentsUsed: Record<string, number>
  errorsEncountered: GenerationError[]
  startTime: Date
  endTime?: Date
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled'
}

export interface MetricsConfig {
  enableAPITracking: boolean
  enablePerformanceTracking: boolean
  enableCampaignTracking: boolean
  retentionDays: number
  aggregationInterval: number // minutos
  alertThresholds: {
    errorRate: number
    responseTime: number
    queueLength: number
  }
}

/**
 * Servicio de métricas y monitoreo de rendimiento para generación de IA
 * Rastrea uso de APIs, rendimiento de agentes y métricas del sistema
 */
export class MetricsService {
  private config: MetricsConfig
  private apiMetrics: Map<string, APIUsageMetrics> = new Map()
  private agentMetrics: Map<string, AgentPerformanceMetrics> = new Map()
  private systemMetrics: SystemPerformanceMetrics[] = []
  private campaignMetrics: Map<string, CampaignMetrics> = new Map()
  private activeOperations: Map<string, { startTime: number; operation: string }> = new Map()

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = {
      enableAPITracking: config.enableAPITracking ?? true,
      enablePerformanceTracking: config.enablePerformanceTracking ?? true,
      enableCampaignTracking: config.enableCampaignTracking ?? true,
      retentionDays: config.retentionDays ?? 30,
      aggregationInterval: config.aggregationInterval ?? 5,
      alertThresholds: {
        errorRate: config.alertThresholds?.errorRate ?? 10,
        responseTime: config.alertThresholds?.responseTime ?? 30000,
        queueLength: config.alertThresholds?.queueLength ?? 100,
        ...config.alertThresholds
      }
    }

    // Iniciar recolección de métricas del sistema
    if (this.config.enablePerformanceTracking) {
      this.startSystemMetricsCollection()
    }
  }

  /**
   * Registra uso de API de Gemini
   */
  recordGeminiAPIUsage(
    endpoint: string,
    success: boolean,
    latency: number,
    tokenCount?: number,
    cost?: number,
    error?: GenerationError
  ): void {
    if (!this.config.enableAPITracking) return

    const key = `gemini_${endpoint}`
    const existing = this.apiMetrics.get(key) || {
      service: 'gemini' as const,
      endpoint,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatency: 0,
      lastUsed: new Date(),
      rateLimitHits: 0
    }

    existing.requestCount++
    existing.lastUsed = new Date()

    if (success) {
      existing.successCount++
    } else {
      existing.errorCount++
      if (error?.type === 'RATE_LIMIT_ERROR') {
        existing.rateLimitHits++
      }
    }

    // Actualizar latencia promedio
    existing.averageLatency = (
      (existing.averageLatency * (existing.requestCount - 1)) + latency
    ) / existing.requestCount

    // Actualizar tokens y costo
    if (tokenCount) {
      existing.totalTokens = (existing.totalTokens || 0) + tokenCount
    }
    if (cost) {
      existing.totalCost = (existing.totalCost || 0) + cost
    }

    this.apiMetrics.set(key, existing)
  }

  /**
   * Registra uso de API de Nano Banana
   */
  recordNanoBananaAPIUsage(
    operation: string,
    success: boolean,
    latency: number,
    imageSize?: number,
    cost?: number,
    error?: GenerationError
  ): void {
    if (!this.config.enableAPITracking) return

    const key = `nano-banana_${operation}`
    const existing = this.apiMetrics.get(key) || {
      service: 'nano-banana' as const,
      endpoint: operation,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      totalCost: 0,
      averageLatency: 0,
      lastUsed: new Date(),
      rateLimitHits: 0
    }

    existing.requestCount++
    existing.lastUsed = new Date()

    if (success) {
      existing.successCount++
    } else {
      existing.errorCount++
      if (error?.type === 'RATE_LIMIT_ERROR') {
        existing.rateLimitHits++
      }
    }

    // Actualizar latencia promedio
    existing.averageLatency = (
      (existing.averageLatency * (existing.requestCount - 1)) + latency
    ) / existing.requestCount

    // Actualizar costo
    if (cost) {
      existing.totalCost = (existing.totalCost || 0) + cost
    }

    this.apiMetrics.set(key, existing)
  }

  /**
   * Registra rendimiento de agente
   */
  recordAgentPerformance(
    agentType: string,
    success: boolean,
    generationTime: number,
    retryCount: number,
    tokensUsed?: number,
    imagesGenerated?: number,
    qualityScore?: number
  ): void {
    if (!this.config.enablePerformanceTracking) return

    const existing = this.agentMetrics.get(agentType) || {
      agentType,
      totalGenerations: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      averageGenerationTime: 0,
      averageRetryCount: 0,
      totalTokensUsed: 0,
      totalImagesGenerated: 0,
      qualityScore: 0,
      lastUsed: new Date()
    }

    existing.totalGenerations++
    existing.lastUsed = new Date()

    if (success) {
      existing.successfulGenerations++
    } else {
      existing.failedGenerations++
    }

    // Actualizar tiempo promedio de generación
    existing.averageGenerationTime = (
      (existing.averageGenerationTime * (existing.totalGenerations - 1)) + generationTime
    ) / existing.totalGenerations

    // Actualizar promedio de reintentos
    existing.averageRetryCount = (
      (existing.averageRetryCount * (existing.totalGenerations - 1)) + retryCount
    ) / existing.totalGenerations

    // Actualizar métricas adicionales
    if (tokensUsed) {
      existing.totalTokensUsed = (existing.totalTokensUsed || 0) + tokensUsed
    }
    if (imagesGenerated) {
      existing.totalImagesGenerated = (existing.totalImagesGenerated || 0) + imagesGenerated
    }
    if (qualityScore) {
      const currentQuality = existing.qualityScore || 0
      existing.qualityScore = (
        (currentQuality * (existing.successfulGenerations - 1)) + qualityScore
      ) / existing.successfulGenerations
    }

    this.agentMetrics.set(agentType, existing)
  }

  /**
   * Inicia tracking de campaña
   */
  startCampaignTracking(campaignId: string, totalPublications: number): void {
    if (!this.config.enableCampaignTracking) return

    const metrics: CampaignMetrics = {
      campaignId,
      totalPublications,
      completedPublications: 0,
      failedPublications: 0,
      totalGenerationTime: 0,
      averageTimePerPublication: 0,
      agentsUsed: {},
      errorsEncountered: [],
      startTime: new Date(),
      status: 'in_progress'
    }

    this.campaignMetrics.set(campaignId, metrics)
  }

  /**
   * Actualiza progreso de campaña
   */
  updateCampaignProgress(
    campaignId: string,
    publicationCompleted: boolean,
    generationTime: number,
    agentUsed: string,
    error?: GenerationError
  ): void {
    if (!this.config.enableCampaignTracking) return

    const metrics = this.campaignMetrics.get(campaignId)
    if (!metrics) return

    if (publicationCompleted) {
      metrics.completedPublications++
    } else {
      metrics.failedPublications++
    }

    metrics.totalGenerationTime += generationTime
    metrics.averageTimePerPublication = metrics.totalGenerationTime / 
      (metrics.completedPublications + metrics.failedPublications)

    // Actualizar agentes usados
    metrics.agentsUsed[agentUsed] = (metrics.agentsUsed[agentUsed] || 0) + 1

    // Registrar error si existe
    if (error) {
      metrics.errorsEncountered.push(error)
    }

    // Actualizar estado
    const totalProcessed = metrics.completedPublications + metrics.failedPublications
    if (totalProcessed >= metrics.totalPublications) {
      metrics.status = metrics.failedPublications === 0 ? 'completed' : 
        metrics.completedPublications === 0 ? 'failed' : 'completed'
      metrics.endTime = new Date()
    }

    this.campaignMetrics.set(campaignId, metrics)
  }

  /**
   * Cancela tracking de campaña
   */
  cancelCampaignTracking(campaignId: string): void {
    const metrics = this.campaignMetrics.get(campaignId)
    if (metrics) {
      metrics.status = 'cancelled'
      metrics.endTime = new Date()
      this.campaignMetrics.set(campaignId, metrics)
    }
  }

  /**
   * Inicia tracking de operación individual
   */
  startOperationTracking(operationId: string, operation: string): void {
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      operation
    })
  }

  /**
   * Finaliza tracking de operación individual
   */
  endOperationTracking(operationId: string): number {
    const tracking = this.activeOperations.get(operationId)
    if (tracking) {
      const duration = Date.now() - tracking.startTime
      this.activeOperations.delete(operationId)
      return duration
    }
    return 0
  }

  /**
   * Obtiene métricas de uso de APIs
   */
  getAPIMetrics(service?: 'gemini' | 'nano-banana'): APIUsageMetrics[] {
    const metrics = Array.from(this.apiMetrics.values())
    return service ? metrics.filter(m => m.service === service) : metrics
  }

  /**
   * Obtiene métricas de rendimiento de agentes
   */
  getAgentMetrics(agentType?: string): AgentPerformanceMetrics[] {
    const metrics = Array.from(this.agentMetrics.values())
    return agentType ? metrics.filter(m => m.agentType === agentType) : metrics
  }

  /**
   * Obtiene métricas del sistema
   */
  getSystemMetrics(hours: number = 24): SystemPerformanceMetrics[] {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)
    
    return this.systemMetrics.filter(m => m.timestamp > cutoff)
  }

  /**
   * Obtiene métricas de campaña
   */
  getCampaignMetrics(campaignId?: string): CampaignMetrics[] {
    const metrics = Array.from(this.campaignMetrics.values())
    return campaignId ? metrics.filter(m => m.campaignId === campaignId) : metrics
  }

  /**
   * Genera reporte de rendimiento
   */
  generatePerformanceReport(): {
    summary: {
      totalAPIRequests: number
      totalGenerations: number
      overallSuccessRate: number
      averageResponseTime: number
      totalCost: number
    }
    apiUsage: APIUsageMetrics[]
    agentPerformance: AgentPerformanceMetrics[]
    systemHealth: {
      currentErrorRate: number
      averageQueueLength: number
      memoryUsage: number
      activeOperations: number
    }
    recommendations: string[]
  } {
    const apiMetrics = this.getAPIMetrics()
    const agentMetrics = this.getAgentMetrics()
    const recentSystemMetrics = this.getSystemMetrics(1)

    // Calcular resumen
    const totalAPIRequests = apiMetrics.reduce((sum, m) => sum + m.requestCount, 0)
    const totalSuccessfulRequests = apiMetrics.reduce((sum, m) => sum + m.successCount, 0)
    const totalGenerations = agentMetrics.reduce((sum, m) => sum + m.totalGenerations, 0)
    const totalSuccessfulGenerations = agentMetrics.reduce((sum, m) => sum + m.successfulGenerations, 0)
    const totalCost = apiMetrics.reduce((sum, m) => sum + (m.totalCost || 0), 0)
    const averageResponseTime = apiMetrics.length > 0 
      ? apiMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / apiMetrics.length 
      : 0

    const overallSuccessRate = totalAPIRequests > 0 
      ? (totalSuccessfulRequests / totalAPIRequests) * 100 
      : 0

    // Calcular salud del sistema
    const currentSystemMetric = recentSystemMetrics[recentSystemMetrics.length - 1]
    const systemHealth = {
      currentErrorRate: currentSystemMetric?.errorRate || 0,
      averageQueueLength: recentSystemMetrics.length > 0 
        ? recentSystemMetrics.reduce((sum, m) => sum + m.queueLength, 0) / recentSystemMetrics.length 
        : 0,
      memoryUsage: currentSystemMetric?.memoryUsage || 0,
      activeOperations: this.activeOperations.size
    }

    // Generar recomendaciones
    const recommendations: string[] = []

    if (overallSuccessRate < 95) {
      recommendations.push('Tasa de éxito baja detectada. Revisar configuración de APIs y reintentos.')
    }

    if (averageResponseTime > this.config.alertThresholds.responseTime) {
      recommendations.push('Tiempo de respuesta alto. Considerar optimización de prompts o infraestructura.')
    }

    if (systemHealth.currentErrorRate > this.config.alertThresholds.errorRate) {
      recommendations.push('Alta tasa de errores del sistema. Revisar logs y recursos.')
    }

    const rateLimitHits = apiMetrics.reduce((sum, m) => sum + m.rateLimitHits, 0)
    if (rateLimitHits > 0) {
      recommendations.push('Rate limits detectados. Implementar mejor gestión de cuotas.')
    }

    if (totalCost > 1000) { // Umbral configurable
      recommendations.push('Alto costo de APIs. Revisar eficiencia de prompts y uso.')
    }

    return {
      summary: {
        totalAPIRequests,
        totalGenerations,
        overallSuccessRate,
        averageResponseTime,
        totalCost
      },
      apiUsage: apiMetrics,
      agentPerformance: agentMetrics,
      systemHealth,
      recommendations
    }
  }

  /**
   * Exporta métricas a formato JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      config: this.config,
      apiMetrics: Array.from(this.apiMetrics.entries()),
      agentMetrics: Array.from(this.agentMetrics.entries()),
      systemMetrics: this.systemMetrics,
      campaignMetrics: Array.from(this.campaignMetrics.entries()),
      activeOperations: Array.from(this.activeOperations.entries())
    }, null, 2)
  }

  /**
   * Limpia métricas antiguas
   */
  cleanup(): number {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - this.config.retentionDays)

    // Limpiar métricas del sistema
    const initialSystemCount = this.systemMetrics.length
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff)

    // Limpiar métricas de campaña completadas
    let removedCampaigns = 0
    for (const [id, metrics] of Array.from(this.campaignMetrics.entries())) {
      if (metrics.endTime && metrics.endTime < cutoff) {
        this.campaignMetrics.delete(id)
        removedCampaigns++
      }
    }

    const totalRemoved = (initialSystemCount - this.systemMetrics.length) + removedCampaigns
    return totalRemoved
  }

  /**
   * Inicia recolección automática de métricas del sistema
   */
  private startSystemMetricsCollection(): void {
    const collectMetrics = () => {
      const metric: SystemPerformanceMetrics = {
        timestamp: new Date(),
        memoryUsage: this.getMemoryUsage(),
        activeConnections: this.activeOperations.size,
        queueLength: this.getQueueLength(),
        throughput: this.calculateThroughput(),
        errorRate: this.calculateErrorRate(),
        averageResponseTime: this.calculateAverageResponseTime()
      }

      this.systemMetrics.push(metric)

      // Mantener solo métricas recientes en memoria
      const maxMetrics = (24 * 60) / this.config.aggregationInterval // 24 horas de métricas
      if (this.systemMetrics.length > maxMetrics) {
        this.systemMetrics = this.systemMetrics.slice(-maxMetrics)
      }
    }

    // Recolectar métricas iniciales
    collectMetrics()

    // Configurar recolección periódica
    setInterval(collectMetrics, this.config.aggregationInterval * 60 * 1000)
  }

  /**
   * Obtiene uso de memoria (simulado)
   */
  private getMemoryUsage(): number {
    // En implementación real, esto obtendría métricas reales del sistema
    const apiMetricsSize = JSON.stringify(Array.from(this.apiMetrics.values())).length
    const agentMetricsSize = JSON.stringify(Array.from(this.agentMetrics.values())).length
    const systemMetricsSize = JSON.stringify(this.systemMetrics).length
    
    return apiMetricsSize + agentMetricsSize + systemMetricsSize
  }

  /**
   * Obtiene longitud de cola (simulado)
   */
  private getQueueLength(): number {
    // En implementación real, esto obtendría la longitud real de colas de procesamiento
    return this.activeOperations.size
  }

  /**
   * Calcula throughput (operaciones por minuto)
   */
  private calculateThroughput(): number {
    const recentMetrics = this.getSystemMetrics(1) // Última hora
    if (recentMetrics.length < 2) return 0

    const totalOperations = Array.from(this.agentMetrics.values())
      .reduce((sum, m) => sum + m.totalGenerations, 0)

    return totalOperations / 60 // Por minuto
  }

  /**
   * Calcula tasa de error actual
   */
  private calculateErrorRate(): number {
    const apiMetrics = this.getAPIMetrics()
    const totalRequests = apiMetrics.reduce((sum, m) => sum + m.requestCount, 0)
    const totalErrors = apiMetrics.reduce((sum, m) => sum + m.errorCount, 0)

    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
  }

  /**
   * Calcula tiempo de respuesta promedio actual
   */
  private calculateAverageResponseTime(): number {
    const apiMetrics = this.getAPIMetrics()
    return apiMetrics.length > 0 
      ? apiMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / apiMetrics.length 
      : 0
  }

  /**
   * Actualiza configuración
   */
  updateConfig(newConfig: Partial<MetricsConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Obtiene configuración actual
   */
  getConfig(): MetricsConfig {
    return { ...this.config }
  }
}

/**
 * Instancia global del servicio de métricas
 */
export const metricsService = new MetricsService({
  enableAPITracking: true,
  enablePerformanceTracking: true,
  enableCampaignTracking: true,
  retentionDays: 30,
  aggregationInterval: 5,
  alertThresholds: {
    errorRate: 10,
    responseTime: 30000,
    queueLength: 100
  }
})