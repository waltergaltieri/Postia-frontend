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

export interface AIError extends Error {
  type: AIErrorType
  code?: string
  statusCode?: number
  retryable: boolean
  details?: Record<string, any>
  cause?: Error
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: AIErrorType[]
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: AIError
  attempts: number
  totalTime: number
}

export class AIErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'SERVICE_UNAVAILABLE'
    ]
  }

  /**
   * Crea un error de IA tipificado
   */
  static createError(
    message: string,
    type: AIErrorType,
    options: {
      code?: string
      statusCode?: number
      retryable?: boolean
      details?: Record<string, any>
      cause?: Error
    } = {}
  ): AIError {
    const error = new Error(message) as AIError
    error.type = type
    error.code = options.code
    error.statusCode = options.statusCode
    error.retryable = options.retryable ?? this.isRetryableByDefault(type)
    error.details = options.details
    
    if (options.cause) {
      error.cause = options.cause
    }

    return error
  }

  /**
   * Determina si un tipo de error es reintentable por defecto
   */
  private static isRetryableByDefault(type: AIErrorType): boolean {
    return this.DEFAULT_RETRY_CONFIG.retryableErrors.includes(type)
  }

  /**
   * Parsea errores de respuesta HTTP y los convierte a AIError
   */
  static parseHttpError(response: Response, responseBody?: any): AIError {
    const statusCode = response.status
    let type: AIErrorType
    let message = `HTTP ${statusCode}: ${response.statusText}`

    // Determinar tipo de error basado en código de estado
    switch (statusCode) {
      case 401:
      case 403:
        type = 'AUTHENTICATION_ERROR'
        message = 'Authentication failed. Please check your API key.'
        break
      case 429:
        type = 'RATE_LIMIT_ERROR'
        message = 'Rate limit exceeded. Please try again later.'
        break
      case 500:
      case 502:
      case 503:
      case 504:
        type = 'SERVICE_UNAVAILABLE'
        message = 'AI service is temporarily unavailable.'
        break
      case 400:
        type = 'VALIDATION_ERROR'
        message = responseBody?.error?.message || 'Invalid request parameters.'
        break
      default:
        type = 'API_ERROR'
    }

    return this.createError(message, type, {
      statusCode,
      retryable: type === 'RATE_LIMIT_ERROR' || type === 'SERVICE_UNAVAILABLE',
      details: {
        url: response.url,
        responseBody
      }
    })
  }

  /**
   * Parsea errores de red y los convierte a AIError
   */
  static parseNetworkError(error: Error): AIError {
    if (error.name === 'AbortError') {
      return this.createError(
        'Request timeout',
        'TIMEOUT_ERROR',
        { retryable: true, cause: error }
      )
    }

    if (error.message.includes('fetch')) {
      return this.createError(
        'Network connection failed',
        'NETWORK_ERROR',
        { retryable: true, cause: error }
      )
    }

    return this.createError(
      error.message,
      'UNKNOWN_ERROR',
      { retryable: false, cause: error }
    )
  }

  /**
   * Determina si un error debe ser reintentado
   */
  static shouldRetry(error: AIError, config: RetryConfig = this.DEFAULT_RETRY_CONFIG): boolean {
    return error.retryable && config.retryableErrors.includes(error.type)
  }

  /**
   * Calcula el delay para el siguiente intento
   */
  static calculateDelay(attempt: number, config: RetryConfig = this.DEFAULT_RETRY_CONFIG): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
    return Math.min(delay, config.maxDelay)
  }

  /**
   * Formatea un error para logging
   */
  static formatErrorForLogging(error: AIError): Record<string, any> {
    return {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      retryable: error.retryable,
      details: error.details,
      stack: error.stack
    }
  }
}

