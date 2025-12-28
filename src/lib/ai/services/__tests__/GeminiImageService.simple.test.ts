import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiImageService } from '../GeminiImageService'
import { createMockResource, createMockTemplate } from './test-utils'
import * as geminiConfig from '../../config/gemini-config'

// Mock the Gemini config
vi.mock('../../config/gemini-config', () => ({
  getValidatedGeminiConfig: vi.fn(() => ({
    apiKey: 'AIza-test-key',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    proModel: 'gemini-2.5-pro',
    visionModel: 'gemini-2.5-flash',
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000
  }))
}))

describe('GeminiImageService - Core Functionality', () => {
  let service: GeminiImageService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new GeminiImageService()
    
    // Mock the simulation method to be much faster and respect platform dimensions
    service['simulateNanoBananaCall'] = vi.fn().mockImplementation(async (payload: any) => {
      await new Promise(resolve => setTimeout(resolve, 10)) // Very fast
      return {
        imageUrl: `https://generated-images.nano-banana.com/test-${Date.now()}.jpg`,
        width: payload.dimensions?.width || 1080,
        height: payload.dimensions?.height || 1080,
        format: 'jpeg',
        sizeBytes: 300000,
        jobId: `nb_test_${Date.now()}`
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Configuration', () => {
    it('should initialize correctly', () => {
      expect(service).toBeInstanceOf(GeminiImageService)
    })

    it('should have platform dimensions', () => {
      const dims = service.getPlatformDimensions('instagram')
      expect(dims).toEqual({ width: 1080, height: 1080, ratio: '1:1' })
    })

    it('should validate resources', () => {
      const validResource = createMockResource()
      const invalidResource = createMockResource({ mimeType: 'text/plain' })
      
      expect(service.validateResource(validResource)).toBe(true)
      expect(service.validateResource(invalidResource)).toBe(false)
    })
  })

  describe('Simple Image Generation', () => {
    it('should generate simple image', async () => {
      const result = await service.generateSimpleImage({
        contentIdea: 'Test content',
        platform: 'instagram'
      })

      expect(result.imageUrl).toMatch(/^https:\/\/generated-images\.nano-banana\.com\//)
      expect(result.width).toBe(1080)
      expect(result.height).toBe(1080)
      expect(result.metadata.model).toBe('nano-banana-v2')
    })

    it('should handle different platforms', async () => {
      const result = await service.generateSimpleImage({
        contentIdea: 'Test content',
        platform: 'linkedin'
      })

      expect(result.width).toBe(1200)
      expect(result.height).toBe(627)
    })
  })

  describe('Template Image Generation', () => {
    it('should generate template image', async () => {
      const template = createMockTemplate()
      const resource = createMockResource()

      const result = await service.generateTemplateImage({
        contentIdea: 'Test template',
        template,
        baseResource: resource,
        textOverlays: { title: 'Test Title' },
        platform: 'instagram'
      })

      expect(result.imageUrl).toBeDefined()
      expect(result.metadata.model).toBe('nano-banana-template-v2')
    })
  })

  describe('Error Handling', () => {
    it('should handle generation errors', async () => {
      service.setRetryConfig(1, 100) // Reduce retries for faster test
      service['simulateNanoBananaCall'] = vi.fn().mockRejectedValue(new Error('Generation failed'))

      await expect(service.generateSimpleImage({
        contentIdea: 'Test',
        platform: 'instagram'
      })).rejects.toThrow('Failed to generate simple image')
    }, 10000)
  })

  describe('Utility Methods', () => {
    it('should estimate generation times', () => {
      expect(service.estimateGenerationTime('simple')).toBe(15000)
      expect(service.estimateGenerationTime('template')).toBe(30000)
      expect(service.estimateGenerationTime('carousel', 3)).toBe(95000)
    })

    it('should provide service stats', () => {
      const stats = service.getServiceStats()
      expect(stats.platformDimensions).toBeDefined()
      expect(stats.retryConfig).toBeDefined()
      expect(stats.endpoint).toContain('nano-banana')
    })

    it('should check service health', async () => {
      const health = await service.checkServiceHealth()
      expect(health.status).toBe('online')
      expect(health.latency).toBeGreaterThan(0)
    })
  })
})