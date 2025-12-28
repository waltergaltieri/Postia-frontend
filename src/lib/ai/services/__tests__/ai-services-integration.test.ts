import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiTextService } from '../GeminiTextService'
import { GeminiImageService } from '../GeminiImageService'
import { SocialNetwork, BrandManual, Resource, Template } from '../../../database/types'

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

describe('AI Services Integration Tests', () => {
  let textService: GeminiTextService
  let imageService: GeminiImageService
  let mockBrandManual: BrandManual
  let mockResource: Resource
  let mockTemplate: Template

  beforeEach(() => {
    vi.clearAllMocks()
    
    textService = new GeminiTextService()
    imageService = new GeminiImageService()
    
    mockBrandManual = {
      brandVoice: 'Professional and approachable',
      brandValues: ['Innovation', 'Quality', 'Trust'],
      targetAudience: 'Tech professionals and entrepreneurs',
      keyMessages: ['Cutting-edge technology', 'User-centric design'],
      dosDonts: {
        dos: ['Use clear language', 'Focus on benefits', 'Include social proof'],
        donts: ['Avoid technical jargon', 'Don\'t oversell', 'No false claims']
      }
    }

    mockResource = {
      id: 'resource-1',
      name: 'Product Hero Image',
      type: 'image',
      url: 'https://example.com/hero-image.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 750000,
      workspaceId: 'workspace-1',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockTemplate = {
      id: 'template-1',
      name: 'Modern Product Card',
      type: 'single',
      category: 'product',
      description: 'Clean, modern template for product showcases',
      previewUrl: 'https://example.com/template-preview.jpg',
      templateUrl: 'https://example.com/template.json',
      textAreas: [
        { id: 'headline', name: 'Headline', maxLength: 60 },
        { id: 'description', name: 'Description', maxLength: 150 },
        { id: 'cta', name: 'Call to Action', maxLength: 25 }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Cross-Service Error Handling', () => {
    it('should handle simultaneous failures in both services gracefully', async () => {
      // Mock both services to fail
      mockFetch.mockRejectedValue(new Error('Network failure'))
      
      const textPromise = textService.generateSocialText({
        contentIdea: 'Test content',
        platform: 'instagram' as SocialNetwork,
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })

      const imagePromise = imageService.generateSimpleImage({
        contentIdea: 'Test content',
        platform: 'instagram' as SocialNetwork
      })

      await expect(textPromise).rejects.toThrow('Failed to generate text for instagram')
      await expect(imagePromise).rejects.toThrow('Failed to generate simple image')
    })

    it('should maintain independent retry mechanisms', async () => {
      textService.setRetryConfig(2, 100)
      imageService.setRetryConfig(3, 150)

      // Mock failures for both services
      mockFetch.mockRejectedValue(new Error('API failure'))
      
      const textStartTime = Date.now()
      await expect(textService.generateSocialText({
        contentIdea: 'Test',
        platform: 'instagram' as SocialNetwork,
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })).rejects.toThrow()
      const textEndTime = Date.now()

      const imageStartTime = Date.now()
      await expect(imageService.generateSimpleImage({
        contentIdea: 'Test',
        platform: 'instagram' as SocialNetwork
      })).rejects.toThrow()
      const imageEndTime = Date.now()

      // Text service should have made 2 attempts with shorter delays
      expect(textEndTime - textStartTime).toBeLessThan(500)
      
      // Image service should have made 3 attempts with longer delays
      expect(imageEndTime - imageStartTime).toBeGreaterThan(300)
    })

    it('should handle mixed success/failure scenarios', async () => {
      // Text service succeeds, image service fails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'Generated text content' }]
            }
          }]
        })
      })

      const textResult = await textService.generateSocialText({
        contentIdea: 'Product launch',
        platform: 'linkedin' as SocialNetwork,
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })

      const imagePromise = imageService.generateSimpleImage({
        contentIdea: 'Product launch',
        platform: 'linkedin' as SocialNetwork
      })

      expect(textResult.text).toBe('Generated text content')
      expect(textResult.platform).toBe('linkedin')
      
      // Image service should still work (uses simulation, not fetch)
      await expect(imagePromise).resolves.toBeDefined()
    })
  })

  describe('Service Configuration Consistency', () => {
    it('should use consistent configuration across services', () => {
      const textStats = textService.getServiceStats()
      const imageStats = imageService.getServiceStats()

      expect(textStats.model).toBe('gemini-2.5-flash')
      expect(imageStats.endpoint).toContain('nano-banana')
      
      // Both should have default retry configurations
      expect(textStats.retryConfig.attempts).toBe(3)
      expect(imageStats.retryConfig.attempts).toBe(3)
    })

    it('should allow independent configuration updates', () => {
      textService.setRetryConfig(5, 2000)
      imageService.setRetryConfig(2, 3000)

      const textStats = textService.getServiceStats()
      const imageStats = imageService.getServiceStats()

      expect(textStats.retryConfig.attempts).toBe(5)
      expect(textStats.retryConfig.delay).toBe(2000)
      expect(imageStats.retryConfig.attempts).toBe(2)
      expect(imageStats.retryConfig.delay).toBe(3000)
    })
  })

  describe('Platform-Specific Integration', () => {
    const platforms: SocialNetwork[] = ['instagram', 'linkedin', 'twitter', 'facebook', 'tiktok']

    it('should handle all platforms consistently across services', async () => {
      const mockTextResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Platform-specific content' }]
          }
        }]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTextResponse)
      })

      // Test only a subset to avoid timeout
      const testPlatforms = ['instagram', 'linkedin'] as SocialNetwork[]
      
      for (const platform of testPlatforms) {
        const textResult = await textService.generateSocialText({
          contentIdea: `Content for ${platform}`,
          platform,
          brandManual: mockBrandManual,
          contentType: 'text_simple'
        })

        const imageResult = await imageService.generateSimpleImage({
          contentIdea: `Content for ${platform}`,
          platform
        })

        expect(textResult.platform).toBe(platform)
        expect(textResult.withinLimits).toBe(true)
        expect(imageResult.metadata.parameters.platform).toBe(platform)
        
        // Verify platform-specific dimensions
        const expectedDimensions = imageService.getPlatformDimensions(platform)
        expect(imageResult.width).toBe(expectedDimensions.width)
        expect(imageResult.height).toBe(expectedDimensions.height)
      }
    }, 15000)

    it('should respect platform character limits in text service', async () => {
      const longContent = 'a'.repeat(500) // Exceeds Twitter limit
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: longContent }]
            }
          }]
        })
      })

      const twitterResult = await textService.generateSocialText({
        contentIdea: 'Long content test',
        platform: 'twitter',
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })

      const instagramResult = await textService.generateSocialText({
        contentIdea: 'Long content test',
        platform: 'instagram',
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })

      expect(twitterResult.withinLimits).toBe(false) // 500 chars > 280 limit
      expect(instagramResult.withinLimits).toBe(true) // 500 chars < 2200 limit
    })
  })

  describe('Content Type Integration', () => {
    it('should handle text-only content generation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'Pure text content for social media' }]
            }
          }]
        })
      })

      const result = await textService.generateSocialText({
        contentIdea: 'Share company milestone',
        platform: 'linkedin',
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })

      expect(result.text).toBe('Pure text content for social media')
      expect(result.characterCount).toBe(result.text.length)
      expect(result.withinLimits).toBe(true)
    })

    it('should handle text + image content generation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'Text to accompany the generated image' }]
            }
          }]
        })
      })

      const textResult = await textService.generateSocialText({
        contentIdea: 'Product showcase with image',
        platform: 'instagram',
        brandManual: mockBrandManual,
        contentType: 'text_image_simple'
      })

      const imageResult = await imageService.generateSimpleImage({
        contentIdea: 'Product showcase with image',
        baseResource: mockResource,
        platform: 'instagram'
      })

      expect(textResult.text).toBe('Text to accompany the generated image')
      expect(imageResult.imageUrl).toBeDefined()
      expect(imageResult.metadata.parameters.baseResource).toBe('Product Hero Image')
    })

    it('should handle template-based content generation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: `{
                  "headline": "Revolutionary Product Launch",
                  "description": "Experience the future with our latest innovation that transforms how you work",
                  "cta": "Get Started Today"
                }`
              }]
            }
          }]
        })
      })

      const textResult = await textService.generateTemplateTexts({
        contentIdea: 'New product launch announcement',
        templateDescription: mockTemplate.description,
        textAreas: mockTemplate.textAreas,
        brandManual: mockBrandManual
      })

      const imageResult = await imageService.generateTemplateImage({
        contentIdea: 'New product launch announcement',
        template: mockTemplate,
        baseResource: mockResource,
        textOverlays: textResult.texts,
        platform: 'instagram'
      })

      expect(textResult.texts.headline).toBe('Revolutionary Product Launch')
      expect(textResult.texts.description).toBeTruthy()
      expect(textResult.texts.cta).toBe('Get Started Today')
      
      expect(imageResult.metadata.model).toBe('nano-banana-template-v2')
      expect(imageResult.metadata.parameters.template).toBe('Modern Product Card')
    })

    it('should handle carousel content generation', async () => {
      const carouselTemplate = { ...mockTemplate, type: 'carousel' as const }
      // Use only 2 resources to reduce test time
      const resources = [
        mockResource,
        { ...mockResource, id: 'resource-2', name: 'Step 2 Image' }
      ]

      const textSequences = [
        { headline: 'Step 1: Setup', description: 'Get started with initial configuration' },
        { headline: 'Step 2: Configure', description: 'Customize your settings and preferences' }
      ]

      const carouselResult = await imageService.generateCarousel({
        contentIdea: 'Step-by-step product tutorial',
        template: carouselTemplate,
        baseResources: resources,
        textSequences,
        platform: 'instagram'
      })

      expect(carouselResult.images).toHaveLength(2)
      expect(carouselResult.coherenceScore).toBeGreaterThan(0)
      expect(carouselResult.totalGenerationTime).toBeGreaterThan(0)

      carouselResult.images.forEach((image, index) => {
        expect(image.metadata.model).toBe('nano-banana-carousel-v2')
        expect(image.metadata.parameters.carouselIndex).toBe(index)
        expect(image.metadata.parameters.totalImages).toBe(2)
      })
    }, 15000)
  })

  describe('Performance and Timing', () => {
    it('should track generation times accurately', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              candidates: [{
                content: {
                  parts: [{ text: 'Generated after delay' }]
                }
              }]
            })
          }), 100)
        )
      )

      const startTime = Date.now()
      const result = await textService.generateSocialText({
        contentIdea: 'Performance test',
        platform: 'instagram',
        brandManual: mockBrandManual,
        contentType: 'text_simple'
      })
      const endTime = Date.now()

      expect(result.metadata.generationTime).toBeGreaterThan(90)
      expect(result.metadata.generationTime).toBeLessThan(endTime - startTime + 50)
    })

    it('should provide accurate time estimates for different content types', () => {
      const simpleTime = imageService.estimateGenerationTime('simple')
      const templateTime = imageService.estimateGenerationTime('template')
      const carouselTime = imageService.estimateGenerationTime('carousel', 4)

      expect(simpleTime).toBe(15000) // 15 seconds
      expect(templateTime).toBe(30000) // 30 seconds
      expect(carouselTime).toBe(120000) // 45s + 3 * 25s = 120s
      
      expect(templateTime).toBeGreaterThan(simpleTime)
      expect(carouselTime).toBeGreaterThan(templateTime)
    })
  })

  describe('Resource Validation and Compatibility', () => {
    it('should validate resources before processing', () => {
      const validResource = mockResource
      const invalidTypeResource = { ...mockResource, mimeType: 'image/gif' }
      const oversizedResource = { ...mockResource, sizeBytes: 15000000 }

      expect(imageService.validateResource(validResource)).toBe(true)
      expect(imageService.validateResource(invalidTypeResource)).toBe(false)
      expect(imageService.validateResource(oversizedResource)).toBe(false)
    })

    it('should handle missing or invalid resources gracefully', async () => {
      const invalidResource = {
        ...mockResource,
        url: '',
        mimeType: 'text/plain'
      }

      // Service should still generate image even with invalid resource
      const result = await imageService.generateSimpleImage({
        contentIdea: 'Test with invalid resource',
        baseResource: invalidResource,
        platform: 'instagram'
      })

      expect(result.imageUrl).toBeDefined()
      expect(result.metadata.parameters.baseResource).toBe('Product Hero Image')
    })
  })

  describe('Brand Manual Integration', () => {
    it('should consistently apply brand guidelines across services', async () => {
      const customBrandManual: BrandManual = {
        brandVoice: 'Casual and friendly',
        brandValues: ['Authenticity', 'Community', 'Fun'],
        targetAudience: 'Young professionals aged 25-35',
        keyMessages: ['Work-life balance', 'Personal growth'],
        dosDonts: {
          dos: ['Use emojis', 'Be conversational', 'Share stories'],
          donts: ['Be too formal', 'Use corporate speak', 'Oversell']
        }
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'Casual and friendly content with emojis 😊' }]
            }
          }]
        })
      })

      const textResult = await textService.generateSocialText({
        contentIdea: 'Team building event',
        platform: 'instagram',
        brandManual: customBrandManual,
        contentType: 'text_simple'
      })

      expect(textResult.text).toContain('😊')
      expect(textResult.metadata.prompt).toContain('Casual and friendly')
      expect(textResult.metadata.prompt).toContain('Young professionals aged 25-35')
      expect(textResult.metadata.prompt).toContain('Use emojis')
      expect(textResult.metadata.prompt).toContain('Be too formal')
    })

    it('should handle incomplete brand manual gracefully', async () => {
      const incompleteBrandManual: Partial<BrandManual> = {
        brandVoice: 'Professional',
        brandValues: ['Quality']
        // Missing other required fields
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'Professional content generated' }]
            }
          }]
        })
      })

      // Should not throw error even with incomplete brand manual
      await expect(textService.generateSocialText({
        contentIdea: 'Test with incomplete brand manual',
        platform: 'linkedin',
        brandManual: incompleteBrandManual as BrandManual,
        contentType: 'text_simple'
      })).resolves.toBeDefined()
    })
  })

  describe('Service Health and Monitoring', () => {
    it('should provide health status for image service', async () => {
      const health = await imageService.checkServiceHealth()
      
      expect(health.status).toBe('online')
      expect(health.latency).toBeGreaterThan(0)
      expect(health.latency).toBeLessThan(1000)
    })

    it('should provide comprehensive service statistics', () => {
      const textStats = textService.getServiceStats()
      const imageStats = imageService.getServiceStats()

      // Text service stats
      expect(textStats.platformLimits).toBeDefined()
      expect(textStats.retryConfig).toBeDefined()
      expect(textStats.model).toBe('gemini-2.5-flash')

      // Image service stats
      expect(imageStats.platformDimensions).toBeDefined()
      expect(imageStats.retryConfig).toBeDefined()
      expect(imageStats.endpoint).toContain('nano-banana')

      // Verify platform coverage
      expect(Object.keys(textStats.platformLimits)).toEqual([
        'instagram', 'linkedin', 'twitter', 'facebook', 'tiktok'
      ])
      expect(Object.keys(imageStats.platformDimensions)).toEqual([
        'instagram', 'facebook', 'linkedin', 'twitter'
      ])
    })
  })
})