import { RetryMiddleware } from '../middleware/RetryMiddleware'
import { loggingService } from './LoggingService'
import { metricsService } from './MetricsService'
import { notificationService } from './NotificationService'
import { GenerationError, GenerationErrorFactory, ErrorUtils } from '../types/errors'

export interface ErrorHandlingConfig {
  enableRetries: boolean
  enableLogging: boolean
  enableMetrics: boolean
  enableNotifications: boolean
  enableRecovery: boolean
  maxRecoveryAttempts: number
  recoveryDelay: number
}

export interface RecoveryState {
  publicationId: string
  campaignId: string
  agentType: string
  originalParams: any
  failureCount: number
  lastFailure: Date
  recoveryAttempts: number
  isRecovering: boolean
}

/**
 * Servicio integrado de manejo de errores que coordina todos los componentes
 * de monitoreo, reintentos, logging y notificaciones
 */
export class ErrorHandlingIntegrationService {
  private config: ErrorHandlingConfig
  private textRetryMiddleware: RetryMiddleware
  private imageRetryMiddleware: RetryMiddleware
  private recoveryStates: Map<string, RecoveryState> = new Map()

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = {
      enableRetries: config.enableRetries ?? true,
      enableLogging: config.enableLogging ?? true,
      enableMetrics: config.enableMetrics ?? true,
      enableNotifications: config.enableNotifications ?? true,
      enableRecovery: config.enableRecovery ?? true,
      maxRecoveryAttempts: config.maxRecoveryAttempts ?? 3,
      recoveryDelay: config.recoveryDelay ?? 30000, // 30 segundos
      ...config
    }

