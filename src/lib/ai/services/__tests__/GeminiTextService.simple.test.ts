import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiTextService } from '../GeminiTextService'
import { createMockBrandManual, setupSuccessfulFetchMock, setupErrorFetchMock } from './test-utils'
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

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('GeminiTextService - Core Functionality', () => {
  let service: GeminiTextService
  let mockBrandManual: any

  beforeEach(() => {
    vi.clearAllMocks()
    service = new GeminiTextService()
    mockBrandManual = createMockBrandManual()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Configuration', () => {
    it('should initialize correctly', () => {
      expect(service).toBeInstanceOf(GeminiTextService)
    })

    it('should have platform limits', () => {
      expect(service.getPlatformLimit('instagram')).toBe(2200)
      expect(service.getPlatformLimit('twitter')).toBe(280)
      expect(service.getPlatformLimit('linkedin')).toBe(3000)
    })

    it('should validate text length', () => {
      expect(service.validateTextLength('Short text', 'twitter')).toBe(true)
      expect(service.validateTextLength('a'.repeat(300), 'twitter')).toBe(false)
    })
  })

  describe('Social Text Generation', () => {
    it('should generate social text successfully', async () => {
      setupSuccessfulFetchMock(mockFetch, 'Generated social media content')

      const result = await service.generateSocialText({
        contentIdea: 'Product launch',
        platform: 'instagram',
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })

      expect(result.text).toBe('Generated social media content')
      expect(result.platform).toBe('instagram')
      expect(result.withinLimits).toBe(true)
      expect(result.metadata.model).toBe('gemini-2.5-flash')
    })

    it('should handle different platforms', async () => {
      setupSuccessfulFetchMock(mockFetch, 'LinkedIn content')

      const result = await service.generateSocialText({
        contentIdea: 'Professional update',
        platform: 'linkedin',
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })

      expect(result.platform).toBe('linkedin')
      expect(result.text).toBe('LinkedIn content')
    })

    it('should detect text length violations', async () => {
      const longText = 'a'.repeat(3000)
      setupSuccessfulFetchMock(mockFetch, longText)

      const result = await service.generateSocialText({
        contentIdea: 'Long content',
        platform: 'instagram',
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })

      expect(result.withinLimits).toBe(false)
      expect(result.characterCount).toBe(3000)
    })
  })

  describe('Template Text Generation', () => {
    it('should generate template texts', async () => {
      const jsonResponse = JSON.stringify({
        title: 'Amazing Product',
        subtitle: 'Revolutionary features',
        cta: 'Buy Now'
      })
      setupSuccessfulFetchMock(mockFetch, jsonResponse)

      const result = await service.generateTemplateTexts({
        contentIdea: 'Product showcase',
        templateDescription: 'Product template',
        textAreas: [
          { id: 'title', name: 'Title', maxLength: 50 },
          { id: 'subtitle', name: 'Subtitle', maxLength: 100 },
          { id: 'cta', name: 'CTA', maxLength: 20 }
        ],
        brandManual: mockBrandManual
      })

      expect(result.texts.title).toBe('Amazing Product')
      expect(result.texts.subtitle).toBe('Revolutionary features')
      expect(result.texts.cta).toBe('Buy Now')
    })

    it('should handle JSON with extra formatting', async () => {
      const jsonResponse = `\`\`\`json
      {
        "title": "Clean Title",
        "subtitle": "Clean Subtitle"
      }
      \`\`\``
      setupSuccessfulFetchMock(mockFetch, jsonResponse)

      const result = await service.generateTemplateTexts({
        contentIdea: 'Test',
        templateDescription: 'Test template',
        textAreas: [
          { id: 'title', name: 'Title', maxLength: 50 },
          { id: 'subtitle', name: 'Subtitle', maxLength: 100 }
        ],
        brandManual: mockBrandManual
      })

      expect(result.texts.title).toBe('Clean Title')
      expect(result.texts.subtitle).toBe('Clean Subtitle')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      setupErrorFetchMock(mockFetch, 429, 'Rate limit exceeded')

      await expect(service.generateSocialText({
        contentIdea: 'Test',
        platform: 'instagram',
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })).rejects.toThrow('Gemini API error: 429 - Rate limit exceeded')
    })

    it('should retry on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: {
                parts: [{ text: 'Success after retry' }]
              }
            }]
          })
        })

      const result = await service.generateSocialText({
        contentIdea: 'Test',
        platform: 'instagram',
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })

      expect(result.text).toBe('Success after retry')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Utility Methods', () => {
    it('should provide service stats', () => {
      const stats = service.getServiceStats()
      expect(stats.platformLimits).toBeDefined()
      expect(stats.retryConfig).toBeDefined()
      expect(stats.model).toBe('gemini-2.5-flash')
    })

    it('should allow retry configuration', () => {
      service.setRetryConfig(5, 2000)
      const stats = service.getServiceStats()
      expect(stats.retryConfig.attempts).toBe(5)
      expect(stats.retryConfig.delay).toBe(2000)
    })
  })
})