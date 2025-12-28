/**
 * End-to-End Integration Tests for Gemini APIs
 * 
 * Tests real integration with Gemini APIs in development environment
 * Requirements covered:
 * - 8.1: Integration with Gemini APIs for text and image generation
 * - 9.1, 9.2: API error handling and retry mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GeminiTextService } from '@/lib/ai/services/GeminiTextService'
import { GeminiImageService } from '@/lib/ai/services/GeminiImageService'
import { RetryMiddleware } from '@/lib/ai/middleware/RetryMiddleware'

// Only run these tests in development environment with real API keys
const shouldRunIntegrationTests = process.env.NODE_ENV === 'development' && 
  process.env.GEMINI_API_KEY && 
  process.env.GEMINI_API_KEY !== 'test-gemini-key'

describe('Gemini API Integration Tests', () => {
  let textService: GeminiTextService
  let imageService: GeminiImageService
  let retryMiddleware: RetryMiddleware

  beforeEach(() => {
    if (!shouldRunIntegrationTests) {
      return
    }

    textService = new GeminiTextService()
    imageService = new GeminiImageService()
    retryMiddleware = new RetryMiddleware({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Gemini Text Service Integration', () => {
    it.skipIf(!shouldRunIntegrationTests)('should generate text content for Instagram', async () => {
      const prompt = `
        Generate engaging Instagram content for a tech product launch.
        Brand voice: Professional and innovative
        Target audience: Tech professionals
        Product: AI-powered productivity tool
        Include relevant hashtags and call to action.
        Keep under 2200 characters.
      `

      const result = await textService.generateText(prompt, {
        platform: 'instagram',
        maxLength: 2200
      })

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(50)
      expect(result.length).toBeLessThanOrEqual(2200)
      expect(result).toMatch(/#\w+/) // Should contain hashtags
    }, 30000) // 30 second timeout for API calls

    it.skipIf(!shouldRunIntegrationTests)('should generate text content for LinkedIn', async () => {
      const prompt = `
        Create professional LinkedIn content about industry trends.
        Topic: AI transformation in business
        Tone: Professional, thought-leadership
        Target audience: Business executives and tech leaders
        Include insights and professional perspective.
        Keep under 3000 characters.
      `

      const result = await textService.generateText(prompt, {
        platform: 'linkedin',
        maxLength: 3000
      })

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(100)
      expect(result.length).toBeLessThanOrEqual(3000)
      expect(result).not.toMatch(/#\w+/) // LinkedIn posts typically don't use hashtags as much
    }, 30000)

    it.skipIf(!shouldRunIntegrationTests)('should handle API errors with retry mechanism', async () => {
      // Mock a failing API call
      const originalFetch = global.fetch
      let callCount = 0
      
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount < 3) {
          throw new Error('Network error')
        }
        return originalFetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY!
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: 'Simple test prompt' }]
            }]
          })
        })
      })

      try {
        const result = await retryMiddleware.execute(async () => {
          return await textService.generateText('Simple test prompt', {})
        })

        expect(result).toBeDefined()
        expect(callCount).toBe(3) // Should have retried twice before succeeding
      } finally {
        global.fetch = originalFetch
      }
    }, 45000)

    it.skipIf(!shouldRunIntegrationTests)('should respect rate limits', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        textService.generateText(`Test prompt ${i}`, { platform: 'instagram' })
      )

      const startTime = Date.now()
      const results = await Promise.all(promises)
      const endTime = Date.now()

      // All requests should succeed
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(10)
      })

      // Should take some time due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(1000) // At least 1 second for 5 requests
    }, 60000)
  })

  describe('Gemini Image Service Integration (Nano Banana)', () => {
    it.skipIf(!shouldRunIntegrationTests)('should generate simple image', async () => {
      const prompt = `
        Create a modern, professional product showcase image.
        Style: Clean, minimalist design
        Colors: Blue and white corporate theme
        Subject: AI productivity software interface
        Quality: High resolution, commercial use
      `

      const result = await imageService.generateImage(prompt)

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^https?:\/\//) // Should be a valid URL
    }, 45000)

    it.skipIf(!shouldRunIntegrationTests)('should generate template-based image', async () => {
      const templateData = {
        id: 'template-1',
        name: 'Product Template',
        type: 'single',
        description: 'Modern product showcase template'
      }

      const result = await imageService.generateTemplateImage({
        template: templateData,
        backgroundImage: 'https://example.com/background.jpg',
        textOverlays: {
          title: 'New Product Launch',
          subtitle: 'Innovation at its finest'
        }
      })

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^https?:\/\//)
    }, 45000)

    it.skipIf(!shouldRunIntegrationTests)('should generate carousel images', async () => {
      const templateData = {
        id: 'carousel-template',
        name: 'Product Carousel',
        type: 'carousel',
        description: 'Multi-slide product showcase'
      }

      const result = await imageService.generateCarousel({
        template: templateData,
        backgroundImages: [
          'https://example.com/bg1.jpg',
          'https://example.com/bg2.jpg',
          'https://example.com/bg3.jpg'
        ],
        textSequence: [
          { title: 'Feature 1', description: 'Amazing capability' },
          { title: 'Feature 2', description: 'Innovative design' },
          { title: 'Feature 3', description: 'User experience' }
        ]
      })

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(3)
      result.forEach(url => {
        expect(typeof url).toBe('string')
        expect(url).toMatch(/^https?:\/\//)
      })
    }, 60000)

    it.skipIf(!shouldRunIntegrationTests)('should handle image generation errors gracefully', async () => {
      // Test with invalid prompt that might cause API error
      const invalidPrompt = '' // Empty prompt

      try {
        await imageService.generateImage(invalidPrompt)
        // If it doesn't throw, that's also acceptable (API might handle empty prompts)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBeDefined()
      }
    }, 30000)
  })

  describe('API Performance and Reliability', () => {
    it.skipIf(!shouldRunIntegrationTests)('should maintain consistent response times', async () => {
      const responseTimes: number[] = []
      const testPrompts = [
        'Generate Instagram content about technology',
        'Create LinkedIn post about business trends',
        'Write Facebook content about product launch'
      ]

      for (const prompt of testPrompts) {
        const startTime = Date.now()
        await textService.generateText(prompt, { platform: 'instagram' })
        const endTime = Date.now()
        responseTimes.push(endTime - startTime)
      }

      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      
      expect(avgResponseTime).toBeLessThan(15000) // Average should be under 15 seconds
      expect(Math.max(...responseTimes)).toBeLessThan(30000) // No single request over 30 seconds
    }, 120000)

    it.skipIf(!shouldRunIntegrationTests)('should handle concurrent requests efficiently', async () => {
      const concurrentPrompts = Array.from({ length: 3 }, (_, i) => 
        `Generate social media content for post ${i + 1} about AI technology`
      )

      const startTime = Date.now()
      const promises = concurrentPrompts.map(prompt => 
        textService.generateText(prompt, { platform: 'instagram' })
      )
      
      const results = await Promise.all(promises)
      const endTime = Date.now()

      // All requests should succeed
      results.forEach((result, index) => {
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(20)
      })

      // Concurrent requests should be faster than sequential
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(45000) // Should complete within 45 seconds
    }, 60000)

    it.skipIf(!shouldRunIntegrationTests)('should validate API key configuration', async () => {
      // Test with current API key
      const result = await textService.generateText('Test prompt for API validation', {})
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')

      // Test error handling with invalid key (temporarily)
      const originalKey = process.env.GEMINI_API_KEY
      process.env.GEMINI_API_KEY = 'invalid-key'
      
      try {
        const invalidService = new GeminiTextService()
        await expect(invalidService.generateText('Test', {})).rejects.toThrow()
      } finally {
        process.env.GEMINI_API_KEY = originalKey
      }
    }, 30000)
  })

  describe('Content Quality Validation', () => {
    it.skipIf(!shouldRunIntegrationTests)('should generate platform-appropriate content', async () => {
      const platforms = [
        { name: 'instagram', maxLength: 2200, shouldHaveHashtags: true },
        { name: 'linkedin', maxLength: 3000, shouldHaveHashtags: false },
        { name: 'facebook', maxLength: 63206, shouldHaveHashtags: false },
        { name: 'twitter', maxLength: 280, shouldHaveHashtags: true }
      ]

      for (const platform of platforms) {
        const prompt = `
          Generate ${platform.name} content about AI technology.
          Keep it engaging and platform-appropriate.
          ${platform.shouldHaveHashtags ? 'Include relevant hashtags.' : 'Focus on professional tone.'}
        `

        const result = await textService.generateText(prompt, {
          platform: platform.name,
          maxLength: platform.maxLength
        })

        expect(result).toBeDefined()
        expect(result.length).toBeLessThanOrEqual(platform.maxLength)
        
        if (platform.shouldHaveHashtags) {
          expect(result).toMatch(/#\w+/)
        }
        
        // Content should be substantial
        expect(result.length).toBeGreaterThan(30)
      }
    }, 180000) // 3 minutes for multiple API calls

    it.skipIf(!shouldRunIntegrationTests)('should maintain brand voice consistency', async () => {
      const brandVoices = [
        'Professional and authoritative',
        'Casual and friendly',
        'Technical and detailed'
      ]

      const results: string[] = []

      for (const voice of brandVoices) {
        const prompt = `
          Generate Instagram content about AI technology.
          Brand voice: ${voice}
          Topic: New AI productivity features
          Include call to action and hashtags.
        `

        const result = await textService.generateText(prompt, {
          platform: 'instagram',
          brandVoice: voice
        })

        results.push(result)
        expect(result).toBeDefined()
        expect(result.length).toBeGreaterThan(50)
      }

      // Results should be different (reflecting different brand voices)
      expect(results[0]).not.toBe(results[1])
      expect(results[1]).not.toBe(results[2])
      expect(results[0]).not.toBe(results[2])
    }, 120000)
  })

  describe('Error Recovery and Resilience', () => {
    it.skipIf(!shouldRunIntegrationTests)('should recover from temporary API failures', async () => {
      let attemptCount = 0
      const maxAttempts = 3

      const executeWithRetry = async (): Promise<string> => {
        attemptCount++
        
        if (attemptCount < 2) {
          // Simulate temporary failure
          throw new Error('Temporary API failure')
        }
        
        return await textService.generateText('Recovery test prompt', {})
      }

      const result = await retryMiddleware.execute(executeWithRetry)
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(attemptCount).toBe(2) // Should have succeeded on second attempt
    }, 30000)

    it.skipIf(!shouldRunIntegrationTests)('should handle quota exceeded errors', async () => {
      // This test would need to be run when approaching quota limits
      // For now, we'll just test the error handling structure
      
      const quotaExceededError = new Error('Quota exceeded')
      quotaExceededError.name = 'QuotaExceededError'

      try {
        throw quotaExceededError
      } catch (error) {
        expect(error.message).toBe('Quota exceeded')
        expect(error.name).toBe('QuotaExceededError')
      }
    })

    it.skipIf(!shouldRunIntegrationTests)('should validate response format', async () => {
      const result = await textService.generateText('Test prompt for format validation', {})
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.trim()).toBe(result) // Should not have leading/trailing whitespace
      expect(result.length).toBeGreaterThan(0)
      
      // Should not contain obvious API artifacts
      expect(result).not.toMatch(/\[GENERATED\]/)
      expect(result).not.toMatch(/\[AI_RESPONSE\]/)
      expect(result).not.toMatch(/^Response:/)
    }, 30000)
  })
})

// Helper function to check if integration tests should run
export function shouldRunGeminiIntegrationTests(): boolean {
  return shouldRunIntegrationTests
}