    // Inicializar middlewares de retry especializados
    this.textRetryMiddleware = RetryMiddleware.forTextGeneration()
    this.imageRetryMiddleware = RetryMiddleware.forImageGeneration()
  }

  /**
   * Ejecuta operación con manejo completo de errores
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string
      agentType: string
      publicationId?: string
      campaignId?: string
      operationType: 'text' | 'image'
      params?: any
    }
  ): Promise<T> {
    const { operationName, agentType, publicationId, campaignId, operationType, params } = context
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Seleccionar middleware apropiado
    const retryMiddleware = operationType === 'text' ? this.textRetryMiddleware : this.imageRetryMiddleware

    // Iniciar tracking si está habilitado
    if (this.config.enableMetrics) {
      metricsService.startOperationTracking(operationId, operationName)
    }

    // Log inicio de operación
    if (this.config.enableLogging) {
      loggingService.info(`Starting ${operationName}`, {
        operationId,
        agentType,
        publicationId,
        campaignId,
        operationType
      }, 'ai-generation')
    }

    try {
      let result: T

      if (this.config.enableRetries) {
        // Ejecutar con reintentos
        const retryResult = await retryMiddleware.executeWithRetry(
          operation,
          operationName
        )
        result = retryResult.result

        // Log información de reintentos si hubo
        if (retryResult.context.attempt > 1 && this.config.enableLogging) {
          loggingService.info(`Operation succeeded after ${retryResult.context.attempt} attempts`, {
            operationId,
            totalAttempts: retryResult.context.attempt,
            totalTime: Date.now() - retryResult.context.startTime,
            delays: retryResult.context.delays
          }, 'retry-middleware')
        }
      } else {
        // Ejecutar sin reintentos
        result = await operation()
      }

      // Registrar éxito
      await this.handleSuccess(operationId, context, result)

      return result

    } catch (error) {
      // Manejar error
      await this.handleError(operationId, context, error as Error)
      throw error
    }
  }

  /**
   * Maneja éxito de operación
   */
  private async handleSuccess<T>(
    operationId: string,
    context: any,
    result: T
  ): Promise<void> {
    const { operationName, agentType, publicationId, campaignId, operationType } = context

    // Finalizar tracking de métricas
    if (this.config.enableMetrics) {
      const duration = metricsService.endOperationTracking(operationId)
      
      // Registrar métricas específicas por tipo
      if (operationType === 'text') {
        metricsService.recordGeminiAPIUsage('generateContent', true, duration)
        metricsService.recordAgentPerformance(agentType, true, duration, 0)
      } else {
        metricsService.recordNanoBananaAPIUsage('generateImage', true, duration)
        metricsService.recordAgentPerformance(agentType, true, duration, 0, undefined, 1)
      }
    }

    // Log éxito
    if (this.config.enableLogging) {
      loggingService.logAIOperation(
        operationName,
        agentType,
        publicationId || operationId,
        campaignId || 'unknown',
        true,
        Date.now() - parseInt(operationId.split('_')[1]),
        { result: typeof result === 'object' ? 'object' : String(result) }
      )
    }

    // Notificar éxito si es relevante
    if (this.config.enableNotifications && publicationId) {
      notificationService.notifyGenerationSuccess(
        `${operationName} completado exitosamente`,
        {
          publicationId,
          campaignId,
          agentType
        }
      )
    }

    // Limpiar estado de recuperación si existía
    if (publicationId && this.recoveryStates.has(publicationId)) {
      this.recoveryStates.delete(publicationId)
    }
  }

  /**
   * Maneja error de operación
   */
  private async handleError(
    operationId: string,
    context: any,
    error: Error
  ): Promise<void> {
    const { operationName, agentType, publicationId, campaignId, operationType, params } = context

    // Convertir a GenerationError si es necesario
    const generationError = this.classifyError(error, operationType)

    // Finalizar tracking de métricas
    if (this.config.enableMetrics) {
      const duration = metricsService.endOperationTracking(operationId)
      
      // Registrar métricas de error
      if (operationType === 'text') {
        metricsService.recordGeminiAPIUsage('generateContent', false, duration, undefined, undefined, generationError)
        metricsService.recordAgentPerformance(agentType, false, duration, 3) // Asumir 3 reintentos
      } else {
        metricsService.recordNanoBananaAPIUsage('generateImage', false, duration, undefined, undefined, generationError)
        metricsService.recordAgentPerformance(agentType, false, duration, 3, undefined, 0)
      }
    }

    // Log error
    if (this.config.enableLogging) {
      loggingService.logAIOperation(
        operationName,
        agentType,
        publicationId || operationId,
        campaignId || 'unknown',
        false,
        Date.now() - parseInt(operationId.split('_')[1]),
        { errorType: generationError.type },
        generationError
      )

      // Registrar estadísticas de error
      loggingService.recordErrorStats(generationError, agentType)
    }

    // Notificar error
    if (this.config.enableNotifications) {
      notificationService.notifyGenerationError(generationError, {
        agentType,
        publicationId,
        campaignId,
        retryHandler: this.config.enableRecovery && publicationId ? 
          () => this.scheduleRecovery(publicationId, context) : undefined
      })
    }

    // Programar recuperación si está habilitada
    if (this.config.enableRecovery && publicationId && generationError.retryable) {
      await this.updateRecoveryState(publicationId, context, generationError)
    }
  }

  /**
   * Clasifica error según el tipo de operación
   */
  private classifyError(error: Error, operationType: 'text' | 'image'): GenerationError {
    // Si ya es un GenerationError, devolverlo
    if (error && typeof error === 'object' && 'type' in error) {
      return error as GenerationError
    }

    // Clasificar según tipo de operación y mensaje
    const message = error.message.toLowerCase()

    if (operationType === 'text') {
      if (message.includes('gemini') || message.includes('generativelanguage')) {
        return GenerationErrorFactory.createGeminiError(error.message, { model: 'gemini-pro' })
      }
    } else {
      if (message.includes('nano banana') || message.includes('image')) {
        return GenerationErrorFactory.createNanoBananaError(error.message, {})
      }
    }

    // Clasificaciones generales
    if (message.includes('network') || message.includes('connection')) {
      return GenerationErrorFactory.createNetworkError(error.message)
    }

    if (message.includes('timeout')) {
      return GenerationErrorFactory.createTimeoutError(error.message, 30000, 'unknown')
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return GenerationErrorFactory.createRateLimitError(error.message, 100, 0, new Date(Date.now() + 60000))
    }

    // Error genérico
    return GenerationErrorFactory.fromError(error, 'UNKNOWN_ERROR')
  }

  /**
   * Actualiza estado de recuperación
   */
  private async updateRecoveryState(
    publicationId: string,
    context: any,
    error: GenerationError
  ): Promise<void> {
    const existing = this.recoveryStates.get(publicationId) || {
      publicationId,
      campaignId: context.campaignId || 'unknown',
      agentType: context.agentType,
      originalParams: context.params,
      failureCount: 0,
      lastFailure: new Date(),
      recoveryAttempts: 0,
      isRecovering: false
    }

    existing.failureCount++
    existing.lastFailure = new Date()

    this.recoveryStates.set(publicationId, existing)

    // Programar recuperación automática si no está ya en proceso
    if (!existing.isRecovering && existing.recoveryAttempts < this.config.maxRecoveryAttempts) {
      setTimeout(() => {
        this.attemptRecovery(publicationId)
      }, this.config.recoveryDelay)
    }
  }

  /**
   * Programa recuperación manual
   */
  private async scheduleRecovery(publicationId: string, context: any): Promise<void> {
    if (this.config.enableLogging) {
      loggingService.info(`Manual recovery scheduled for publication ${publicationId}`, {
        publicationId,
        context
      }, 'error-handling')
    }

    // En implementación real, esto activaría el proceso de regeneración
    setTimeout(() => {
      this.attemptRecovery(publicationId)
    }, 1000) // Delay corto para recuperación manual
  }

  /**
   * Intenta recuperación automática
   */
  private async attemptRecovery(publicationId: string): Promise<void> {
    const recoveryState = this.recoveryStates.get(publicationId)
    if (!recoveryState || recoveryState.isRecovering) {
      return
    }

    recoveryState.isRecovering = true
    recoveryState.recoveryAttempts++

    if (this.config.enableLogging) {
      loggingService.info(`Attempting recovery for publication ${publicationId}`, {
        publicationId,
        attempt: recoveryState.recoveryAttempts,
        maxAttempts: this.config.maxRecoveryAttempts
      }, 'error-handling')
    }

    try {
      // En implementación real, esto llamaría al agente apropiado para regenerar
      // Por ahora, simulamos el proceso
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Simular éxito de recuperación
      if (Math.random() > 0.3) { // 70% de éxito
        if (this.config.enableLogging) {
          loggingService.info(`Recovery successful for publication ${publicationId}`, {
            publicationId,
            attempts: recoveryState.recoveryAttempts
          }, 'error-handling')
        }

        if (this.config.enableNotifications) {
          notificationService.notifyGenerationSuccess(
            `Recuperación exitosa para publicación ${publicationId}`,
            {
              publicationId,
              campaignId: recoveryState.campaignId,
              agentType: recoveryState.agentType
            }
          )
        }

        // Limpiar estado de recuperación
        this.recoveryStates.delete(publicationId)
      } else {
        throw new Error('Recovery attempt failed')
      }

    } catch (error) {
      recoveryState.isRecovering = false

      if (this.config.enableLogging) {
        loggingService.warn(`Recovery attempt ${recoveryState.recoveryAttempts} failed for publication ${publicationId}`, {
          publicationId,
          error: (error as Error).message,
          attemptsRemaining: this.config.maxRecoveryAttempts - recoveryState.recoveryAttempts
        }, 'error-handling')
      }

      // Programar siguiente intento si quedan intentos
      if (recoveryState.recoveryAttempts < this.config.maxRecoveryAttempts) {
        setTimeout(() => {
          this.attemptRecovery(publicationId)
        }, this.config.recoveryDelay * Math.pow(2, recoveryState.recoveryAttempts - 1)) // Backoff exponencial
      } else {
        // Agotar intentos de recuperación
        if (this.config.enableNotifications) {
          notificationService.notifyGenerationError(
            GenerationErrorFactory.fromError(error as Error, 'UNKNOWN_ERROR'),
            {
              publicationId,
              campaignId: recoveryState.campaignId,
              agentType: recoveryState.agentType
            }
          )
        }
      }
    }
  }

  /**
   * Obtiene estado de recuperación
   */
  getRecoveryState(publicationId: string): RecoveryState | null {
    return this.recoveryStates.get(publicationId) || null
  }

  /**
   * Obtiene todos los estados de recuperación
   */
  getAllRecoveryStates(): RecoveryState[] {
    return Array.from(this.recoveryStates.values())
  }

  /**
   * Cancela recuperación
   */
  cancelRecovery(publicationId: string): boolean {
    const state = this.recoveryStates.get(publicationId)
    if (state) {
      this.recoveryStates.delete(publicationId)
      
      if (this.config.enableLogging) {
        loggingService.info(`Recovery cancelled for publication ${publicationId}`, {
          publicationId
        }, 'error-handling')
      }
      
      return true
    }
    return false
  }

  /**
   * Genera reporte de salud del sistema
   */
  generateHealthReport(): {
    systemHealth: 'healthy' | 'degraded' | 'critical'
    errorRate: number
    averageResponseTime: number
    activeRecoveries: number
    recommendations: string[]
    metrics: {
      totalOperations: number
      successfulOperations: number
      failedOperations: number
      averageRetryCount: number
    }
  } {
    // Obtener métricas del sistema
    const performanceReport = metricsService.generatePerformanceReport()
    const errorReport = loggingService.generateErrorReport()
    
    // Calcular salud del sistema
    const errorRate = errorReport.summary.errorRate
    const responseTime = performanceReport.summary.averageResponseTime
    const activeRecoveries = this.getAllRecoveryStates().filter(s => s.isRecovering).length

    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'
    
    if (errorRate > 20 || responseTime > 60000 || activeRecoveries > 10) {
      systemHealth = 'critical'
    } else if (errorRate > 10 || responseTime > 30000 || activeRecoveries > 5) {
      systemHealth = 'degraded'
    }

    // Combinar recomendaciones
    const recommendations = [
      ...performanceReport.recommendations,
      ...errorReport.recommendations
    ]

    if (activeRecoveries > 0) {
      recommendations.push(`${activeRecoveries} publicaciones en proceso de recuperación`)
    }

    return {
      systemHealth,
      errorRate,
      averageResponseTime: responseTime,
      activeRecoveries,
      recommendations,
      metrics: {
        totalOperations: performanceReport.summary.totalGenerations,
        successfulOperations: Math.floor(performanceReport.summary.totalGenerations * (100 - errorRate) / 100),
        failedOperations: Math.floor(performanceReport.summary.totalGenerations * errorRate / 100),
        averageRetryCount: 0 // Calcular desde métricas de agentes
      }
    }
  }

  /**
   * Actualiza configuración
   */
  updateConfig(newConfig: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Obtiene configuración actual
   */
  getConfig(): ErrorHandlingConfig {
    return { ...this.config }
  }

  /**
   * Limpia estados antiguos de recuperación
   */
  cleanupRecoveryStates(olderThanHours: number = 24): number {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - olderThanHours)

    let removedCount = 0
    for (const [publicationId, state] of this.recoveryStates.entries()) {
      if (state.lastFailure < cutoff && !state.isRecovering) {
        this.recoveryStates.delete(publicationId)
        removedCount++
      }
    }

    if (removedCount > 0 && this.config.enableLogging) {
      loggingService.info(`Cleaned up ${removedCount} old recovery states`, {
        removedCount,
        cutoffTime: cutoff.toISOString()
      }, 'maintenance')
    }

    return removedCount
  }
}

/**
 * Instancia global del servicio integrado de manejo de errores
 */
export const errorHandlingService = new ErrorHandlingIntegrationService({
  enableRetries: true,
  enableLogging: true,
  enableMetrics: true,
  enableNotifications: true,
  enableRecovery: true,
  maxRecoveryAttempts: 3,
  recoveryDelay: 30000
})