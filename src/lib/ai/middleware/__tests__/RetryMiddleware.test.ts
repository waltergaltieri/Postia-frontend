import { RetryMiddleware } from '../RetryMiddleware'
import { GenerationErrorFactory } from '../../types/errors'

describe('RetryMiddleware', () => {
  let retryMiddleware: RetryMiddleware

  beforeEach(() => {
    retryMiddleware = new RetryMiddleware({
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      jitterEnabled: false // Deshabilitado para tests predecibles
    })
  })

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success')
      
      const result = await retryMiddleware.executeWithRetry(
        mockOperation,
        'test-operation'
      )

      expect(result.success).toBe(true)
      expect(result.result).toBe('success')
      expect(result.context.attempt).toBe(1)
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue('success')

      const result = await retryMiddleware.executeWithRetry(
        mockOperation,
        'test-operation'
      )

      expect(result.success).toBe(true)
      expect(result.result).toBe('success')
      expect(result.context.attempt).toBe(3)
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should fail after max attempts', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'))

      await expect(
        retryMiddleware.executeWithRetry(mockOperation, 'test-operation')
      ).rejects.toThrow('RetryExhaustedError')

      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const validationError = GenerationErrorFactory.createValidationError(
        'Invalid input',
        'prompt',
        '',
        'required'
      )
      
      const mockOperation = jest.fn().mockRejectedValue(validationError)

      await expect(
        retryMiddleware.executeWithRetry(mockOperation, 'test-operation')
      ).rejects.toThrow('Invalid input')

      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should apply exponential backoff', async () => {
      const delays: number[] = []
      const originalSetTimeout = global.setTimeout
      
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay)
        return originalSetTimeout(callback, 0) // Execute immediately for test
      }) as any

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success')

      await retryMiddleware.executeWithRetry(mockOperation, 'test-operation')

      expect(delays).toEqual([100, 200]) // baseDelay * 2^(attempt-1)
      
      global.setTimeout = originalSetTimeout
    })

    it('should respect max delay', async () => {
      const retryMiddlewareWithLowMax = new RetryMiddleware({
        maxAttempts: 5,
        baseDelay: 100,
        maxDelay: 150,
        backoffMultiplier: 2,
        jitterEnabled: false
      })

      const delays: number[] = []
      const originalSetTimeout = global.setTimeout
      
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay)
        return originalSetTimeout(callback, 0)
      }) as any

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success')

      await retryMiddlewareWithLowMax.executeWithRetry(mockOperation, 'test-operation')

      // Delays should be capped at maxDelay (150)
      expect(delays).toEqual([100, 150, 150, 150])
      
      global.setTimeout = originalSetTimeout
    })
  })

  describe('error classification', () => {
    it('should classify network errors as retryable', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network connection failed'))

      await expect(
        retryMiddleware.executeWithRetry(mockOperation, 'test-operation')
      ).rejects.toThrow('RetryExhaustedError')

      expect(mockOperation).toHaveBeenCalledTimes(3) // Should retry
    })

    it('should classify timeout errors as retryable', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Request timeout'))

      await expect(
        retryMiddleware.executeWithRetry(mockOperation, 'test-operation')
      ).rejects.toThrow('RetryExhaustedError')

      expect(mockOperation).toHaveBeenCalledTimes(3) // Should retry
    })

    it('should classify rate limit errors as retryable', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Rate limit exceeded'))

      await expect(
        retryMiddleware.executeWithRetry(mockOperation, 'test-operation')
      ).rejects.toThrow('RetryExhaustedError')

      expect(mockOperation).toHaveBeenCalledTimes(3) // Should retry
    })

    it('should classify validation errors as non-retryable', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Invalid request format'))

      await expect(
        retryMiddleware.executeWithRetry(mockOperation, 'test-operation')
      ).rejects.toThrow('Invalid request format')

      expect(mockOperation).toHaveBeenCalledTimes(1) // Should not retry
    })
  })

  describe('factory methods', () => {
    it('should create text generation configuration', () => {
      const textRetry = RetryMiddleware.forTextGeneration()
      const config = textRetry.getConfig()

      expect(config.maxAttempts).toBe(3)
      expect(config.baseDelay).toBe(1000)
      expect(config.retryableErrors).toContain('GEMINI_API_FAILURE')
    })

    it('should create image generation configuration', () => {
      const imageRetry = RetryMiddleware.forImageGeneration()
      const config = imageRetry.getConfig()

      expect(config.maxAttempts).toBe(4)
      expect(config.baseDelay).toBe(2000)
      expect(config.retryableErrors).toContain('NANO_BANANA_API_FAILURE')
    })

    it('should create conservative configuration', () => {
      const conservativeRetry = RetryMiddleware.conservative()
      const config = conservativeRetry.getConfig()

      expect(config.maxAttempts).toBe(2)
      expect(config.baseDelay).toBe(500)
      expect(config.jitterEnabled).toBe(false)
    })

    it('should create aggressive configuration', () => {
      const aggressiveRetry = RetryMiddleware.aggressive()
      const config = aggressiveRetry.getConfig()

      expect(config.maxAttempts).toBe(5)
      expect(config.baseDelay).toBe(2000)
      expect(config.retryableErrors).toContain('UNKNOWN_ERROR')
    })
  })

  describe('configuration updates', () => {
    it('should update configuration', () => {
      retryMiddleware.updateConfig({
        maxAttempts: 5,
        baseDelay: 500
      })

      const config = retryMiddleware.getConfig()
      expect(config.maxAttempts).toBe(5)
      expect(config.baseDelay).toBe(500)
    })

    it('should preserve existing configuration when updating', () => {
      const originalConfig = retryMiddleware.getConfig()
      
      retryMiddleware.updateConfig({
        maxAttempts: 5
      })

      const updatedConfig = retryMiddleware.getConfig()
      expect(updatedConfig.maxAttempts).toBe(5)
      expect(updatedConfig.baseDelay).toBe(originalConfig.baseDelay)
      expect(updatedConfig.backoffMultiplier).toBe(originalConfig.backoffMultiplier)
    })
  })

  describe('jitter functionality', () => {
    it('should apply jitter when enabled', async () => {
      const jitterRetry = new RetryMiddleware({
        maxAttempts: 3,
        baseDelay: 1000,
        jitterEnabled: true
      })

      const delays: number[] = []
      const originalSetTimeout = global.setTimeout
      
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay)
        return originalSetTimeout(callback, 0)
      }) as any

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success')

      await jitterRetry.executeWithRetry(mockOperation, 'test-operation')

      // With jitter, delays should vary from base values
      expect(delays.length).toBe(2)
      expect(delays[0]).toBeGreaterThan(900) // Base 1000 with ±10% jitter
      expect(delays[0]).toBeLessThan(1100)
      expect(delays[1]).toBeGreaterThan(1800) // Base 2000 with ±10% jitter
      expect(delays[1]).toBeLessThan(2200)
      
      global.setTimeout = originalSetTimeout
    })
  })

  describe('custom retry configuration', () => {
    it('should use custom configuration for specific operation', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success')

      const result = await retryMiddleware.executeWithRetry(
        mockOperation,
        'test-operation',
        { maxAttempts: 1 } // Override to only 1 attempt
      )

      // Should fail because we only allow 1 attempt but need 2
      await expect(
        retryMiddleware.executeWithRetry(
          jest.fn().mockRejectedValue(new Error('Network error')),
          'test-operation',
          { maxAttempts: 1 }
        )
      ).rejects.toThrow()
    })
  })

  describe('context tracking', () => {
    it('should track retry context correctly', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue('success')

      const result = await retryMiddleware.executeWithRetry(
        mockOperation,
        'test-operation'
      )

      expect(result.context.attempt).toBe(3)
      expect(result.context.totalAttempts).toBe(3)
      expect(result.context.delays).toHaveLength(2)
      expect(result.context.startTime).toBeDefined()
    })

    it('should include last error in context on failure', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'))

      try {
        await retryMiddleware.executeWithRetry(mockOperation, 'test-operation')
      } catch (error) {
        expect(error.message).toContain('Persistent error')
        expect(error.message).toContain('Failed after 3 attempts')
        expect(error.name).toBe('RetryExhaustedError')
      }
    })
  })
})