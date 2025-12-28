/**
 * API Load Testing for Gemini Services
 * 
 * Tests API rate limiting, concurrent request handling, and service resilience
 * under various load conditions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock all the dependencies
vi.mock('../services/GeminiTextService')
vi.mock('../services/GeminiImageService')
vi.mock('../middleware/RetryMiddleware')

// Import after mocking
import { GeminiTextService } from '../services/GeminiTextService'
import { GeminiImageService } from '../services/GeminiImageService'

// API Load Test Configuration
const API_LOAD_CONFIG = {
  RATE_LIMIT_RPM: 60, // Requests per minute
  BURST_SIZE: 10, // Maximum burst requests
  CONCURRENT_REQUESTS: 5,
  STRESS_TEST_REQUESTS: 100,
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  BACKOFF_BASE_MS: 1000
}

// Rate limiting simulator
class RateLimitSimulator {
  private requests: number[] = []
  private readonly windowMs: number
  private readonly maxRequests: number

  constructor(maxRequestsPerMinute: number) {
    this.maxRequests = maxRequestsPerMinute
    this.windowMs = 60 * 1000 // 1 minute
  }

  canMakeRequest(): boolean {
    const now = Date.now()
    // Remove requests older than the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    if (this.requests.length >= this.maxRequests) {
      return false
    }
    
    this.requests.push(now)
    return true
  }

  getRequestCount(): number {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    return this.requests.length
  }

  reset() {
    this.requests = []
  }
}

// API response time simulator
class ApiResponseSimulator {
  private baseLatency: number
  private variance: number
  private errorRate: number

  constructor(baseLatency: number = 2000, variance: number = 0.3, errorRate: number = 0.05) {
    this.baseLatency = baseLatency
    this.variance = variance
    this.errorRate = errorRate
  }

  async simulateRequest(requestType: 'text' | 'image' = 'text'): Promise<string> {
    // Simulate network latency with variance
    const latency = this.baseLatency + (Math.random() - 0.5) * this.variance * this.baseLatency
    const imageMultiplier = requestType === 'image' ? 2.5 : 1 // Images take longer
    
    await new Promise(resolve => setTimeout(resolve, latency * imageMultiplier))
    
    // Simulate random errors
    if (Math.random() < this.errorRate) {
      throw new Error(`Simulated ${requestType} API error`)
    }
    
    return requestType === 'text' 
      ? 'Generated text content'
      : 'https://example.com/generated-image.jpg'
  }
}

// Load test metrics collector
class LoadTestMetrics {
  private requests: Array<{
    startTime: number
    endTime: number
    success: boolean
    error?: string
    requestType: string
  }> = []

  recordRequest(startTime: number, endTime: number, success: boolean, requestType: string, error?: string) {
    this.requests.push({
      startTime,
      endTime,
      success,
      error,
      requestType
    })
  }

  getMetrics() {
    const totalRequests = this.requests.length
    const successfulRequests = this.requests.filter(r => r.success).length
    const failedRequests = totalRequests - successfulRequests
    
    const durations = this.requests.map(r => r.endTime - r.startTime)
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)
    
    const successRate = successfulRequests / totalRequests
    const errorRate = failedRequests / totalRequests
    
    // Calculate throughput (requests per second)
    const testDuration = Math.max(...this.requests.map(r => r.endTime)) - Math.min(...this.requests.map(r => r.startTime))
    const throughput = totalRequests / (testDuration / 1000)
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      errorRate,
      avgDuration,
      maxDuration,
      minDuration,
      throughput,
      testDuration
    }
  }

  reset() {
    this.requests = []
  }
}

describe('API Load Testing', () => {
  let textService: GeminiTextService
  let imageService: GeminiImageService
  let rateLimiter: RateLimitSimulator
  let apiSimulator: ApiResponseSimulator
  let metrics: LoadTestMetrics

  beforeEach(() => {
    // Create mock instances
    textService = {
      generateText: vi.fn()
    } as any
    
    imageService = {
      generateImage: vi.fn()
    } as any
    
    rateLimiter = new RateLimitSimulator(API_LOAD_CONFIG.RATE_LIMIT_RPM)
    apiSimulator = new ApiResponseSimulator()
    metrics = new LoadTestMetrics()

    // Mock the actual API calls with our simulator
    textService.generateSocialText = vi.fn().mockImplementation(async (params: any) => {
      if (!rateLimiter.canMakeRequest()) {
        throw new Error('Rate limit exceeded')
      }
      const text = await apiSimulator.simulateRequest('text')
      return {
        text,
        platform: params.platform,
        characterCount: text.length,
        withinLimits: true,
        metadata: {
          prompt: 'test prompt',
          model: 'gemini-pro',
          generationTime: 2000,
          retryCount: 0
        }
      }
    })

    imageService.generateSimpleImage = vi.fn().mockImplementation(async (params: any) => {
      if (!rateLimiter.canMakeRequest()) {
        throw new Error('Rate limit exceeded')
      }
      const imageUrl = await apiSimulator.simulateRequest('image')
      return {
        imageUrl,
        width: 1024,
        height: 1024,
        format: 'jpeg',
        sizeBytes: 1024 * 1024,
        generationTime: 5000,
        metadata: {
          prompt: 'test image prompt',
          model: 'nano-banana',
          parameters: {},
          nanoBananaJobId: 'test-job-id'
        }
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    rateLimiter.reset()
    metrics.reset()
  })

  describe('Rate Limiting Tests', () => {
    it('should respect API rate limits', async () => {
      const requests = API_LOAD_CONFIG.RATE_LIMIT_RPM + 10 // Exceed rate limit
      const promises: Promise<void>[] = []

      for (let i = 0; i < requests; i++) {
        const promise = (async () => {
          const startTime = Date.now()
          try {
            await textService.generateSocialText({
              contentIdea: `Test prompt ${i}`,
              platform: 'instagram',
              brandManual: {} as any,
              contentType: 'text_simple'
            })
            metrics.recordRequest(startTime, Date.now(), true, 'text')
          } catch (error) {
            metrics.recordRequest(startTime, Date.now(), false, 'text', (error as Error).message)
          }
        })()
        promises.push(promise)
      }

      await Promise.all(promises)
      
      const testMetrics = metrics.getMetrics()
      
      // Should have hit rate limits
      expect(testMetrics.failedRequests).toBeGreaterThan(0)
      expect(testMetrics.successfulRequests).toBeLessThanOrEqual(API_LOAD_CONFIG.RATE_LIMIT_RPM)
      
      console.log(`📊 Rate limiting test results:`)
      console.log(`   Total requests: ${testMetrics.totalRequests}`)
      console.log(`   Successful: ${testMetrics.successfulRequests}`)
      console.log(`   Failed: ${testMetrics.failedRequests}`)
      console.log(`   Success rate: ${(testMetrics.successRate * 100).toFixed(1)}%`)
    }, 120000)

    it('should handle burst requests within limits', async () => {
      const burstRequests = API_LOAD_CONFIG.BURST_SIZE
      const promises: Promise<void>[] = []

      // Send burst of requests simultaneously
      for (let i = 0; i < burstRequests; i++) {
        const promise = (async () => {
          const startTime = Date.now()
          try {
            await textService.generateSocialText({
              contentIdea: `Burst test prompt ${i}`,
              platform: 'instagram',
              brandManual: {} as any,
              contentType: 'text_simple'
            })
            metrics.recordRequest(startTime, Date.now(), true, 'text')
          } catch (error) {
            metrics.recordRequest(startTime, Date.now(), false, 'text', (error as Error).message)
          }
        })()
        promises.push(promise)
      }

      await Promise.all(promises)
      
      const testMetrics = metrics.getMetrics()
      
      // Most burst requests should succeed if within rate limits
      expect(testMetrics.successRate).toBeGreaterThan(0.8) // At least 80% success
      expect(testMetrics.avgDuration).toBeLessThan(10000) // Should complete within 10s
      
      console.log(`📊 Burst test results:`)
      console.log(`   Requests: ${testMetrics.totalRequests}`)
      console.log(`   Success rate: ${(testMetrics.successRate * 100).toFixed(1)}%`)
      console.log(`   Average duration: ${testMetrics.avgDuration.toFixed(2)}ms`)
    }, 60000)

    it('should distribute load evenly over time', async () => {
      const totalRequests = 30
      const intervalMs = 2000 // 2 seconds between batches
      const batchSize = 5
      
      const batches = Math.ceil(totalRequests / batchSize)
      
      for (let batch = 0; batch < batches; batch++) {
        const batchPromises: Promise<void>[] = []
        
        for (let i = 0; i < batchSize && (batch * batchSize + i) < totalRequests; i++) {
          const requestIndex = batch * batchSize + i
          const promise = (async () => {
            const startTime = Date.now()
            try {
              await textService.generateSocialText({
                contentIdea: `Distributed load test ${requestIndex}`,
                platform: 'instagram',
                brandManual: {} as any,
                contentType: 'text_simple'
              })
              metrics.recordRequest(startTime, Date.now(), true, 'text')
            } catch (error) {
              metrics.recordRequest(startTime, Date.now(), false, 'text', (error as Error).message)
            }
          })()
          batchPromises.push(promise)
        }
        
        await Promise.all(batchPromises)
        
        // Wait between batches to distribute load
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, intervalMs))
        }
      }
      
      const testMetrics = metrics.getMetrics()
      
      // Distributed load should have high success rate
      expect(testMetrics.successRate).toBeGreaterThan(0.9) // At least 90% success
      expect(testMetrics.testDuration).toBeGreaterThan((batches - 1) * intervalMs) // Should take expected time
      
      console.log(`📊 Distributed load test results:`)
      console.log(`   Total duration: ${testMetrics.testDuration.toFixed(2)}ms`)
      console.log(`   Success rate: ${(testMetrics.successRate * 100).toFixed(1)}%`)
      console.log(`   Throughput: ${testMetrics.throughput.toFixed(2)} req/sec`)
    }, 120000)
  })

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent text and image requests', async () => {
      const textRequests = 10
      const imageRequests = 5
      const promises: Promise<void>[] = []

      // Mix of text and image requests
      for (let i = 0; i < textRequests; i++) {
        const promise = (async () => {
          const startTime = Date.now()
          try {
            await textService.generateSocialText({
              contentIdea: `Concurrent text ${i}`,
              platform: 'instagram',
              brandManual: {} as any,
              contentType: 'text_simple'
            })
            metrics.recordRequest(startTime, Date.now(), true, 'text')
          } catch (error) {
            metrics.recordRequest(startTime, Date.now(), false, 'text', (error as Error).message)
          }
        })()
        promises.push(promise)
      }

      for (let i = 0; i < imageRequests; i++) {
        const promise = (async () => {
          const startTime = Date.now()
          try {
            await imageService.generateSimpleImage({
              contentIdea: `Concurrent image ${i}`,
              platform: 'instagram'
            })
            metrics.recordRequest(startTime, Date.now(), true, 'image')
          } catch (error) {
            metrics.recordRequest(startTime, Date.now(), false, 'image', (error as Error).message)
          }
        })()
        promises.push(promise)
      }

      await Promise.all(promises)
      
      const testMetrics = metrics.getMetrics()
      
      // Should handle mixed requests efficiently
      expect(testMetrics.totalRequests).toBe(textRequests + imageRequests)
      expect(testMetrics.successRate).toBeGreaterThan(0.7) // At least 70% success with mixed load
      
      console.log(`📊 Concurrent mixed requests test:`)
      console.log(`   Text requests: ${textRequests}, Image requests: ${imageRequests}`)
      console.log(`   Success rate: ${(testMetrics.successRate * 100).toFixed(1)}%`)
      console.log(`   Average duration: ${testMetrics.avgDuration.toFixed(2)}ms`)
    }, 180000)

    it('should maintain performance under high concurrency', async () => {
      const concurrentRequests = API_LOAD_CONFIG.CONCURRENT_REQUESTS * 2
      const promises: Promise<void>[] = []

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = (async () => {
          const startTime = Date.now()
          try {
            // Alternate between text and image requests
            if (i % 2 === 0) {
              await textService.generateSocialText({
                contentIdea: `High concurrency text ${i}`,
                platform: 'instagram',
                brandManual: {} as any,
                contentType: 'text_simple'
              })
              metrics.recordRequest(startTime, Date.now(), true, 'text')
            } else {
              await imageService.generateSimpleImage({
                contentIdea: `High concurrency image ${i}`,
                platform: 'instagram'
              })
              metrics.recordRequest(startTime, Date.now(), true, 'image')
            }
          } catch (error) {
            const requestType = i % 2 === 0 ? 'text' : 'image'
            metrics.recordRequest(startTime, Date.now(), false, requestType, (error as Error).message)
          }
        })()
        promises.push(promise)
      }

      await Promise.all(promises)
      
      const testMetrics = metrics.getMetrics()
      
      // High concurrency should still maintain reasonable performance
      expect(testMetrics.avgDuration).toBeLessThan(15000) // Average under 15s
      expect(testMetrics.maxDuration).toBeLessThan(30000) // Max under 30s
      
      console.log(`📊 High concurrency test:`)
      console.log(`   Concurrent requests: ${concurrentRequests}`)
      console.log(`   Success rate: ${(testMetrics.successRate * 100).toFixed(1)}%`)
      console.log(`   Avg duration: ${testMetrics.avgDuration.toFixed(2)}ms`)
      console.log(`   Max duration: ${testMetrics.maxDuration.toFixed(2)}ms`)
    }, 240000)
  })

  describe('Stress Testing', () => {
    it('should survive stress test with many requests', async () => {
      const stressRequests = API_LOAD_CONFIG.STRESS_TEST_REQUESTS
      const batchSize = 10
      const batches = Math.ceil(stressRequests / batchSize)
      
      console.log(`🔥 Starting stress test with ${stressRequests} requests in ${batches} batches`)
      
      for (let batch = 0; batch < batches; batch++) {
        const batchPromises: Promise<void>[] = []
        
        for (let i = 0; i < batchSize && (batch * batchSize + i) < stressRequests; i++) {
          const requestIndex = batch * batchSize + i
          const promise = (async () => {
            const startTime = Date.now()
            try {
              // Mix of request types
              if (requestIndex % 3 === 0) {
                await textService.generateSocialText({
                  contentIdea: `Stress test text ${requestIndex}`,
                  platform: 'instagram',
                  brandManual: {} as any,
                  contentType: 'text_simple'
                })
                metrics.recordRequest(startTime, Date.now(), true, 'text')
              } else {
                await imageService.generateSimpleImage({
                  contentIdea: `Stress test image ${requestIndex}`,
                  platform: 'instagram'
                })
                metrics.recordRequest(startTime, Date.now(), true, 'image')
              }
            } catch (error) {
              const requestType = requestIndex % 3 === 0 ? 'text' : 'image'
              metrics.recordRequest(startTime, Date.now(), false, requestType, (error as Error).message)
            }
          })()
          batchPromises.push(promise)
        }
        
        await Promise.all(batchPromises)
        
        // Brief pause between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Log progress
        if (batch % 10 === 0) {
          console.log(`   Completed batch ${batch + 1}/${batches}`)
        }
      }
      
      const testMetrics = metrics.getMetrics()
      
      // System should survive stress test
      expect(testMetrics.totalRequests).toBe(stressRequests)
      expect(testMetrics.successRate).toBeGreaterThan(0.5) // At least 50% success under stress
      expect(testMetrics.avgDuration).toBeLessThan(20000) // Average under 20s
      
      console.log(`📊 Stress test results:`)
      console.log(`   Total requests: ${testMetrics.totalRequests}`)
      console.log(`   Success rate: ${(testMetrics.successRate * 100).toFixed(1)}%`)
      console.log(`   Failed requests: ${testMetrics.failedRequests}`)
      console.log(`   Average duration: ${testMetrics.avgDuration.toFixed(2)}ms`)
      console.log(`   Throughput: ${testMetrics.throughput.toFixed(2)} req/sec`)
      console.log(`   Test duration: ${(testMetrics.testDuration / 1000).toFixed(2)}s`)
    }, 600000) // 10 minutes timeout for stress test

    it('should handle memory pressure during sustained load', async () => {
      const sustainedRequests = 50
      const memorySnapshots: number[] = []
      
      // Monitor memory usage
      const memoryInterval = setInterval(() => {
        memorySnapshots.push(process.memoryUsage().heapUsed / (1024 * 1024))
      }, 1000)
      
      const promises: Promise<void>[] = []
      
      for (let i = 0; i < sustainedRequests; i++) {
        const promise = (async () => {
          const startTime = Date.now()
          try {
            await textService.generateSocialText({
              contentIdea: `Memory pressure test ${i}`,
              platform: 'instagram',
              brandManual: {} as any,
              contentType: 'text_simple'
            })
            metrics.recordRequest(startTime, Date.now(), true, 'text')
          } catch (error) {
            metrics.recordRequest(startTime, Date.now(), false, 'text', (error as Error).message)
          }
        })()
        promises.push(promise)
        
        // Stagger requests to create sustained load
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      await Promise.all(promises)
      clearInterval(memoryInterval)
      
      const testMetrics = metrics.getMetrics()
      const maxMemory = Math.max(...memorySnapshots)
      const minMemory = Math.min(...memorySnapshots)
      const memoryGrowth = maxMemory - minMemory
      
      // Memory usage should remain reasonable
      expect(maxMemory).toBeLessThan(1000) // Less than 1GB
      expect(memoryGrowth).toBeLessThan(500) // Less than 500MB growth
      
      console.log(`📊 Memory pressure test:`)
      console.log(`   Requests: ${testMetrics.totalRequests}`)
      console.log(`   Success rate: ${(testMetrics.successRate * 100).toFixed(1)}%`)
      console.log(`   Peak memory: ${maxMemory.toFixed(2)}MB`)
      console.log(`   Memory growth: ${memoryGrowth.toFixed(2)}MB`)
    }, 300000)
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary service outages', async () => {
      let outageActive = true
      let requestCount = 0
      
      // Simulate service outage for first 10 requests
      vi.mocked(textService.generateSocialText).mockImplementation(async (params: any) => {
        requestCount++
        if (outageActive && requestCount <= 10) {
          throw new Error('Service temporarily unavailable')
        }
        if (requestCount === 11) {
          outageActive = false
          console.log('   Service recovered after 10 failed requests')
        }
        const text = await apiSimulator.simulateRequest('text')
        return {
          text,
          platform: params.platform,
          characterCount: text.length,
          withinLimits: true,
          metadata: {
            prompt: 'test prompt',
            model: 'gemini-pro',
            generationTime: 2000,
            retryCount: 0
          }
        }
      })
      
      const totalRequests = 20
      const promises: Promise<void>[] = []
      
      for (let i = 0; i < totalRequests; i++) {
        const promise = (async () => {
          const startTime = Date.now()
          try {
            await textService.generateSocialText({
              contentIdea: `Recovery test ${i}`,
              platform: 'instagram',
              brandManual: {} as any,
              contentType: 'text_simple'
            })
            metrics.recordRequest(startTime, Date.now(), true, 'text')
          } catch (error) {
            metrics.recordRequest(startTime, Date.now(), false, 'text', (error as Error).message)
          }
        })()
        promises.push(promise)
      }
      
      await Promise.all(promises)
      
      const testMetrics = metrics.getMetrics()
      
      // Should recover after outage
      expect(testMetrics.failedRequests).toBe(10) // First 10 should fail
      expect(testMetrics.successfulRequests).toBe(10) // Last 10 should succeed
      expect(testMetrics.successRate).toBe(0.5) // 50% overall success rate
      
      console.log(`📊 Service recovery test:`)
      console.log(`   Failed during outage: ${testMetrics.failedRequests}`)
      console.log(`   Succeeded after recovery: ${testMetrics.successfulRequests}`)
    }, 120000)

    it('should handle partial failures gracefully', async () => {
      // Simulate 20% error rate
      apiSimulator = new ApiResponseSimulator(2000, 0.3, 0.2)
      
      vi.mocked(textService.generateSocialText).mockImplementation(async (params: any) => {
        const text = await apiSimulator.simulateRequest('text')
        return {
          text,
          platform: params.platform,
          characterCount: text.length,
          withinLimits: true,
          metadata: {
            prompt: 'test prompt',
            model: 'gemini-pro',
            generationTime: 2000,
            retryCount: 0
          }
        }
      })
      
      const requests = 50
      const promises: Promise<void>[] = []
      
      for (let i = 0; i < requests; i++) {
        const promise = (async () => {
          const startTime = Date.now()
          try {
            await textService.generateSocialText({
              contentIdea: `Partial failure test ${i}`,
              platform: 'instagram',
              brandManual: {} as any,
              contentType: 'text_simple'
            })
            metrics.recordRequest(startTime, Date.now(), true, 'text')
          } catch (error) {
            metrics.recordRequest(startTime, Date.now(), false, 'text', (error as Error).message)
          }
        })()
        promises.push(promise)
      }
      
      await Promise.all(promises)
      
      const testMetrics = metrics.getMetrics()
      
      // Should handle partial failures gracefully
      expect(testMetrics.successRate).toBeGreaterThan(0.7) // At least 70% success
      expect(testMetrics.successRate).toBeLessThan(0.9) // Some failures expected
      expect(testMetrics.errorRate).toBeGreaterThan(0.1) // Some errors expected
      
      console.log(`📊 Partial failure test:`)
      console.log(`   Success rate: ${(testMetrics.successRate * 100).toFixed(1)}%`)
      console.log(`   Error rate: ${(testMetrics.errorRate * 100).toFixed(1)}%`)
      console.log(`   Average duration: ${testMetrics.avgDuration.toFixed(2)}ms`)
    }, 180000)
  })
})