export class AIRetryManager {
  private config: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      ...AIErrorHandler['DEFAULT_RETRY_CONFIG'],
      ...config
    }
  }

  /**
   * Ejecuta una función con reintentos automáticos
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'AI Operation'
  ): Promise<RetryResult<T>> {
    const startTime = Date.now()
    let lastError: AIError | null = null
    let attempts = 0

    for (attempts = 1; attempts <= this.config.maxAttempts; attempts++) {
      try {
        const result = await operation()
        const totalTime = Date.now() - startTime

        return {
          success: true,
          result,
          attempts,
          totalTime
        }
      } catch (error) {
        const aiError = this.normalizeError(error)
        lastError = aiError

        console.warn(`${operationName} attempt ${attempts} failed:`, 
          AIErrorHandler.formatErrorForLogging(aiError))

        // Si no es reintentable o es el último intento, fallar
        if (!AIErrorHandler.shouldRetry(aiError, this.config) || attempts >= this.config.maxAttempts) {
          break
        }

        // Esperar antes del siguiente intento
        const delay = AIErrorHandler.calculateDelay(attempts, this.config)
        await this.sleep(delay)
      }
    }

    const totalTime = Date.now() - startTime
    return {
      success: false,
      error: lastError!,
      attempts,
      totalTime
    }
  }

  /**
   * Normaliza cualquier error a AIError
   */
  private normalizeError(error: any): AIError {
    if (error && typeof error === 'object' && 'type' in error) {
      return error as AIError
    }

    if (error instanceof Error) {
      return AIErrorHandler.parseNetworkError(error)
    }

    return AIErrorHandler.createError(
      String(error),
      'UNKNOWN_ERROR',
      { retryable: false }
    )
  }

  /**
   * Utilidad para esperar un tiempo determinado
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Actualiza la configuración de reintentos
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }
}

// Instancia global del retry manager
export const globalRetryManager = new AIRetryManager()

// Funciones de utilidad para manejo de errores comunes

/**
 * Wrapper para llamadas a APIs de IA con manejo de errores automático
 */
export async function withAIErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string = 'AI API Call'
): Promise<T> {
  const result = await globalRetryManager.executeWithRetry(operation, operationName)
  
  if (result.success) {
    return result.result!
  }
  
  throw result.error
}

/**
 * Crea un timeout para operaciones de IA
 */
export function createAITimeout(timeoutMs: number): AbortController {
  const controller = new AbortController()
  
  setTimeout(() => {
    controller.abort()
  }, timeoutMs)
  
  return controller
}

/**
 * Valida que las credenciales de API estén configuradas
 */
export function validateAICredentials(): { gemini: boolean, nanoBanana: boolean } {
  return {
    gemini: !!process.env.GEMINI_API_KEY,
    nanoBanana: !!process.env.NANO_BANANA_API_KEY
  }
}

/**
 * Obtiene métricas de error para monitoreo
 */
export class AIErrorMetrics {
  private static errors: AIError[] = []
  private static readonly MAX_STORED_ERRORS = 1000

  static recordError(error: AIError): void {
    this.errors.push(error)
    
    // Mantener solo los últimos errores
    if (this.errors.length > this.MAX_STORED_ERRORS) {
      this.errors = this.errors.slice(-this.MAX_STORED_ERRORS)
    }
  }

  static getErrorStats(timeWindowMs: number = 3600000): {
    total: number
    byType: Record<AIErrorType, number>
    retryableCount: number
    averagePerHour: number
  } {
    const cutoff = Date.now() - timeWindowMs
    const recentErrors = this.errors.filter(error => 
      error.details?.timestamp && error.details.timestamp > cutoff
    )

    const byType = recentErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1
      return acc
    }, {} as Record<AIErrorType, number>)

    const retryableCount = recentErrors.filter(error => error.retryable).length
    const averagePerHour = (recentErrors.length / timeWindowMs) * 3600000

    return {
      total: recentErrors.length,
      byType,
      retryableCount,
      averagePerHour
    }
  }

  static clearErrors(): void {
    this.errors = []
  }
}