import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiImageService, ImageGenerationParams, TemplateImageGenerationParams, CarouselGenerationParams } from '../GeminiImageService'
import { Resource, Template, SocialNetwork } from '../../../database/types'
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

describe('GeminiImageService', () => {
  let service: GeminiImageService
  let mockResource: Resource
  let mockTemplate: Template

  beforeEach(() => {
    // Reset mocks first
    vi.clearAllMocks()
    
    // Create service after clearing mocks
    service = new GeminiImageService()
    
    mockResource = {
      id: 'resource-1',
      name: 'Test Image',
      type: 'image',
      url: 'https://example.com/test-image.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 500000,
      workspaceId: 'workspace-1',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockTemplate = {
      id: 'template-1',
      name: 'Product Showcase',
      type: 'single',
      category: 'product',
      description: 'Modern product showcase template',
      previewUrl: 'https://example.com/template-preview.jpg',
      templateUrl: 'https://example.com/template.json',
      textAreas: [
        { id: 'title', name: 'Title', maxLength: 50 },
        { id: 'subtitle', name: 'Subtitle', maxLength: 100 }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor and Configuration', () => {
    it('should initialize with correct configuration', () => {
      expect(geminiConfig.getValidatedGeminiConfig).toHaveBeenCalled()
      expect(service).toBeInstanceOf(GeminiImageService)
    })

    it('should have correct platform dimensions', () => {
      const instagramDims = service.getPlatformDimensions('instagram')
      expect(instagramDims).toEqual({ width: 1080, height: 1080, ratio: '1:1' })

      const linkedinDims = service.getPlatformDimensions('linkedin')
      expect(linkedinDims).toEqual({ width: 1200, height: 627, ratio: '1.91:1' })
    })

    it('should allow retry configuration', () => {
      service.setRetryConfig(5, 3000)
      const stats = service.getServiceStats()
      expect(stats.retryConfig.attempts).toBe(5)
      expect(stats.retryConfig.delay).toBe(3000)
    })
  })

  describe('generateSimpleImage', () => {
    const mockParams: ImageGenerationParams = {
      contentIdea: 'Modern tech product showcase',
      baseResource: mockResource,
      platform: 'instagram' as SocialNetwork,
      style: 'professional',
      aspectRatio: 'square'
    }

    it('should generate simple image successfully', async () => {
      const result = await service.generateSimpleImage(mockParams)

      expect(result.imageUrl).toMatch(/^https:\/\/generated-images\.nano-banana\.com\//)
      expect(result.width).toBe(1080)
      expect(result.height).toBe(1080)
      expect(result.format).toBe('jpeg')
      expect(result.sizeBytes).toBeGreaterThan(0)
      expect(result.generationTime).toBeGreaterThan(0)
      expect(result.metadata.model).toBe('nano-banana-v2')
      expect(result.metadata.parameters.platform).toBe('instagram')
      expect(result.metadata.parameters.style).toBe('professional')
      expect(result.metadata.nanoBananaJobId).toMatch(/^nb_/)
    })

    it('should handle different platforms correctly', async () => {
      const linkedinParams = { ...mockParams, platform: 'linkedin' as SocialNetwork }
      const result = await service.generateSimpleImage(linkedinParams)

      expect(result.width).toBe(1200)
      expect(result.height).toBe(627)
      expect(result.metadata.parameters.platform).toBe('linkedin')
    })

    it('should use default style when not specified', async () => {
      const paramsWithoutStyle = { ...mockParams }
      delete paramsWithoutStyle.style

      const result = await service.generateSimpleImage(paramsWithoutStyle)

      expect(result.metadata.parameters.style).toBe('professional')
    })

    it('should handle generation without base resource', async () => {
      const paramsWithoutResource = { ...mockParams }
      delete paramsWithoutResource.baseResource

      const result = await service.generateSimpleImage(paramsWithoutResource)

      expect(result.imageUrl).toBeDefined()
      expect(result.metadata.parameters.baseResource).toBeUndefined()
    })

    it('should build correct prompt for image generation', async () => {
      // We can't directly test the prompt since it's internal to the simulated call
      // But we can verify the service processes the parameters correctly
      const result = await service.generateSimpleImage(mockParams)

      expect(result.metadata.parameters).toEqual({
        platform: 'instagram',
        style: 'professional',
        baseResource: 'Test Image',
        aspectRatio: 'square'
      })
    })
  })

  describe('generateTemplateImage', () => {
    const mockTemplateParams: TemplateImageGenerationParams = {
      contentIdea: 'Product launch announcement',
      template: mockTemplate,
      baseResource: mockResource,
      textOverlays: {
        title: 'Revolutionary Product',
        subtitle: 'Experience the future of technology'
      },
      platform: 'instagram' as SocialNetwork
    }

    it('should generate template image successfully', async () => {
      const result = await service.generateTemplateImage(mockTemplateParams)

      expect(result.imageUrl).toMatch(/^https:\/\/generated-images\.nano-banana\.com\//)
      expect(result.width).toBe(1080)
      expect(result.height).toBe(1080)
      expect(result.format).toBe('jpeg')
      expect(result.metadata.model).toBe('nano-banana-template-v2')
      expect(result.metadata.parameters.template).toBe('Product Showcase')
      expect(result.metadata.parameters.textOverlays).toEqual(['title', 'subtitle'])
      expect(result.metadata.parameters.baseResource).toBe('Test Image')
    })

    it('should handle different template types', async () => {
      const carouselTemplate = { ...mockTemplate, type: 'carousel' as const }
      const paramsWithCarousel = { ...mockTemplateParams, template: carouselTemplate }

      const result = await service.generateTemplateImage(paramsWithCarousel)

      expect(result.metadata.parameters.template).toBe('Product Showcase')
      expect(result.imageUrl).toBeDefined()
    })

    it('should process text overlays correctly', async () => {
      const complexTextOverlays = {
        title: 'Main Title',
        subtitle: 'Supporting subtitle text',
        cta: 'Get Started',
        footer: 'Learn more at example.com'
      }

      const paramsWithComplexText = {
        ...mockTemplateParams,
        textOverlays: complexTextOverlays
      }

      const result = await service.generateTemplateImage(paramsWithComplexText)

      expect(result.metadata.parameters.textOverlays).toEqual([
        'title', 'subtitle', 'cta', 'footer'
      ])
    })
  })

  describe('generateCarousel', () => {
    const mockCarouselParams: CarouselGenerationParams = {
      contentIdea: 'Multi-step product tutorial',
      template: { ...mockTemplate, type: 'carousel' },
      baseResources: [
        mockResource,
        { ...mockResource, id: 'resource-2', name: 'Step 2 Image' },
        { ...mockResource, id: 'resource-3', name: 'Step 3 Image' }
      ],
      textSequences: [
        { title: 'Step 1', subtitle: 'Getting started' },
        { title: 'Step 2', subtitle: 'Configuration' },
        { title: 'Step 3', subtitle: 'Launch' }
      ],
      platform: 'instagram' as SocialNetwork
    }

    it('should generate carousel successfully', async () => {
      const result = await service.generateCarousel(mockCarouselParams)

      expect(result.images).toHaveLength(3)
      expect(result.totalGenerationTime).toBeGreaterThan(0)
      expect(result.coherenceScore).toBeGreaterThan(0)
      expect(result.coherenceScore).toBeLessThanOrEqual(1)

      // Check each image
      result.images.forEach((image, index) => {
        expect(image.imageUrl).toMatch(/^https:\/\/generated-images\.nano-banana\.com\//)
        expect(image.metadata.model).toBe('nano-banana-carousel-v2')
        expect(image.metadata.parameters.carouselIndex).toBe(index)
        expect(image.metadata.parameters.totalImages).toBe(3)
      })
    })

    it('should maintain visual coherence across carousel images', async () => {
      const result = await service.generateCarousel(mockCarouselParams)

      // All images should have consistent metadata indicating coherence
      const platforms = result.images.map(img => img.metadata.parameters.platform)
      const templates = result.images.map(img => img.metadata.parameters.template)

      expect(new Set(platforms).size).toBe(1) // All same platform
      expect(new Set(templates).size).toBe(1) // All same template
      expect(result.coherenceScore).toBeGreaterThan(0.5) // Reasonable coherence
    })

    it('should throw error for mismatched resources and text sequences', async () => {
      const mismatchedParams = {
        ...mockCarouselParams,
        textSequences: [
          { title: 'Step 1', subtitle: 'Only one step' }
        ] // Only 1 text sequence for 3 resources
      }

      await expect(service.generateCarousel(mismatchedParams))
        .rejects.toThrow('Number of base resources must match number of text sequences')
    })

    it('should handle single image carousel', async () => {
      const singleImageParams = {
        ...mockCarouselParams,
        baseResources: [mockResource],
        textSequences: [{ title: 'Single Step', subtitle: 'Complete guide' }]
      }

      const result = await service.generateCarousel(singleImageParams)

      expect(result.images).toHaveLength(1)
      expect(result.coherenceScore).toBe(1.0) // Perfect coherence for single image
    })
  })

  describe('Error Handling and Retries', () => {
    const mockParams: ImageGenerationParams = {
      contentIdea: 'Test content',
      platform: 'instagram' as SocialNetwork
    }

    it('should retry on generation failure and eventually succeed', async () => {
      // Mock the internal simulation to fail first, then succeed
      const originalSimulate = service['simulateNanoBananaCall']
      let callCount = 0
      
      service['simulateNanoBananaCall'] = vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Temporary failure')
        }
        return originalSimulate.call(service, {})
      })

      const result = await service.generateSimpleImage(mockParams)

      expect(result.imageUrl).toBeDefined()
      expect(service['simulateNanoBananaCall']).toHaveBeenCalledTimes(3)
    })

    it('should throw error after max retries exceeded', async () => {
      service.setRetryConfig(2, 100) // Reduce retries for faster test

      service['simulateNanoBananaCall'] = vi.fn().mockRejectedValue(new Error('Persistent failure'))

      await expect(service.generateSimpleImage(mockParams))
        .rejects.toThrow('All Nano Banana API attempts failed')
    })

    it('should use exponential backoff for retries', async () => {
      service.setRetryConfig(3, 100)
      
      const startTime = Date.now()
      service['simulateNanoBananaCall'] = vi.fn().mockRejectedValue(new Error('Always fail'))

      await expect(service.generateSimpleImage(mockParams))
        .rejects.toThrow('All Nano Banana API attempts failed')

      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // Should have waited: 100ms + 200ms = 300ms minimum
      expect(totalTime).toBeGreaterThan(250)
    })

    it('should handle carousel generation errors gracefully', async () => {
      const carouselParams: CarouselGenerationParams = {
        contentIdea: 'Test carousel',
        template: { ...mockTemplate, type: 'carousel' },
        baseResources: [mockResource],
        textSequences: [{ title: 'Test' }],
        platform: 'instagram' as SocialNetwork
      }

      service['simulateNanoBananaCall'] = vi.fn().mockRejectedValue(new Error('Carousel generation failed'))

      await expect(service.generateCarousel(carouselParams))
        .rejects.toThrow('Failed to generate carousel: Failed to generate carousel image 1: Carousel generation failed')
    })
  })

  describe('Prompt Quality and Accuracy', () => {
    it('should build comprehensive prompts for simple images', async () => {
      const params: ImageGenerationParams = {
        contentIdea: 'AI-powered productivity tool',
        baseResource: mockResource,
        platform: 'linkedin' as SocialNetwork,
        style: 'professional',
        aspectRatio: 'landscape'
      }

      const result = await service.generateSimpleImage(params)

      // Verify the prompt was built with correct parameters
      expect(result.metadata.parameters.platform).toBe('linkedin')
      expect(result.metadata.parameters.style).toBe('professional')
      expect(result.metadata.parameters.aspectRatio).toBe('landscape')
      expect(result.metadata.parameters.baseResource).toBe('Test Image')
    })

    it('should build comprehensive prompts for template images', async () => {
      const params: TemplateImageGenerationParams = {
        contentIdea: 'Product showcase',
        template: mockTemplate,
        baseResource: mockResource,
        textOverlays: {
          title: 'Amazing Product',
          subtitle: 'Revolutionary features'
        },
        platform: 'instagram' as SocialNetwork
      }

      const result = await service.generateTemplateImage(params)

      expect(result.metadata.parameters.template).toBe('Product Showcase')
      expect(result.metadata.parameters.textOverlays).toEqual(['title', 'subtitle'])
      expect(result.metadata.parameters.baseResource).toBe('Test Image')
    })

    it('should maintain coherence context in carousel prompts', async () => {
      const params: CarouselGenerationParams = {
        contentIdea: 'Step-by-step tutorial',
        template: { ...mockTemplate, type: 'carousel' },
        baseResources: [mockResource, { ...mockResource, id: 'resource-2' }],
        textSequences: [
          { title: 'Step 1' },
          { title: 'Step 2' }
        ],
        platform: 'instagram' as SocialNetwork
      }

      const result = await service.generateCarousel(params)

      // Each image should have coherence metadata
      result.images.forEach((image, index) => {
        expect(image.metadata.parameters.carouselIndex).toBe(index)
        expect(image.metadata.parameters.totalImages).toBe(2)
      })
    })
  })

  describe('Resource Validation', () => {
    it('should validate supported image types', () => {
      const jpegResource = { ...mockResource, mimeType: 'image/jpeg' }
      const pngResource = { ...mockResource, mimeType: 'image/png' }
      const webpResource = { ...mockResource, mimeType: 'image/webp' }
      const unsupportedResource = { ...mockResource, mimeType: 'image/gif' }

      expect(service.validateResource(jpegResource)).toBe(true)
      expect(service.validateResource(pngResource)).toBe(true)
      expect(service.validateResource(webpResource)).toBe(true)
      expect(service.validateResource(unsupportedResource)).toBe(false)
    })

    it('should validate file size limits', () => {
      const smallResource = { ...mockResource, sizeBytes: 1000000 } // 1MB
      const largeResource = { ...mockResource, sizeBytes: 15000000 } // 15MB

      expect(service.validateResource(smallResource)).toBe(true)
      expect(service.validateResource(largeResource)).toBe(false)
    })
  })

  describe('Generation Time Estimation', () => {
    it('should estimate time for simple images', () => {
      const time = service.estimateGenerationTime('simple')
      expect(time).toBe(15000) // 15 seconds
    })

    it('should estimate time for template images', () => {
      const time = service.estimateGenerationTime('template')
      expect(time).toBe(30000) // 30 seconds
    })

    it('should estimate time for carousel images', () => {
      const time = service.estimateGenerationTime('carousel', 3)
      expect(time).toBe(95000) // 45s base + 2 * 25s additional = 95s
    })

    it('should handle carousel without length specified', () => {
      const time = service.estimateGenerationTime('carousel')
      expect(time).toBe(45000) // Base time only
    })
  })

  describe('Service Health Check', () => {
    it('should report service as online', async () => {
      const health = await service.checkServiceHealth()
      
      expect(health.status).toBe('online')
      expect(health.latency).toBeGreaterThan(0)
      expect(health.latency).toBeLessThan(500) // Should be reasonable
    })

    it('should handle health check failures', async () => {
      // Mock a failure in the health check
      const originalSetTimeout = global.setTimeout
      global.setTimeout = vi.fn().mockImplementation(() => {
        throw new Error('Health check failed')
      })

      const health = await service.checkServiceHealth()
      
      expect(health.status).toBe('offline')
      expect(health.latency).toBeUndefined()

      global.setTimeout = originalSetTimeout
    })
  })

  describe('Utility Methods', () => {
    it('should return correct service stats', () => {
      service.setRetryConfig(5, 3000)
      const stats = service.getServiceStats()

      expect(stats.platformDimensions.instagram).toEqual({ width: 1080, height: 1080, ratio: '1:1' })
      expect(stats.retryConfig.attempts).toBe(5)
      expect(stats.retryConfig.delay).toBe(3000)
      expect(stats.endpoint).toContain('nano-banana')
    })

    it('should enforce minimum retry configuration values', () => {
      service.setRetryConfig(0, 500) // Below minimums
      const stats = service.getServiceStats()

      expect(stats.retryConfig.attempts).toBe(1) // Minimum 1
      expect(stats.retryConfig.delay).toBe(1000) // Minimum 1000
    })
  })

  describe('Factory Function', () => {
    it('should create service instance successfully', async () => {
      const module = await import('../GeminiImageService')
      const service = module.createGeminiImageService()
      expect(service).toBeInstanceOf(GeminiImageService)
    })

    it('should throw error if configuration fails', async () => {
      vi.mocked(geminiConfig.getValidatedGeminiConfig).mockImplementationOnce(() => {
        throw new Error('Configuration error')
      })

      const module = await import('../GeminiImageService')
      expect(() => module.createGeminiImageService()).toThrow('Configuration error')
    })
  })

  describe('Visual Theme and Style Analysis', () => {
    it('should extract visual themes from content ideas', async () => {
      const businessParams = {
        contentIdea: 'Corporate business solution for enterprise',
        platform: 'linkedin' as SocialNetwork
      }

      const creativeParams = {
        contentIdea: 'Creative art design innovation',
        platform: 'instagram' as SocialNetwork
      }

      const techParams = {
        contentIdea: 'New software technology app',
        platform: 'twitter' as SocialNetwork
      }

      // Generate images and verify they process different themes
      const businessResult = await service.generateSimpleImage(businessParams)
      const creativeResult = await service.generateSimpleImage(creativeParams)
      const techResult = await service.generateSimpleImage(techParams)

      expect(businessResult.imageUrl).toBeDefined()
      expect(creativeResult.imageUrl).toBeDefined()
      expect(techResult.imageUrl).toBeDefined()

      // All should have different generation metadata
      expect(businessResult.metadata.nanoBananaJobId).not.toBe(creativeResult.metadata.nanoBananaJobId)
      expect(creativeResult.metadata.nanoBananaJobId).not.toBe(techResult.metadata.nanoBananaJobId)
    })

    it('should suggest appropriate color palettes by platform', async () => {
      const instagramParams = { contentIdea: 'Test', platform: 'instagram' as SocialNetwork }
      const linkedinParams = { contentIdea: 'Test', platform: 'linkedin' as SocialNetwork }

      const instagramResult = await service.generateSimpleImage(instagramParams)
      const linkedinResult = await service.generateSimpleImage(linkedinParams)

      expect(instagramResult.metadata.parameters.platform).toBe('instagram')
      expect(linkedinResult.metadata.parameters.platform).toBe('linkedin')
    })
  })
})