import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiService, NanoBananaService } from '../index'
import type { BrandManual, ContentDescription, Resource, Template } from '../../database/types'

// Mock environment variables
vi.mock('process', () => ({
  env: {
    GEMINI_API_KEY: 'test-gemini-key',
    NANO_BANANA_API_KEY: 'test-nano-banana-key'
  }
}))

// Mock fetch
global.fetch = vi.fn()

describe('AI Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GeminiService', () => {
    it('should create service with API key', () => {
      const service = new GeminiService({ apiKey: 'test-key' })
      expect(service).toBeInstanceOf(GeminiService)
    })

    it('should build descriptions prompt correctly', async () => {
      const service = new GeminiService({ apiKey: 'test-key' })
      
      const mockBrandManual: BrandManual = {
        id: '1',
        workspaceId: '1',
        brandVoice: 'Professional and friendly',
        brandValues: ['Innovation', 'Quality'],
        targetAudience: 'Tech professionals',
        keyMessages: ['Leading technology', 'Customer first'],
        dosDonts: {
          dos: ['Use clear language'],
          donts: ['Avoid jargon']
        },
        colorPalette: ['#000000', '#FFFFFF'],
        typography: 'Arial',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const params = {
        campaignObjective: 'Increase brand awareness',
        campaignInstructions: 'Create engaging content',
        brandManual: mockBrandManual,
        platformDistribution: { instagram: 50, linkedin: 50, twitter: 0, facebook: 0 },
        dateRange: { start: new Date(), end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        publicationsPerDay: 1
      }

      // Mock successful API response
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                descriptions: [{
                  platform: 'instagram',
                  contentType: 'text_simple',
                  description: 'Test description'
                }]
              })
            }]
          }
        }]
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.generateContentDescriptions(params)
      
      expect(result).toHaveLength(1)
      expect(result[0].platform).toBe('instagram')
      expect(result[0].contentType).toBe('text_simple')
      expect(result[0].description).toBe('Test description')
    })

    it('should handle API errors gracefully', async () => {
      const service = new GeminiService({ apiKey: 'test-key' })
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Unauthorized' } })
      })

      const mockBrandManual: BrandManual = {
        id: '1',
        workspaceId: '1',
        brandVoice: 'Professional',
        brandValues: ['Quality'],
        targetAudience: 'Professionals',
        keyMessages: ['Excellence'],
        dosDonts: {
          dos: ['Be clear'],
          donts: ['Avoid confusion']
        },
        colorPalette: ['#000000'],
        typography: 'Arial',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const params = {
        campaignObjective: 'Test',
        campaignInstructions: 'Test',
        brandManual: mockBrandManual,
        platformDistribution: { instagram: 100, linkedin: 0, twitter: 0, facebook: 0 },
        dateRange: { start: new Date(), end: new Date() },
        publicationsPerDay: 1
      }

      await expect(service.generateContentDescriptions(params))
        .rejects.toThrow('Failed to generate content descriptions')
    })
  })

  describe('NanoBananaService', () => {
    it('should create service with API key', () => {
      const service = new NanoBananaService({ apiKey: 'test-key' })
      expect(service).toBeInstanceOf(NanoBananaService)
    })

    it('should validate resources correctly', () => {
      const service = new NanoBananaService({ apiKey: 'test-key' })
      
      const validResource: Resource = {
        id: '1',
        workspaceId: '1',
        name: 'test.jpg',
        originalName: 'test.jpg',
        filePath: '/path/test.jpg',
        url: 'http://example.com/test.jpg',
        type: 'image',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
        width: 800,
        height: 600,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const invalidResource: Resource = {
        ...validResource,
        mimeType: 'video/mp4'
      }

      expect(service.validateResource(validResource)).toBe(true)
      expect(service.validateResource(invalidResource)).toBe(false)
    })

    it('should estimate generation time correctly', () => {
      const service = new NanoBananaService({ apiKey: 'test-key' })
      
      expect(service.estimateGenerationTime('simple')).toBe(15000)
      expect(service.estimateGenerationTime('template')).toBe(30000)
      expect(service.estimateGenerationTime('carousel', 3)).toBe(85000) // 45000 + 2 * 20000
    })

    it('should get platform dimensions correctly', () => {
      const service = new NanoBananaService({ apiKey: 'test-key' })
      
      // Access private method through any cast for testing
      const dimensions = (service as any).getPlatformDimensions('instagram')
      expect(dimensions).toEqual({ width: 1080, height: 1080 })
    })
  })
})