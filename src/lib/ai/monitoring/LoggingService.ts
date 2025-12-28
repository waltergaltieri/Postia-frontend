import { GenerationError, ErrorStats, GenerationErrorType } from '../types/errors'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  category: string
  message: string
  context?: Record<string, any>
  error?: GenerationError
  duration?: number
  publicationId?: string
  campaignId?: string
  agentType?: string
}

export interface LoggingConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  enableDatabase: boolean
  maxEntries: number
  retentionDays: number
  categories: string[]
}

export interface PerformanceMetrics {
  operationName: string
  startTime: number
  endTime?: number
  duration?: number
  success: boolean
  error?: GenerationError
  metadata?: Record<string, any>
}

/**
 * Servicio de logging estructurado para operaciones de generación de IA
 * Proporciona logging detallado, métricas de rendimiento y análisis de errores
 */
export class LoggingService {
  private config: LoggingConfig
  private logs: LogEntry[] = []
  private metrics: PerformanceMetrics[] = []
  private errorStats: Map<string, ErrorStats> = new Map()

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = {
      level: config.level ?? 'info',
      enableConsole: config.enableConsole ?? true,
      enableFile: config.enableFile ?? false,
      enableDatabase: config.enableDatabase ?? false,
      maxEntries: config.maxEntries ?? 10000,
      retentionDays: config.retentionDays ?? 7,
      categories: config.categories ?? [
        'ai-generation',
        'gemini-api',
        'nano-banana',
        'retry-middleware',
        'error-handling',
        'performance'
      ]
    }
  }

  /**
   * Log de debug - información detallada para desarrollo
   */
  debug(message: string, context?: Record<string, any>, category: string = 'general'): void {
    this.log('debug', category, message, context)
  }

  /**
   * Log de información - eventos normales del sistema
   */
  info(message: string, context?: Record<string, any>, category: string = 'general'): void {
    this.log('info', category, message, context)
  }

  /**
   * Log de advertencia - situaciones que requieren atención
   */
  warn(message: string, context?: Record<string, any>, category: string = 'general'): void {
    this.log('warn', category, message, context)
  }

  /**
   * Log de error - fallos que requieren investigación
   */
  error(message: string, error?: GenerationError, context?: Record<string, any>, category: string = 'error'): void {
    this.log('error', category, message, context, error)
  }

  /**
   * Log específico para operaciones de generación de IA
   */
  logAIOperation(
    operation: string,
    agentType: string,
    publicationId: string,
    campaignId: string,
    success: boolean,
    duration: number,
    context?: Record<string, any>,
    error?: GenerationError
  ): void {
    const message = `AI Operation: ${operation} - ${success ? 'SUCCESS' : 'FAILED'}`
    
    this.log(success ? 'info' : 'error', 'ai-generation', message, {
      operation,
      agentType,
      publicationId,
      campaignId,
      duration,
      success,
      ...context
    }, error)
  }

  /**
   * Log específico para llamadas a API de Gemini
   */
  logGeminiAPI(
    model: string,
    operation: string,
    success: boolean,
    duration: number,
    tokenCount?: number,
    error?: GenerationError,
    context?: Record<string, any>
  ): void {
    const message = `Gemini API: ${model} - ${operation} - ${success ? 'SUCCESS' : 'FAILED'}`
    
    this.log(success ? 'info' : 'error', 'gemini-api', message, {
      model,
      operation,
      duration,
      tokenCount,
      success,
      ...context
    }, error)
  }

  /**
   * Log específico para operaciones de Nano Banana
   */
  logNanoBanana(
    operation: string,
    jobId: string,
    success: boolean,
    duration: number,
    imageSize?: number,
    error?: GenerationError,
    context?: Record<string, any>
  ): void {
    const message = `Nano Banana: ${operation} - ${success ? 'SUCCESS' : 'FAILED'}`
    
    this.log(success ? 'info' : 'error', 'nano-banana', message, {
      operation,
      jobId,
      duration,
      imageSize,
      success,
      ...context
    }, error)
  }

  /**
   * Log específico para reintentos
   */
  logRetry(
    operation: string,
    attempt: number,
    maxAttempts: number,
    delay: number,
    error: GenerationError,
    context?: Record<string, any>
  ): void {
    const message = `Retry: ${operation} - Attempt ${attempt}/${maxAttempts} - Delay ${delay}ms`
    
    this.log('warn', 'retry-middleware', message, {
      operation,
      attempt,
      maxAttempts,
      delay,
      errorType: error.type,
      ...context
    }, error)
  }

  /**
   * Inicia tracking de métricas de rendimiento
   */
  startPerformanceTracking(operationName: string, metadata?: Record<string, any>): string {
    const trackingId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const metric: PerformanceMetrics = {
      operationName,
      startTime: Date.now(),
      success: false,
      metadata
    }
    
    this.metrics.push(metric)
    
    this.debug(`Performance tracking started: ${operationName}`, {
      trackingId,
      operationName,
      metadata
    }, 'performance')
    
    return trackingId
  }

  /**
   * Finaliza tracking de métricas de rendimiento
   */
  endPerformanceTracking(
    trackingId: string,
    success: boolean,
    error?: GenerationError,
    additionalMetadata?: Record<string, any>
  ): PerformanceMetrics | null {
    const metric = this.metrics.find(m => 
      m.operationName.includes(trackingId.split('_')[2]) || 
      (m.metadata && m.metadata.trackingId === trackingId)
    )
    
    if (!metric) {
      this.warn(`Performance tracking not found: ${trackingId}`, { trackingId }, 'performance')
      return null
    }
    
    metric.endTime = Date.now()
    metric.duration = metric.endTime - metric.startTime
    metric.success = success
    metric.error = error
    
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata }
    }
    
    this.info(`Performance tracking completed: ${metric.operationName}`, {
      trackingId,
      duration: metric.duration,
      success,
      error: error?.type
    }, 'performance')
    
    return metric
  }

  /**
   * Registra estadísticas de error para análisis
   */
  recordErrorStats(error: GenerationError, agentType: string): void {
    const key = `${agentType}_${error.type}`
    const existing = this.errorStats.get(key) || {
      totalErrors: 0,
      errorsByType: {} as Record<GenerationErrorType, number>,
      errorsByAgent: {} as Record<string, number>,
      averageRetryCount: 0,
      successRate: 0,
      timeWindow: {
        start: new Date(),
        end: new Date()
      }
    }
    
    existing.totalErrors++
    existing.errorsByType[error.type] = (existing.errorsByType[error.type] || 0) + 1
    existing.errorsByAgent[agentType] = (existing.errorsByAgent[agentType] || 0) + 1
    existing.lastError = error
    existing.timeWindow.end = new Date()
    
    if (error.retryCount) {
      const totalRetries = existing.averageRetryCount * (existing.totalErrors - 1) + error.retryCount
      existing.averageRetryCount = totalRetries / existing.totalErrors
    }
    
    this.errorStats.set(key, existing)
  }

  /**
   * Obtiene estadísticas de errores por agente
   */
  getErrorStats(agentType?: string): ErrorStats[] {
    const stats: ErrorStats[] = []
    
    for (const [key, stat] of Array.from(this.errorStats.entries())) {
      if (!agentType || key.startsWith(agentType)) {
        stats.push(stat)
      }
    }
    
    return stats
  }

  /**
   * Obtiene métricas de rendimiento
   */
  getPerformanceMetrics(operationName?: string): PerformanceMetrics[] {
    return this.metrics.filter(m => 
      !operationName || m.operationName.includes(operationName)
    )
  }

  /**
   * Obtiene logs filtrados
   */
  getLogs(filters?: {
    level?: LogLevel
    category?: string
    startTime?: Date
    endTime?: Date
    publicationId?: string
    campaignId?: string
    agentType?: string
  }): LogEntry[] {
    let filteredLogs = [...this.logs]
    
    if (filters) {
      if (filters.level) {
        const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 }
        const minPriority = levelPriority[filters.level]
        filteredLogs = filteredLogs.filter(log => 
          levelPriority[log.level] >= minPriority
        )
      }
      
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category)
      }
      
      if (filters.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime!)
      }
      
      if (filters.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime!)
      }
      
      if (filters.publicationId) {
        filteredLogs = filteredLogs.filter(log => log.publicationId === filters.publicationId)
      }
      
      if (filters.campaignId) {
        filteredLogs = filteredLogs.filter(log => log.campaignId === filters.campaignId)
      }
      
      if (filters.agentType) {
        filteredLogs = filteredLogs.filter(log => log.agentType === filters.agentType)
      }
    }
    
    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Genera reporte de análisis de errores
   */
  generateErrorReport(): {
    summary: {
      totalErrors: number
      errorRate: number
      mostCommonError: GenerationErrorType
      mostProblematicAgent: string
    }
    details: ErrorStats[]
    recommendations: string[]
  } {
    const allStats = this.getErrorStats()
    const totalErrors = allStats.reduce((sum, stat) => sum + stat.totalErrors, 0)
    const totalOperations = this.metrics.length
    const errorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0
    
    // Encontrar error más común
    const errorCounts: Record<GenerationErrorType, number> = {} as any
    allStats.forEach(stat => {
      Object.entries(stat.errorsByType).forEach(([type, count]) => {
        errorCounts[type as GenerationErrorType] = (errorCounts[type as GenerationErrorType] || 0) + count
      })
    })
    
    const mostCommonError = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as GenerationErrorType
    
    // Encontrar agente más problemático
    const agentCounts: Record<string, number> = {}
    allStats.forEach(stat => {
      Object.entries(stat.errorsByAgent).forEach(([agent, count]) => {
        agentCounts[agent] = (agentCounts[agent] || 0) + count
      })
    })
    
    const mostProblematicAgent = Object.entries(agentCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown'
    
    // Generar recomendaciones
    const recommendations: string[] = []
    
    if (errorRate > 10) {
      recommendations.push('Alta tasa de errores detectada. Revisar configuración de APIs.')
    }
    
    if (mostCommonError === 'RATE_LIMIT_ERROR') {
      recommendations.push('Implementar mejor gestión de rate limiting.')
    }
    
    if (mostCommonError === 'NETWORK_ERROR') {
      recommendations.push('Revisar conectividad y configuración de red.')
    }
    
    if (allStats.some(s => s.averageRetryCount > 2)) {
      recommendations.push('Considerar ajustar configuración de reintentos.')
    }
    
    return {
      summary: {
        totalErrors,
        errorRate,
        mostCommonError,
        mostProblematicAgent
      },
      details: allStats,
      recommendations
    }
  }

  /**
   * Limpia logs antiguos según configuración de retención
   */
  cleanupOldLogs(): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)
    
    const initialCount = this.logs.length
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate)
    
    // También limpiar métricas antiguas
    this.metrics = this.metrics.filter(metric => 
      new Date(metric.startTime) > cutoffDate
    )
    
    const removedCount = initialCount - this.logs.length
    
    if (removedCount > 0) {
      this.info(`Cleaned up ${removedCount} old log entries`, {
        cutoffDate: cutoffDate.toISOString(),
        remainingLogs: this.logs.length
      }, 'maintenance')
    }
    
    return removedCount
  }

  /**
   * Exporta logs a formato JSON
   */
  exportLogs(filters?: Parameters<typeof this.getLogs>[0]): string {
    const logs = this.getLogs(filters)
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalLogs: logs.length,
      config: this.config,
      logs
    }, null, 2)
  }

  /**
   * Método principal de logging interno
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    context?: Record<string, any>,
    error?: GenerationError
  ): void {
    // Verificar si el nivel está habilitado
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 }
    if (levelPriority[level] < levelPriority[this.config.level]) {
      return
    }

    // Verificar si la categoría está habilitada
    if (this.config.categories.length > 0 && !this.config.categories.includes(category)) {
      return
    }

    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message,
      context,
      error,
      publicationId: context?.publicationId,
      campaignId: context?.campaignId,
      agentType: context?.agentType
    }

    // Agregar a logs en memoria
    this.logs.push(logEntry)

    // Mantener límite de logs en memoria
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries)
    }

    // Log a consola si está habilitado
    if (this.config.enableConsole) {
      this.logToConsole(logEntry)
    }

    // Registrar estadísticas de error si aplica
    if (error && context?.agentType) {
      this.recordErrorStats(error, context.agentType)
    }
  }

  /**
   * Log a consola con formato apropiado
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString()
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`
    
    const contextStr = entry.context ? 
      `\n  Context: ${JSON.stringify(entry.context, null, 2)}` : ''
    
    const errorStr = entry.error ? 
      `\n  Error: ${entry.error.type} - ${entry.error.message}` : ''

    const fullMessage = `${prefix} ${entry.message}${contextStr}${errorStr}`

    switch (entry.level) {
      case 'debug':
        console.debug(fullMessage)
        break
      case 'info':
        console.info(fullMessage)
        break
      case 'warn':
        console.warn(fullMessage)
        break
      case 'error':
        console.error(fullMessage)
        break
    }
  }

  /**
   * Actualiza configuración del servicio
   */
  updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Obtiene configuración actual
   */
  getConfig(): LoggingConfig {
    return { ...this.config }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getServiceStats(): {
    totalLogs: number
    logsByLevel: Record<LogLevel, number>
    logsByCategory: Record<string, number>
    totalMetrics: number
    totalErrorStats: number
    memoryUsage: number
  } {
    const logsByLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 }
    const logsByCategory: Record<string, number> = {}

    this.logs.forEach(log => {
      logsByLevel[log.level]++
      logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1
    })

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByCategory,
      totalMetrics: this.metrics.length,
      totalErrorStats: this.errorStats.size,
      memoryUsage: JSON.stringify(this.logs).length + JSON.stringify(this.metrics).length
    }
  }
}

/**
 * Instancia global del servicio de logging
 */
export const loggingService = new LoggingService({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableConsole: true,
  enableFile: false,
  enableDatabase: false,
  maxEntries: 5000,
  retentionDays: 7
})

/**
 * Decorator para logging automático de métodos
 */
export function withLogging(category: string = 'general') {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const operationName = `${target.constructor.name}.${propertyName}`
      const trackingId = loggingService.startPerformanceTracking(operationName, {
        args: args.length,
        className: target.constructor.name,
        methodName: propertyName
      })

      try {
        const result = await method.apply(this, args)
        
        loggingService.endPerformanceTracking(trackingId, true)
        loggingService.info(`Operation completed: ${operationName}`, {
          success: true,
          trackingId
        }, category)
        
        return result
      } catch (error) {
        const generationError = error instanceof Error ? 
          { type: 'UNKNOWN_ERROR' as const, message: error.message, timestamp: new Date(), retryable: false } :
          error

        loggingService.endPerformanceTracking(trackingId, false, generationError)
        loggingService.error(`Operation failed: ${operationName}`, generationError, {
          trackingId
        }, category)
        
        throw error
      }
    }

    return descriptor
  }
}