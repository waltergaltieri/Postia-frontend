/**
 * Tipos de errores específicos para generación de contenido con IA
 */
export type GenerationErrorType = 
  | 'GEMINI_API_FAILURE'
  | 'NANO_BANANA_API_FAILURE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'VALIDATION_ERROR'
  | 'RESOURCE_NOT_FOUND'
  | 'TEMPLATE_ERROR'
  | 'CONTENT_TOO_LONG'
  | 'INSUFFICIENT_CREDITS'
  | 'TEMPORARY_UNAVAILABLE'
  | 'UNKNOWN_ERROR'

/**
 * Estructura de error de generación con contexto completo
 */
export interface GenerationError {
  type: GenerationErrorType
  message: string
  timestamp: Date
  retryable: boolean
  context?: Record<string, any>
  publicationId?: string
  agentType?: string
  retryCount?: number
}

/**
 * Error específico para fallos de API de Gemini
 */
export interface GeminiAPIError extends GenerationError {
  type: 'GEMINI_API_FAILURE'
  context: {
    model: string
    prompt?: string
    statusCode?: number
    apiResponse?: any
    requestId?: string
  }
}

/**
 * Error específico para fallos de Nano Banana
 */
export interface NanoBananaError extends GenerationError {
  type: 'NANO_BANANA_API_FAILURE'
  context: {
    jobId?: string
    imageParams?: any
    statusCode?: number
    apiResponse?: any
  }
}

/**
 * Error de validación de entrada
 */
export interface ValidationError extends GenerationError {
  type: 'VALIDATION_ERROR'
  retryable: false
  context: {
    field: string
    value: any
    constraint: string
  }
}

/**
 * Error de límite de rate
 */
export interface RateLimitError extends GenerationError {
  type: 'RATE_LIMIT_ERROR'
  context: {
    limit: number
    remaining: number
    resetTime: Date
    retryAfter?: number
  }
}

/**
 * Estadísticas de errores para monitoreo
 */
export interface ErrorStats {
  totalErrors: number
  errorsByType: Record<GenerationErrorType, number>
  errorsByAgent: Record<string, number>
  averageRetryCount: number
  successRate: number
  lastError?: GenerationError
  timeWindow: {
    start: Date
    end: Date
  }
}

/**
 * Configuración de manejo de errores
 */
export interface ErrorHandlingConfig {
  maxRetries: number
  retryDelay: number
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  notifyUser: boolean
  persistErrors: boolean
  enableMetrics: boolean
}

/**
 * Contexto de recuperación después de error
 */
export interface RecoveryContext {
  publicationId: string
  campaignId: string
  agentType: string
  originalParams: any
  failedAt: Date
  retryCount: number
  lastError: GenerationError
}

/**
 * Resultado de operación con manejo de errores
 */
export interface OperationResult<T> {
  success: boolean
  data?: T
  error?: GenerationError
  retryCount: number
  executionTime: number
  warnings?: string[]
}

/**
 * Factory para crear errores específicos
 */
export class GenerationErrorFactory {
  /**
   * Crea error de API de Gemini
   */
  static createGeminiError(
    message: string,
    context: GeminiAPIError['context'],
    publicationId?: string
  ): GeminiAPIError {
    return {
      type: 'GEMINI_API_FAILURE',
      message,
      timestamp: new Date(),
      retryable: true,
      context,
      publicationId
    }
  }

  /**
   * Crea error de Nano Banana
   */
  static createNanoBananaError(
    message: string,
    context: NanoBananaError['context'],
    publicationId?: string
  ): NanoBananaError {
    return {
      type: 'NANO_BANANA_API_FAILURE',
      message,
      timestamp: new Date(),
      retryable: true,
      context,
      publicationId
    }
  }

  /**
   * Crea error de validación
   */
  static createValidationError(
    message: string,
    field: string,
    value: any,
    constraint: string
  ): ValidationError {
    return {
      type: 'VALIDATION_ERROR',
      message,
      timestamp: new Date(),
      retryable: false,
      context: {
        field,
        value,
        constraint
      }
    }
  }

  /**
   * Crea error de rate limit
   */
  static createRateLimitError(
    message: string,
    limit: number,
    remaining: number,
    resetTime: Date,
    retryAfter?: number
  ): RateLimitError {
    return {
      type: 'RATE_LIMIT_ERROR',
      message,
      timestamp: new Date(),
      retryable: true,
      context: {
        limit,
        remaining,
        resetTime,
        retryAfter
      }
    }
  }

  /**
   * Crea error de red
   */
  static createNetworkError(
    message: string,
    context?: Record<string, any>
  ): GenerationError {
    return {
      type: 'NETWORK_ERROR',
      message,
      timestamp: new Date(),
      retryable: true,
      context
    }
  }

