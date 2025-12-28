import { GenerationError, GenerationErrorType } from '../types/errors'

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: GenerationErrorType[]
  jitterEnabled: boolean
}

export interface RetryContext {
  attempt: number
  totalAttempts: number
  lastError?: Error
  startTime: number
  delays: number[]
}

export interface RetryResult<T> {
  result: T
  context: RetryContext
  success: boolean
}

/**
 * Middleware de reintentos robusto para APIs de Gemini
 * Implementa backoff exponencial con jitter y límites configurables
 */
export class RetryMiddleware {
  private config: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      baseDelay: config.baseDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      retryableErrors: config.retryableErrors ?? [
        'GEMINI_API_FAILURE',
        'NANO_BANANA_API_FAILURE',
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'RATE_LIMIT_ERROR',
        'TEMPORARY_UNAVAILABLE'
      ],
      jitterEnabled: config.jitterEnabled ?? true
    }
  }

  /**
   * Ejecuta una función con reintentos automáticos
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const effectiveConfig = { ...this.config, ...customConfig }
    const context: RetryContext = {
      attempt: 0,
      totalAttempts: effectiveConfig.maxAttempts,
      startTime: Date.now(),
      delays: []
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= effectiveConfig.maxAttempts; attempt++) {
      context.attempt = attempt

      try {
        console.log(`🔄 [${operationName}] Attempt ${attempt}/${effectiveConfig.maxAttempts}`)
        
        const result = await operation()
        
        console.log(`✅ [${operationName}] Success on attempt ${attempt}`)
        
        return {
          result,
          context,
          success: true
        }

      } catch (error) {
        lastError = error as Error
        context.lastError = lastError

        const generationError = this.classifyError(lastError)
        const isRetryable = this.isErrorRetryable(generationError, effectiveConfig)
        
        console.warn(`❌ [${operationName}] Attempt ${attempt} failed:`, {
          error: lastError.message,
          type: generationError.type,
          retryable: isRetryable
        })

        // Si no es retryable o es el último intento, lanzar error
        if (!isRetryable || attempt === effectiveConfig.maxAttempts) {
          console.error(`🚫 [${operationName}] All attempts failed or error not retryable`)
          throw this.createFinalError(lastError, context, operationName)
        }

        // Calcular delay para próximo intento
        const delay = this.calculateDelay(attempt, effectiveConfig)
        context.delays.push(delay)

        console.log(`⏳ [${operationName}] Waiting ${delay}ms before retry...`)
        await this.sleep(delay)
      }
    }

    // Esto nunca debería ejecutarse, pero por seguridad
    throw this.createFinalError(lastError!, context, operationName)
  }

  /**
   * Calcula el delay para el próximo intento usando backoff exponencial con jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Backoff exponencial: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
    
    // Aplicar límite máximo
    delay = Math.min(delay, config.maxDelay)
    
    // Aplicar jitter para evitar thundering herd
    if (config.jitterEnabled) {
      const jitter = delay * 0.1 * Math.random() // ±10% jitter
      delay = delay + (Math.random() > 0.5 ? jitter : -jitter)
    }
    
    return Math.max(delay, 0)
  }

  /**
   * Clasifica el error para determinar el tipo de fallo
   */
  private classifyError(error: Error): GenerationError {
    const message = error.message.toLowerCase()
    
    // Errores de red
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return {
        type: 'NETWORK_ERROR',
        message: error.message,
        timestamp: new Date(),
        retryable: true,
        context: { originalError: error.name }
      }
    }
    
    // Errores de timeout
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        type: 'TIMEOUT_ERROR',
        message: error.message,
        timestamp: new Date(),
        retryable: true,
        context: { originalError: error.name }
      }
    }
    
    // Errores de rate limiting
    if (message.includes('rate limit') || message.includes('quota') || message.includes('429')) {
      return {
        type: 'RATE_LIMIT_ERROR',
        message: error.message,
        timestamp: new Date(),
        retryable: true,
        context: { originalError: error.name }
      }
    }
    
    // Errores específicos de Gemini
    if (message.includes('gemini') || message.includes('generativelanguage')) {
      return {
        type: 'GEMINI_API_FAILURE',
        message: error.message,
        timestamp: new Date(),
        retryable: true,
        context: { originalError: error.name }
      }
    }
    
    // Errores específicos de Nano Banana
    if (message.includes('nano banana') || message.includes('image generation')) {
      return {
        type: 'NANO_BANANA_API_FAILURE',
        message: error.message,
        timestamp: new Date(),
        retryable: true,
        context: { originalError: error.name }
      }
    }
    
    // Errores de validación (no retryables)
    if (message.includes('validation') || message.includes('invalid') || message.includes('malformed')) {
      return {
        type: 'VALIDATION_ERROR',
        message: error.message,
        timestamp: new Date(),
        retryable: false,
        context: { originalError: error.name }
      }
    }
    
    // Error genérico
    return {
      type: 'UNKNOWN_ERROR',
      message: error.message,
      timestamp: new Date(),
      retryable: false,
      context: { originalError: error.name }
    }
  }

  /**
   * Determina si un error es retryable según la configuración
   */
  private isErrorRetryable(error: GenerationError, config: RetryConfig): boolean {
    return error.retryable && config.retryableErrors.includes(error.type)
  }

  /**
   * Crea error final con contexto completo de reintentos
   */
  private createFinalError(lastError: Error, context: RetryContext, operationName: string): Error {
    const totalTime = Date.now() - context.startTime
    const avgDelay = context.delays.length > 0 
      ? context.delays.reduce((a, b) => a + b, 0) / context.delays.length 
      : 0

    const errorMessage = `
[${operationName}] Failed after ${context.attempt} attempts in ${totalTime}ms
Last error: ${lastError.message}
Average delay: ${avgDelay.toFixed(0)}ms
Delays: [${context.delays.join(', ')}]ms
    `.trim()

    const finalError = new Error(errorMessage) as Error & { cause?: Error }
    finalError.name = 'RetryExhaustedError'
    finalError.cause = lastError

    return finalError
  }

  /**
   * Función de sleep promisificada
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Actualiza la configuración de reintentos
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }

  /**
   * Crea una instancia con configuración específica para texto
   */
  static forTextGeneration(): RetryMiddleware {
    return new RetryMiddleware({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      retryableErrors: [
        'GEMINI_API_FAILURE',
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'RATE_LIMIT_ERROR',
        'TEMPORARY_UNAVAILABLE'
      ],
      jitterEnabled: true
    })
  }

  /**
   * Crea una instancia con configuración específica para imágenes
   */
  static forImageGeneration(): RetryMiddleware {
    return new RetryMiddleware({
      maxAttempts: 4, // Más intentos para imágenes
      baseDelay: 2000, // Delay mayor para imágenes
      maxDelay: 60000, // Máximo mayor para imágenes
      backoffMultiplier: 2.5,
      retryableErrors: [
        'NANO_BANANA_API_FAILURE',
        'GEMINI_API_FAILURE',
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'RATE_LIMIT_ERROR',
        'TEMPORARY_UNAVAILABLE'
      ],
      jitterEnabled: true
    })
  }

  /**
   * Crea una instancia con configuración conservadora
   */
  static conservative(): RetryMiddleware {
    return new RetryMiddleware({
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 1.5,
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR'
      ],
      jitterEnabled: false
    })
  }

  /**
   * Crea una instancia con configuración agresiva
   */
  static aggressive(): RetryMiddleware {
    return new RetryMiddleware({
      maxAttempts: 5,
      baseDelay: 2000,
      maxDelay: 120000,
      backoffMultiplier: 3,
      retryableErrors: [
        'GEMINI_API_FAILURE',
        'NANO_BANANA_API_FAILURE',
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'RATE_LIMIT_ERROR',
        'TEMPORARY_UNAVAILABLE',
        'UNKNOWN_ERROR'
      ],
      jitterEnabled: true
    })
  }
}

/**
 * Instancia global por defecto
 */
export const defaultRetryMiddleware = new RetryMiddleware()

/**
 * Decorator para aplicar reintentos automáticamente a métodos
 */
export function withRetry(config?: Partial<RetryConfig>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const retryMiddleware = new RetryMiddleware(config)

    descriptor.value = async function (...args: any[]) {
      const operationName = `${target.constructor.name}.${propertyName}`
      
      const result = await retryMiddleware.executeWithRetry(
        () => method.apply(this, args),
        operationName
      )
      
      return result.result
    }

    return descriptor
  }
}