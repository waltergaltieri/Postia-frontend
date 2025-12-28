import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiTextService, TextGenerationParams, TemplateTextGenerationParams } from '../GeminiTextService'
import { SocialNetwork, BrandManual } from '../../../database/types'
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

describe('GeminiTextService', () => {
  let service: GeminiTextService
  let mockBrandManual: BrandManual

  beforeEach(() => {
    // Reset mocks first
    vi.clearAllMocks()
    
    // Create service after clearing mocks
    service = new GeminiTextService()
    
    mockBrandManual = {
      brandVoice: 'Professional and friendly',
      brandValues: ['Innovation', 'Quality', 'Trust'],
      targetAudience: 'Tech professionals',
      keyMessages: ['Leading technology', 'Customer first'],
      dosDonts: {
        dos: ['Use clear language', 'Be helpful'],
        donts: ['Avoid jargon', 'Don\'t be pushy']
      }
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor and Configuration', () => {
    it('should initialize with correct configuration', () => {
      expect(geminiConfig.getValidatedGeminiConfig).toHaveBeenCalled()
      expect(service).toBeInstanceOf(GeminiTextService)
    })

    it('should have correct platform limits', () => {
      expect(service.getPlatformLimit('instagram')).toBe(2200)
      expect(service.getPlatformLimit('linkedin')).toBe(3000)
      expect(service.getPlatformLimit('twitter')).toBe(280)
      expect(service.getPlatformLimit('facebook')).toBe(63206)
      expect(service.getPlatformLimit('tiktok')).toBe(2200)
    })

    it('should allow retry configuration', () => {
      service.setRetryConfig(5, 2000)
      const stats = service.getServiceStats()
      expect(stats.retryConfig.attempts).toBe(5)
      expect(stats.retryConfig.delay).toBe(2000)
    })
  })

  describe('generateSocialText', () => {
    const mockParams: TextGenerationParams = {
      contentIdea: 'Launch new product feature',
      platform: 'instagram' as SocialNetwork,
      brandManual: mockBrandManual,
      contentType: 'text_simple',
      additionalContext: 'Focus on benefits'
    }

    it('should generate text successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'Exciting news! 🚀 Our new feature is here to revolutionize your workflow. #Innovation #TechUpdate'
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.generateSocialText(mockParams)

      expect(result.text).toBe('Exciting news! 🚀 Our new feature is here to revolutionize your workflow. #Innovation #TechUpdate')
      expect(result.platform).toBe('instagram')
      expect(result.characterCount).toBe(result.text.length)
      expect(result.withinLimits).toBe(true)
      expect(result.metadata.model).toBe('gemini-2.5-flash')
      expect(result.metadata.retryCount).toBe(0)
      expect(typeof result.metadata.generationTime).toBe('number')
    })

    it('should build correct prompt for Instagram', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Test content' }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await service.generateSocialText(mockParams)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.5-flash:generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('INSTAGRAM')
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const prompt = callBody.contents[0].parts[0].text
      
      expect(prompt).toContain('INSTAGRAM')
      expect(prompt).toContain(mockParams.contentIdea)
      expect(prompt).toContain(mockBrandManual.brandVoice)
      expect(prompt).toContain('2200 caracteres') // Instagram limit
    })

    it('should validate text length correctly', async () => {
      const longText = 'a'.repeat(3000) // Exceeds Instagram limit
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: longText }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.generateSocialText(mockParams)

      expect(result.withinLimits).toBe(false)
      expect(result.characterCount).toBe(3000)
    })

    it('should handle different platforms correctly', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Short tweet' }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const twitterParams = { ...mockParams, platform: 'twitter' as SocialNetwork }
      const result = await service.generateSocialText(twitterParams)

      expect(result.platform).toBe('twitter')
      expect(result.withinLimits).toBe(true) // 'Short tweet' is within 280 chars
    })

    it('should clean generated text properly', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: '"TEXTO FINAL: This is the actual content with quotes"'
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.generateSocialText(mockParams)

      expect(result.text).toBe('This is the actual content with quotes')
    })
  })

  describe('generateTemplateTexts', () => {
    const mockTemplateParams: TemplateTextGenerationParams = {
      contentIdea: 'Product launch announcement',
      templateDescription: 'Modern product showcase template',
      textAreas: [
        { id: 'title', name: 'Main Title', maxLength: 50 },
        { id: 'subtitle', name: 'Subtitle', maxLength: 100, placeholder: 'Supporting text' },
        { id: 'cta', name: 'Call to Action', maxLength: 20 }
      ],
      brandManual: mockBrandManual
    }

    it('should generate template texts successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: `{
                "title": "Revolutionary Product Launch",
                "subtitle": "Experience the future of technology with our latest innovation",
                "cta": "Get Started Now"
              }`
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.generateTemplateTexts(mockTemplateParams)

      expect(result.texts.title).toBe('Revolutionary Product Launch')
      expect(result.texts.subtitle).toBe('Experience the future of technology with our latest innovation')
      expect(result.texts.cta).toBe('Get Started Now')
      expect(result.metadata.model).toBe('gemini-2.5-flash')
    })

    it('should handle JSON parsing with extra formatting', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: `\`\`\`json
              {
                "title": "Clean Title",
                "subtitle": "Clean Subtitle",
                "cta": "Clean CTA"
              }
              \`\`\``
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.generateTemplateTexts(mockTemplateParams)

      expect(result.texts.title).toBe('Clean Title')
      expect(result.texts.subtitle).toBe('Clean Subtitle')
      expect(result.texts.cta).toBe('Clean CTA')
    })

    it('should truncate texts that exceed max length', async () => {
      const longTitle = 'a'.repeat(100) // Exceeds 50 char limit
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: `{
                "title": "${longTitle}",
                "subtitle": "Normal subtitle",
                "cta": "CTA"
              }`
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.generateTemplateTexts(mockTemplateParams)

      expect(result.texts.title.length).toBe(50)
      expect(result.texts.subtitle).toBe('Normal subtitle')
    })

    it('should throw error for missing required text areas', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: `{
                "title": "Only Title",
                "subtitle": "Only Subtitle"
              }`
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await expect(service.generateTemplateTexts(mockTemplateParams))
        .rejects.toThrow('Missing text for area: Call to Action')
    })

    it('should throw error for invalid JSON response', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'Invalid JSON response'
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await expect(service.generateTemplateTexts(mockTemplateParams))
        .rejects.toThrow('Failed to parse template text response')
    })
  })

  describe('Error Handling and Retries', () => {
    const mockParams: TextGenerationParams = {
      contentIdea: 'Test content',
      platform: 'instagram' as SocialNetwork,
      brandManual: mockBrandManual,
      contentType: 'text_simple'
    }

    it('should retry on API failure and eventually succeed', async () => {
      const successResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Success after retry' }]
          }
        }]
      }

      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(successResponse)
        })

      const result = await service.generateSocialText(mockParams)

      expect(result.text).toBe('Success after retry')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should throw error after max retries exceeded', async () => {
      service.setRetryConfig(2, 100) // Reduce retry attempts and delay for faster test

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      await expect(service.generateSocialText(mockParams))
        .rejects.toThrow('All Gemini API attempts failed')

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded' }
        })
      })

      await expect(service.generateSocialText(mockParams))
        .rejects.toThrow('Gemini API error: 429 - Rate limit exceeded')
    })

    it('should handle invalid API response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          // Missing candidates array
          invalidResponse: true
        })
      })

      await expect(service.generateSocialText(mockParams))
        .rejects.toThrow('Invalid response format from Gemini API')
    })

    it('should use exponential backoff for retries', async () => {
      service.setRetryConfig(3, 100)
      
      const startTime = Date.now()
      
      mockFetch
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))

      await expect(service.generateSocialText(mockParams))
        .rejects.toThrow('All Gemini API attempts failed')

      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // Should have waited: 100ms + 200ms = 300ms minimum
      expect(totalTime).toBeGreaterThan(250)
    })
  })

  describe('Prompt Quality and Accuracy', () => {
    const mockParams: TextGenerationParams = {
      contentIdea: 'AI-powered productivity tool',
      platform: 'linkedin' as SocialNetwork,
      brandManual: mockBrandManual,
      contentType: 'text_image_simple',
      additionalContext: 'Target enterprise customers'
    }

    it('should include all brand manual elements in prompt', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Generated content' }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await service.generateSocialText(mockParams)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const prompt = callBody.contents[0].parts[0].text

      expect(prompt).toContain(mockBrandManual.brandVoice)
      expect(prompt).toContain(mockBrandManual.brandValues.join(' | '))
      expect(prompt).toContain(mockBrandManual.targetAudience)
      expect(prompt).toContain(mockBrandManual.keyMessages.join(' | '))
      expect(prompt).toContain(mockBrandManual.dosDonts.dos.join(' | '))
      expect(prompt).toContain(mockBrandManual.dosDonts.donts.join(' | '))
    })

    it('should include platform-specific specifications', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Generated content' }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await service.generateSocialText(mockParams)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const prompt = callBody.contents[0].parts[0].text

      expect(prompt).toContain('LINKEDIN')
      expect(prompt).toContain('3000 caracteres') // LinkedIn limit
      expect(prompt).toContain('Profesionales, decision makers')
      expect(prompt).toContain('3-5 hashtags profesionales')
    })

    it('should include content type guidance', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Generated content' }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await service.generateSocialText(mockParams)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const prompt = callBody.contents[0].parts[0].text

      expect(prompt).toContain('CONTENIDO TEXTO + IMAGEN')
      expect(prompt).toContain('Texto que complemente imagen perfectamente')
    })

    it('should include additional context when provided', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Generated content' }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await service.generateSocialText(mockParams)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const prompt = callBody.contents[0].parts[0].text

      expect(prompt).toContain('CONTEXTO ADICIONAL')
      expect(prompt).toContain('Target enterprise customers')
    })

    it('should use correct generation config parameters', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Generated content' }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await service.generateSocialText(mockParams)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      
      expect(callBody.generationConfig.temperature).toBe(0.8)
      expect(callBody.generationConfig.topK).toBe(40)
      expect(callBody.generationConfig.topP).toBe(0.95)
      expect(callBody.generationConfig.maxOutputTokens).toBe(8192)
      expect(callBody.safetySettings).toHaveLength(4)
    })
  })

  describe('Utility Methods', () => {
    it('should validate text length correctly', () => {
      expect(service.validateTextLength('Short text', 'twitter')).toBe(true)
      expect(service.validateTextLength('a'.repeat(300), 'twitter')).toBe(false)
      expect(service.validateTextLength('a'.repeat(2000), 'instagram')).toBe(true)
      expect(service.validateTextLength('a'.repeat(3000), 'instagram')).toBe(false)
    })

    it('should return correct service stats', () => {
      service.setRetryConfig(5, 2000)
      const stats = service.getServiceStats()

      expect(stats.platformLimits.instagram).toBe(2200)
      expect(stats.platformLimits.linkedin).toBe(3000)
      expect(stats.platformLimits.twitter).toBe(280)
      expect(stats.retryConfig.attempts).toBe(5)
      expect(stats.retryConfig.delay).toBe(2000)
      expect(stats.model).toBe('gemini-2.5-flash')
    })

    it('should enforce minimum retry configuration values', () => {
      service.setRetryConfig(0, 50) // Below minimums
      const stats = service.getServiceStats()

      expect(stats.retryConfig.attempts).toBe(1) // Minimum 1
      expect(stats.retryConfig.delay).toBe(100) // Minimum 100
    })
  })

  describe('Factory Function', () => {
    it('should create service instance successfully', async () => {
      const module = await import('../GeminiTextService')
      const service = module.createGeminiTextService()
      expect(service).toBeInstanceOf(GeminiTextService)
    })

    it('should throw error if configuration fails', async () => {
      vi.mocked(geminiConfig.getValidatedGeminiConfig).mockImplementationOnce(() => {
        throw new Error('Configuration error')
      })

      const module = await import('../GeminiTextService')
      expect(() => module.createGeminiTextService()).toThrow('Configuration error')
    })
  })
})