  /**
   * Crea error de timeout
   */
  static createTimeoutError(
    message: string,
    timeoutMs: number,
    operation: string
  ): GenerationError {
    return {
      type: 'TIMEOUT_ERROR',
      message,
      timestamp: new Date(),
      retryable: true,
      context: {
        timeoutMs,
        operation
      }
    }
  }

  /**
   * Convierte error genérico a GenerationError
   */
  static fromError(error: Error, type?: GenerationErrorType): GenerationError {
    return {
      type: type || 'UNKNOWN_ERROR',
      message: error.message,
      timestamp: new Date(),
      retryable: type ? this.isRetryableByDefault(type) : false,
      context: {
        originalError: error.name,
        stack: error.stack
      }
    }
  }

  /**
   * Determina si un tipo de error es retryable por defecto
   */
  private static isRetryableByDefault(type: GenerationErrorType): boolean {
    const retryableTypes: GenerationErrorType[] = [
      'GEMINI_API_FAILURE',
      'NANO_BANANA_API_FAILURE',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'TEMPORARY_UNAVAILABLE'
    ]
    
    return retryableTypes.includes(type)
  }
}

/**
 * Utilidades para manejo de errores
 */
export class ErrorUtils {
  /**
   * Determina si un error es crítico (no retryable)
   */
  static isCriticalError(error: GenerationError): boolean {
    const criticalTypes: GenerationErrorType[] = [
      'VALIDATION_ERROR',
      'RESOURCE_NOT_FOUND',
      'INSUFFICIENT_CREDITS'
    ]
    
    return criticalTypes.includes(error.type)
  }

  /**
   * Obtiene mensaje de error amigable para el usuario
   */
  static getUserFriendlyMessage(error: GenerationError): string {
    const messages: Record<GenerationErrorType, string> = {
      'GEMINI_API_FAILURE': 'Error temporal en el servicio de generación de texto. Reintentando...',
      'NANO_BANANA_API_FAILURE': 'Error temporal en el servicio de generación de imágenes. Reintentando...',
      'NETWORK_ERROR': 'Error de conexión. Verificando conectividad...',
      'TIMEOUT_ERROR': 'La operación está tomando más tiempo del esperado. Reintentando...',
      'RATE_LIMIT_ERROR': 'Límite de uso alcanzado. Esperando para continuar...',
      'VALIDATION_ERROR': 'Error en los datos proporcionados. Revisa la configuración.',
      'RESOURCE_NOT_FOUND': 'Recurso no encontrado. Verifica que el archivo existe.',
      'TEMPLATE_ERROR': 'Error en el template seleccionado. Intenta con otro template.',
      'CONTENT_TOO_LONG': 'El contenido generado es demasiado largo para la plataforma.',
      'INSUFFICIENT_CREDITS': 'Créditos insuficientes para completar la operación.',
      'TEMPORARY_UNAVAILABLE': 'Servicio temporalmente no disponible. Reintentando...',
      'UNKNOWN_ERROR': 'Error inesperado. Contacta soporte si persiste.'
    }

    return messages[error.type] || messages['UNKNOWN_ERROR']
  }

  /**
   * Calcula tiempo de espera recomendado antes del próximo intento
   */
  static getRecommendedRetryDelay(error: GenerationError, retryCount: number): number {
    const baseDelays: Record<GenerationErrorType, number> = {
      'GEMINI_API_FAILURE': 1000,
      'NANO_BANANA_API_FAILURE': 2000,
      'NETWORK_ERROR': 500,
      'TIMEOUT_ERROR': 1500,
      'RATE_LIMIT_ERROR': 5000,
      'VALIDATION_ERROR': 0, // No retryable
      'RESOURCE_NOT_FOUND': 0, // No retryable
      'TEMPLATE_ERROR': 0, // No retryable
      'CONTENT_TOO_LONG': 0, // No retryable
      'INSUFFICIENT_CREDITS': 0, // No retryable
      'TEMPORARY_UNAVAILABLE': 3000,
      'UNKNOWN_ERROR': 1000
    }

    const baseDelay = baseDelays[error.type] || 1000
    
    if (baseDelay === 0) return 0 // No retryable
    
    // Backoff exponencial con jitter
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1)
    const jitter = exponentialDelay * 0.1 * Math.random()
    
    return Math.min(exponentialDelay + jitter, 60000) // Máximo 1 minuto
  }

  /**
   * Serializa error para logging
   */
  static serializeError(error: GenerationError): string {
    return JSON.stringify({
      type: error.type,
      message: error.message,
      timestamp: error.timestamp.toISOString(),
      retryable: error.retryable,
      context: error.context,
      publicationId: error.publicationId,
      agentType: error.agentType,
      retryCount: error.retryCount
    }, null, 2)
  }

  /**
   * Deserializa error desde string JSON
   */
  static deserializeError(errorString: string): GenerationError {
    const parsed = JSON.parse(errorString)
    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp)
    }
  }
}