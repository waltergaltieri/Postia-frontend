import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getGeminiConfig, validateGeminiConfig, getValidatedGeminiConfig, GeminiConfig } from '../gemini-config'

describe('Gemini Configuration', () => {
  const originalEnv = process.env
  const originalWindow = global.window

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv }
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = originalEnv
    global.window = originalWindow
    vi.restoreAllMocks()
  })

  describe('getGeminiConfig', () => {
    it('should get config from server environment', () => {
      process.env.GEMINI_API_KEY = 'AIza-server-key'
      process.env.GEMINI_BASE_URL = 'https://custom-gemini.googleapis.com/v1beta'
      process.env.GEMINI_DEFAULT_MODEL = 'gemini-custom'
      process.env.GEMINI_MAX_RETRIES = '5'
      process.env.GEMINI_RETRY_DELAY = '2000'
      process.env.GEMINI_TIMEOUT = '60000'

      // Simulate server environment
      delete (global as any).window

      const config = getGeminiConfig()

      expect(config.apiKey).toBe('AIza-server-key')
      expect(config.baseUrl).toBe('https://custom-gemini.googleapis.com/v1beta')
      expect(config.defaultModel).toBe('gemini-custom')
      expect(config.maxRetries).toBe(5)
      expect(config.retryDelay).toBe(2000)
      expect(config.timeout).toBe(60000)
    })

    it('should get config from client environment', () => {
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'AIza-client-key'
      
      // Simulate client environment
      global.window = {} as any

      const config = getGeminiConfig()

      expect(config.apiKey).toBe('AIza-client-key')
    })

    it('should use default values when environment variables are not set', () => {
      process.env.GEMINI_API_KEY = 'AIza-test-key'
      delete (global as any).window

      const config = getGeminiConfig()

      expect(config.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta')
      expect(config.defaultModel).toBe('gemini-2.5-flash')
      expect(config.proModel).toBe('gemini-2.5-pro')
      expect(config.visionModel).toBe('gemini-2.5-flash')
      expect(config.maxRetries).toBe(3)
      expect(config.retryDelay).toBe(1000)
      expect(config.timeout).toBe(30000)
    })

    it('should throw error when API key is missing', () => {
      delete process.env.GEMINI_API_KEY
      delete process.env.NEXT_PUBLIC_GEMINI_API_KEY
      delete (global as any).window

      expect(() => getGeminiConfig()).toThrow('GEMINI_API_KEY environment variable is required')
      expect(console.error).toHaveBeenCalledWith('❌ GEMINI_API_KEY no está configurada')
    })

    it('should throw error when API key has invalid format', () => {
      process.env.GEMINI_API_KEY = 'invalid-key-format'
      delete (global as any).window

      expect(() => getGeminiConfig()).toThrow('Invalid GEMINI_API_KEY format')
      expect(console.error).toHaveBeenCalledWith('❌ GEMINI_API_KEY no tiene el formato correcto')
    })

    it('should prefer server key over client key in server environment', () => {
      process.env.GEMINI_API_KEY = 'AIza-server-key'
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'AIza-client-key'
      delete (global as any).window

      const config = getGeminiConfig()

      expect(config.apiKey).toBe('AIza-server-key')
    })

    it('should fallback to client key when server key is missing', () => {
      delete process.env.GEMINI_API_KEY
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'AIza-client-key'
      delete (global as any).window

      const config = getGeminiConfig()

      expect(config.apiKey).toBe('AIza-client-key')
    })

    it('should parse numeric environment variables correctly', () => {
      process.env.GEMINI_API_KEY = 'AIza-test-key'
      process.env.GEMINI_MAX_RETRIES = 'invalid-number'
      process.env.GEMINI_RETRY_DELAY = '2500'
      process.env.GEMINI_TIMEOUT = 'another-invalid'
      delete (global as any).window

      const config = getGeminiConfig()

      expect(config.maxRetries).toBe(NaN) // parseInt of invalid string
      expect(config.retryDelay).toBe(2500)
      expect(config.timeout).toBe(NaN)
    })

    it('should log success message when configuration is valid', () => {
      process.env.GEMINI_API_KEY = 'AIza-valid-key'
      delete (global as any).window

      getGeminiConfig()

      expect(console.log).toHaveBeenCalledWith('✅ Gemini API Key configurada correctamente')
    })
  })

  describe('validateGeminiConfig', () => {
    const validConfig: GeminiConfig = {
      apiKey: 'AIza-valid-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: 'gemini-2.5-flash',
      proModel: 'gemini-2.5-pro',
      visionModel: 'gemini-2.5-flash',
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000
    }

    it('should validate correct configuration', () => {
      const isValid = validateGeminiConfig(validConfig)

      expect(isValid).toBe(true)
      expect(console.log).toHaveBeenCalledWith('✅ Configuración de Gemini válida')
    })

    it('should reject configuration with invalid API key', () => {
      const invalidConfig = { ...validConfig, apiKey: 'invalid-key' }

      const isValid = validateGeminiConfig(invalidConfig)

      expect(isValid).toBe(false)
      expect(console.error).toHaveBeenCalledWith('❌ API Key inválida')
    })

    it('should reject configuration with empty API key', () => {
      const invalidConfig = { ...validConfig, apiKey: '' }

      const isValid = validateGeminiConfig(invalidConfig)

      expect(isValid).toBe(false)
      expect(console.error).toHaveBeenCalledWith('❌ API Key inválida')
    })

    it('should reject configuration with invalid base URL', () => {
      const invalidConfig = { ...validConfig, baseUrl: 'http://insecure-url.com' }

      const isValid = validateGeminiConfig(invalidConfig)

      expect(isValid).toBe(false)
      expect(console.error).toHaveBeenCalledWith('❌ Base URL inválida')
    })

    it('should reject configuration with empty base URL', () => {
      const invalidConfig = { ...validConfig, baseUrl: '' }

      const isValid = validateGeminiConfig(invalidConfig)

      expect(isValid).toBe(false)
      expect(console.error).toHaveBeenCalledWith('❌ Base URL inválida')
    })

    it('should reject configuration with empty default model', () => {
      const invalidConfig = { ...validConfig, defaultModel: '' }

      const isValid = validateGeminiConfig(invalidConfig)

      expect(isValid).toBe(false)
      expect(console.error).toHaveBeenCalledWith('❌ Modelo por defecto no especificado')
    })

    it('should handle validation errors gracefully', () => {
      const invalidConfig = null as any

      const isValid = validateGeminiConfig(invalidConfig)

      expect(isValid).toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        '❌ Error validando configuración de Gemini:',
        expect.any(Error)
      )
    })

    it('should accept HTTPS base URLs', () => {
      const httpsConfig = { ...validConfig, baseUrl: 'https://custom-gemini.example.com/api' }

      const isValid = validateGeminiConfig(httpsConfig)

      expect(isValid).toBe(true)
    })
  })

  describe('getValidatedGeminiConfig', () => {
    it('should return validated configuration when valid', () => {
      process.env.GEMINI_API_KEY = 'AIza-valid-key'
      delete (global as any).window

      const config = getValidatedGeminiConfig()

      expect(config.apiKey).toBe('AIza-valid-key')
      expect(config.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta')
      expect(config.defaultModel).toBe('gemini-2.5-flash')
    })

    it('should throw error when configuration is invalid', () => {
      process.env.GEMINI_API_KEY = 'invalid-key-format'
      delete (global as any).window

      expect(() => getValidatedGeminiConfig()).toThrow('Invalid GEMINI_API_KEY format')
    })

    it('should throw error when validation fails', () => {
      // Mock getGeminiConfig to return invalid config that passes initial checks
      // but fails validation
      process.env.GEMINI_API_KEY = 'AIza-test-key'
      process.env.GEMINI_BASE_URL = 'invalid-url'
      delete (global as any).window

      expect(() => getValidatedGeminiConfig()).toThrow('Invalid Gemini configuration')
    })

    it('should work with custom environment variables', () => {
      process.env.GEMINI_API_KEY = 'AIza-custom-key'
      process.env.GEMINI_BASE_URL = 'https://custom.googleapis.com/v2'
      process.env.GEMINI_DEFAULT_MODEL = 'gemini-custom-model'
      process.env.GEMINI_PRO_MODEL = 'gemini-pro-custom'
      process.env.GEMINI_VISION_MODEL = 'gemini-vision-custom'
      process.env.GEMINI_MAX_RETRIES = '7'
      process.env.GEMINI_RETRY_DELAY = '3000'
      process.env.GEMINI_TIMEOUT = '45000'
      delete (global as any).window

      const config = getValidatedGeminiConfig()

      expect(config.apiKey).toBe('AIza-custom-key')
      expect(config.baseUrl).toBe('https://custom.googleapis.com/v2')
      expect(config.defaultModel).toBe('gemini-custom-model')
      expect(config.proModel).toBe('gemini-pro-custom')
      expect(config.visionModel).toBe('gemini-vision-custom')
      expect(config.maxRetries).toBe(7)
      expect(config.retryDelay).toBe(3000)
      expect(config.timeout).toBe(45000)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined window object gracefully', () => {
      process.env.GEMINI_API_KEY = 'AIza-test-key'
      global.window = undefined as any

      const config = getGeminiConfig()

      expect(config.apiKey).toBe('AIza-test-key')
    })

    it('should handle window object without affecting server logic', () => {
      process.env.GEMINI_API_KEY = 'AIza-server-key'
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'AIza-client-key'
      global.window = {} as any

      const config = getGeminiConfig()

      expect(config.apiKey).toBe('AIza-client-key') // Client environment
    })

    it('should handle missing environment variables gracefully', () => {
      process.env.GEMINI_API_KEY = 'AIza-test-key'
      delete process.env.GEMINI_BASE_URL
      delete process.env.GEMINI_DEFAULT_MODEL
      delete process.env.GEMINI_MAX_RETRIES
      delete (global as any).window

      const config = getGeminiConfig()

      expect(config.apiKey).toBe('AIza-test-key')
      expect(config.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta')
      expect(config.defaultModel).toBe('gemini-2.5-flash')
      expect(config.maxRetries).toBe(3)
    })

    it('should handle API key with different valid prefixes', () => {
      // Test with different valid API key formats
      const validKeys = [
        'AIza-standard-key',
        'AIzaSyABC123', // Real format example
        'AIzaXYZ789'
      ]

      validKeys.forEach(key => {
        process.env.GEMINI_API_KEY = key
        delete (global as any).window

        expect(() => getGeminiConfig()).not.toThrow()
        
        const config = getGeminiConfig()
        expect(config.apiKey).toBe(key)
      })
    })

    it('should reject API keys with invalid prefixes', () => {
      const invalidKeys = [
        'sk-invalid-key',
        'Bearer token',
        'abc123',
        'GEMINI_KEY_123'
      ]

      invalidKeys.forEach(key => {
        process.env.GEMINI_API_KEY = key
        delete (global as any).window

        expect(() => getGeminiConfig()).toThrow('Invalid GEMINI_API_KEY format')
      })
    })
  })

  describe('Configuration Completeness', () => {
    it('should include all required configuration fields', () => {
      process.env.GEMINI_API_KEY = 'AIza-test-key'
      delete (global as any).window

      const config = getGeminiConfig()

      expect(config).toHaveProperty('apiKey')
      expect(config).toHaveProperty('baseUrl')
      expect(config).toHaveProperty('defaultModel')
      expect(config).toHaveProperty('proModel')
      expect(config).toHaveProperty('visionModel')
      expect(config).toHaveProperty('maxRetries')
      expect(config).toHaveProperty('retryDelay')
      expect(config).toHaveProperty('timeout')
    })

    it('should have reasonable default values', () => {
      process.env.GEMINI_API_KEY = 'AIza-test-key'
      delete (global as any).window

      const config = getGeminiConfig()

      expect(config.maxRetries).toBeGreaterThan(0)
      expect(config.retryDelay).toBeGreaterThan(0)
      expect(config.timeout).toBeGreaterThan(0)
      expect(config.baseUrl).toMatch(/^https:\/\//)
      expect(config.defaultModel).toBeTruthy()
      expect(config.proModel).toBeTruthy()
      expect(config.visionModel).toBeTruthy()
    })
  })
})