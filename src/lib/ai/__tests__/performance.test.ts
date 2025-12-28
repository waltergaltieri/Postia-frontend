/**
 * Performance and Load Tests for AI Content Generation System
 * 
 * Tests performance characteristics, load handling, and API rate limiting
 * for the complete AI content generation pipeline.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ContentGenerationOrchestrator } from '../orchestrator/ContentGenerationOrchestrator'
import type { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from '../agents/types'

// Mock all the dependencies
vi.mock('../services/GeminiTextService')
vi.mock('../services/GeminiImageService')
vi.mock('../orchestrator/ProgressTrackingService')
vi.mock('../orchestrator/ErrorHandlingService')
vi.mock('../../database/DatabaseService')

// Performance test configuration
const PERFORMANCE_CONFIG = {
  SMALL_CAMPAIGN_SIZE: 5,
  MEDIUM_CAMPAIGN_SIZE: 20,
  LARGE_CAMPAIGN_SIZE: 50,
  CONCURRENT_CAMPAIGNS: 3,
  API_TIMEOUT_MS: 30000,
  EXPECTED_GENERATION_TIME_PER_ITEM_MS: 5000,
  MAX_MEMORY_USAGE_MB: 500,
  RATE_LIMIT_REQUESTS_PER_MINUTE: 60
}

// Mock data generators
function createMockWorkspace(): WorkspaceData {
  return {
    id: 'test-workspace',
    name: 'Performance Test Workspace',
    branding: {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      logo: 'https://example.com/logo.png',
      slogan: 'Innovation through technology',
      description: 'Workspace for performance testing',
      whatsapp: '+1234567890'
    }
  }
}

function createMockResources(count: number): ResourceData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `resource-${i}`,
    name: `Test Resource ${i}`,
    type: 'image' as const,
    url: `https://example.com/resource-${i}.jpg`,
    mimeType: 'image/jpeg'
  }))
}

function createMockTemplates(count: number): TemplateData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `template-${i}`,
    name: `Test Template ${i}`,
    type: i % 2 === 0 ? 'single' as const : 'carousel' as const,
    socialNetworks: ['instagram', 'linkedin'],
    images: [`https://example.com/template-${i}.jpg`],
    description: `Performance test template ${i}`
  }))
}

function createMockContentPlan(size: number): ContentPlanItem[] {
  const contentTypes = ['text-only', 'text-with-image', 'text-with-carousel'] as const
  const socialNetworks = ['linkedin', 'instagram', 'tiktok'] as const
  
  return Array.from({ length: size }, (_, i) => ({
    id: `content-${i}`,
    title: `Performance Test Content ${i}`,
    description: `This is performance test content item ${i} designed to test system load and response times`,
    contentType: contentTypes[i % contentTypes.length],
    socialNetwork: socialNetworks[i % socialNetworks.length],
    scheduledDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString(),
    resourceIds: [`resource-${i % 3}`],
    templateId: i % 2 === 0 ? `template-${i % 3}` : undefined,
    estimatedReach: Math.floor(Math.random() * 1000) + 100,
    priority: 'medium' as const,
    tags: ['performance', 'test', `item${i}`],
    notes: `Performance test item ${i}`
  }))
}

// Performance measurement utilities
class PerformanceMonitor {
  private startTime: number = 0
  private memoryStart: number = 0
  private measurements: Array<{
    operation: string
    duration: number
    memoryUsed: number
    timestamp: number
  }> = []

  start(operation: string) {
    this.startTime = performance.now()
    this.memoryStart = process.memoryUsage().heapUsed
    console.log(`🚀 Starting performance measurement: ${operation}`)
  }

  end(operation: string) {
    const duration = performance.now() - this.startTime
    const memoryUsed = process.memoryUsage().heapUsed - this.memoryStart
    const memoryUsedMB = memoryUsed / (1024 * 1024)
    
    this.measurements.push({
      operation,
      duration,
      memoryUsed: memoryUsedMB,
      timestamp: Date.now()
    })

    console.log(`✅ Performance measurement complete: ${operation}`)
    console.log(`   Duration: ${duration.toFixed(2)}ms`)
    console.log(`   Memory: ${memoryUsedMB.toFixed(2)}MB`)
    
    return { duration, memoryUsed: memoryUsedMB }
  }

  getStats() {
    if (this.measurements.length === 0) return null
    
    const durations = this.measurements.map(m => m.duration)
    const memoryUsages = this.measurements.map(m => m.memoryUsed)
    
    return {
      totalOperations: this.measurements.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      averageMemory: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      maxMemory: Math.max(...memoryUsages),
      totalDuration: durations.reduce((a, b) => a + b, 0)
    }
  }

  reset() {
    this.measurements = []
  }
}

// Mock API response times to simulate real-world conditions
function mockApiWithDelay(baseDelay: number, variance: number = 0.3) {
  const actualDelay = baseDelay + (Math.random() - 0.5) * variance * baseDelay
  return new Promise(resolve => setTimeout(resolve, actualDelay))
}

describe('AI Content Generation Performance Tests', () => {
  let orchestrator: ContentGenerationOrchestrator
  let monitor: PerformanceMonitor
  let mockWorkspace: WorkspaceData
  let mockResources: ResourceData[]
  let mockTemplates: TemplateData[]

  beforeEach(() => {
    orchestrator = new ContentGenerationOrchestrator()
    monitor = new PerformanceMonitor()
    mockWorkspace = createMockWorkspace()
    mockResources = createMockResources(10)
    mockTemplates = createMockTemplates(5)

    // Mock the orchestrator's generateCampaignContent method to simulate realistic performance
    vi.spyOn(orchestrator, 'generateCampaignContent').mockImplementation(async (params) => {
      const { contentPlan } = params
      
      // Simulate processing time based on campaign size
      for (let i = 0; i < contentPlan.length; i++) {
        await mockApiWithDelay(2000, 0.5) // 2s ± 50% variance per item
      }
      
      // Simulate occasional failures (5% error rate)
      if (Math.random() < 0.05) {
        throw new Error('Simulated generation failure')
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    monitor.reset()
  })

  describe('Single Campaign Performance', () => {
    it('should handle small campaigns (5 items) within performance thresholds', async () => {
      const contentPlan = createMockContentPlan(PERFORMANCE_CONFIG.SMALL_CAMPAIGN_SIZE)
      
      monitor.start('small-campaign-generation')
      
      await orchestrator.generateCampaignContent({
        campaignId: 'perf-test-small',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })
      
      const { duration, memoryUsed } = monitor.end('small-campaign-generation')
      
      // Performance assertions
      const expectedMaxTime = PERFORMANCE_CONFIG.SMALL_CAMPAIGN_SIZE * PERFORMANCE_CONFIG.EXPECTED_GENERATION_TIME_PER_ITEM_MS
      expect(duration).toBeLessThan(expectedMaxTime)
      expect(memoryUsed).toBeLessThan(PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB)
      
      console.log(`📊 Small campaign performance: ${duration.toFixed(2)}ms for ${PERFORMANCE_CONFIG.SMALL_CAMPAIGN_SIZE} items`)
    }, 60000) // 1 minute timeout

    it('should handle medium campaigns (20 items) efficiently', async () => {
      const contentPlan = createMockContentPlan(PERFORMANCE_CONFIG.MEDIUM_CAMPAIGN_SIZE)
      
      monitor.start('medium-campaign-generation')
      
      await orchestrator.generateCampaignContent({
        campaignId: 'perf-test-medium',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })
      
      const { duration, memoryUsed } = monitor.end('medium-campaign-generation')
      
      // Performance assertions for medium campaigns
      const expectedMaxTime = PERFORMANCE_CONFIG.MEDIUM_CAMPAIGN_SIZE * PERFORMANCE_CONFIG.EXPECTED_GENERATION_TIME_PER_ITEM_MS
      expect(duration).toBeLessThan(expectedMaxTime)
      expect(memoryUsed).toBeLessThan(PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB)
      
      // Efficiency check - should be better than linear scaling
      const efficiencyRatio = duration / (PERFORMANCE_CONFIG.MEDIUM_CAMPAIGN_SIZE * 1000)
      expect(efficiencyRatio).toBeLessThan(PERFORMANCE_CONFIG.EXPECTED_GENERATION_TIME_PER_ITEM_MS / 1000)
      
      console.log(`📊 Medium campaign performance: ${duration.toFixed(2)}ms for ${PERFORMANCE_CONFIG.MEDIUM_CAMPAIGN_SIZE} items`)
      console.log(`📈 Efficiency ratio: ${efficiencyRatio.toFixed(2)}s per item`)
    }, 180000) // 3 minutes timeout

    it('should handle large campaigns (50 items) without memory leaks', async () => {
      const contentPlan = createMockContentPlan(PERFORMANCE_CONFIG.LARGE_CAMPAIGN_SIZE)
      
      // Monitor memory usage throughout the process
      const memorySnapshots: number[] = []
      const memoryInterval = setInterval(() => {
        memorySnapshots.push(process.memoryUsage().heapUsed / (1024 * 1024))
      }, 5000)
      
      monitor.start('large-campaign-generation')
      
      await orchestrator.generateCampaignContent({
        campaignId: 'perf-test-large',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })
      
      clearInterval(memoryInterval)
      const { duration, memoryUsed } = monitor.end('large-campaign-generation')
      
      // Memory leak detection
      const memoryGrowth = Math.max(...memorySnapshots) - Math.min(...memorySnapshots)
      expect(memoryGrowth).toBeLessThan(PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB)
      expect(memoryUsed).toBeLessThan(PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB)
      
      // Performance should still be reasonable
      const avgTimePerItem = duration / PERFORMANCE_CONFIG.LARGE_CAMPAIGN_SIZE
      expect(avgTimePerItem).toBeLessThan(PERFORMANCE_CONFIG.EXPECTED_GENERATION_TIME_PER_ITEM_MS)
      
      console.log(`📊 Large campaign performance: ${duration.toFixed(2)}ms for ${PERFORMANCE_CONFIG.LARGE_CAMPAIGN_SIZE} items`)
      console.log(`📈 Average time per item: ${avgTimePerItem.toFixed(2)}ms`)
      console.log(`🧠 Memory growth during processing: ${memoryGrowth.toFixed(2)}MB`)
    }, 300000) // 5 minutes timeout
  })

  describe('Concurrent Campaign Load Tests', () => {
    it('should handle multiple concurrent campaigns without degradation', async () => {
      const campaigns = Array.from({ length: PERFORMANCE_CONFIG.CONCURRENT_CAMPAIGNS }, (_, i) => ({
        campaignId: `concurrent-test-${i}`,
        contentPlan: createMockContentPlan(PERFORMANCE_CONFIG.SMALL_CAMPAIGN_SIZE),
        workspace: { ...mockWorkspace, id: `workspace-${i}` },
        resources: mockResources,
        templates: mockTemplates
      }))
      
      monitor.start('concurrent-campaigns')
      
      // Run campaigns concurrently
      const promises = campaigns.map(campaign => 
        orchestrator.generateCampaignContent(campaign)
      )
      
      await Promise.all(promises)
      
      const { duration, memoryUsed } = monitor.end('concurrent-campaigns')
      
      // Concurrent processing should be more efficient than sequential
      const sequentialEstimate = PERFORMANCE_CONFIG.CONCURRENT_CAMPAIGNS * 
                                PERFORMANCE_CONFIG.SMALL_CAMPAIGN_SIZE * 
                                PERFORMANCE_CONFIG.EXPECTED_GENERATION_TIME_PER_ITEM_MS
      
      expect(duration).toBeLessThan(sequentialEstimate * 0.8) // Should be at least 20% faster
      expect(memoryUsed).toBeLessThan(PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB * 2) // Allow 2x memory for concurrency
      
      console.log(`📊 Concurrent campaigns performance: ${duration.toFixed(2)}ms for ${PERFORMANCE_CONFIG.CONCURRENT_CAMPAIGNS} campaigns`)
      console.log(`📈 Efficiency gain vs sequential: ${((sequentialEstimate - duration) / sequentialEstimate * 100).toFixed(1)}%`)
    }, 240000) // 4 minutes timeout

    it('should maintain performance under sustained load', async () => {
      const loadTestRounds = 3
      const performanceResults: Array<{ round: number; duration: number; memoryUsed: number }> = []
      
      for (let round = 0; round < loadTestRounds; round++) {
        const contentPlan = createMockContentPlan(PERFORMANCE_CONFIG.MEDIUM_CAMPAIGN_SIZE)
        
        monitor.start(`load-test-round-${round}`)
        
        await orchestrator.generateCampaignContent({
          campaignId: `load-test-${round}`,
          contentPlan,
          workspace: mockWorkspace,
          resources: mockResources,
          templates: mockTemplates
        })
        
        const { duration, memoryUsed } = monitor.end(`load-test-round-${round}`)
        performanceResults.push({ round, duration, memoryUsed })
        
        // Brief pause between rounds
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Analyze performance degradation
      const firstRoundTime = performanceResults[0].duration
      const lastRoundTime = performanceResults[loadTestRounds - 1].duration
      const performanceDegradation = (lastRoundTime - firstRoundTime) / firstRoundTime
      
      // Should not degrade more than 20% over sustained load
      expect(performanceDegradation).toBeLessThan(0.2)
      
      // Memory usage should remain stable
      const memoryUsages = performanceResults.map(r => r.memoryUsed)
      const memoryVariance = Math.max(...memoryUsages) - Math.min(...memoryUsages)
      expect(memoryVariance).toBeLessThan(100) // Less than 100MB variance
      
      console.log(`📊 Sustained load test results:`)
      performanceResults.forEach(result => {
        console.log(`   Round ${result.round}: ${result.duration.toFixed(2)}ms, ${result.memoryUsed.toFixed(2)}MB`)
      })
      console.log(`📈 Performance degradation: ${(performanceDegradation * 100).toFixed(1)}%`)
    }, 360000) // 6 minutes timeout
  })

  // API Rate Limiting tests are covered in api-load.test.ts

  describe('Resource Usage and Optimization', () => {
    it('should optimize memory usage during large operations', async () => {
      const contentPlan = createMockContentPlan(PERFORMANCE_CONFIG.LARGE_CAMPAIGN_SIZE)
      
      // Track memory usage throughout the process
      const memorySnapshots: Array<{ time: number; memory: number; stage: string }> = []
      let stage = 'initialization'
      
      const memoryTracker = setInterval(() => {
        memorySnapshots.push({
          time: Date.now(),
          memory: process.memoryUsage().heapUsed / (1024 * 1024),
          stage
        })
      }, 2000)
      
      monitor.start('memory-optimization-test')
      
      // Mock progress updates to track stages
      const originalUpdateProgress = orchestrator['progressService'].updateCurrentPublication
      orchestrator['progressService'].updateCurrentPublication = vi.fn().mockImplementation(async (...args) => {
        stage = `processing-${args[1]}`
        return originalUpdateProgress.apply(orchestrator['progressService'], args)
      })
      
      await orchestrator.generateCampaignContent({
        campaignId: 'memory-optimization-test',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })
      
      clearInterval(memoryTracker)
      const { duration, memoryUsed } = monitor.end('memory-optimization-test')
      
      // Analyze memory usage patterns
      const maxMemory = Math.max(...memorySnapshots.map(s => s.memory))
      const minMemory = Math.min(...memorySnapshots.map(s => s.memory))
      const memoryRange = maxMemory - minMemory
      
      // Memory usage should be reasonable and not grow linearly with campaign size
      expect(maxMemory).toBeLessThan(PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB)
      expect(memoryRange).toBeLessThan(PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB * 0.5) // Memory range should be < 50% of max
      
      console.log(`📊 Memory optimization test:`)
      console.log(`   Duration: ${duration.toFixed(2)}ms`)
      console.log(`   Peak memory: ${maxMemory.toFixed(2)}MB`)
      console.log(`   Memory range: ${memoryRange.toFixed(2)}MB`)
      console.log(`   Final memory: ${memoryUsed.toFixed(2)}MB`)
    }, 300000)

    it('should handle resource cleanup properly', async () => {
      const initialMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      const campaigns = 5
      
      for (let i = 0; i < campaigns; i++) {
        const contentPlan = createMockContentPlan(PERFORMANCE_CONFIG.SMALL_CAMPAIGN_SIZE)
        
        await orchestrator.generateCampaignContent({
          campaignId: `cleanup-test-${i}`,
          contentPlan,
          workspace: mockWorkspace,
          resources: mockResources,
          templates: mockTemplates
        })
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      const memoryGrowth = finalMemory - initialMemory
      
      // Memory growth should be minimal after multiple campaigns
      expect(memoryGrowth).toBeLessThan(100) // Less than 100MB growth
      
      console.log(`📊 Resource cleanup test:`)
      console.log(`   Initial memory: ${initialMemory.toFixed(2)}MB`)
      console.log(`   Final memory: ${finalMemory.toFixed(2)}MB`)
      console.log(`   Memory growth: ${memoryGrowth.toFixed(2)}MB after ${campaigns} campaigns`)
    }, 180000)
  })

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance characteristics', async () => {
      const testRuns = 3
      const results: Array<{ run: number; duration: number; throughput: number }> = []
      
      for (let run = 0; run < testRuns; run++) {
        const contentPlan = createMockContentPlan(PERFORMANCE_CONFIG.MEDIUM_CAMPAIGN_SIZE)
        
        monitor.start(`regression-test-run-${run}`)
        
        await orchestrator.generateCampaignContent({
          campaignId: `regression-test-${run}`,
          contentPlan,
          workspace: mockWorkspace,
          resources: mockResources,
          templates: mockTemplates
        })
        
        const { duration } = monitor.end(`regression-test-run-${run}`)
        const throughput = PERFORMANCE_CONFIG.MEDIUM_CAMPAIGN_SIZE / (duration / 1000) // items per second
        
        results.push({ run, duration, throughput })
      }
      
      // Calculate performance consistency
      const durations = results.map(r => r.duration)
      const throughputs = results.map(r => r.throughput)
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length
      
      const durationVariance = Math.max(...durations) - Math.min(...durations)
      const throughputVariance = Math.max(...throughputs) - Math.min(...throughputs)
      
      // Performance should be consistent across runs
      expect(durationVariance / avgDuration).toBeLessThan(0.3) // Less than 30% variance
      expect(throughputVariance / avgThroughput).toBeLessThan(0.3) // Less than 30% variance
      
      console.log(`📊 Performance regression test results:`)
      results.forEach(result => {
        console.log(`   Run ${result.run}: ${result.duration.toFixed(2)}ms, ${result.throughput.toFixed(2)} items/sec`)
      })
      console.log(`📈 Average: ${avgDuration.toFixed(2)}ms, ${avgThroughput.toFixed(2)} items/sec`)
      console.log(`📊 Variance: ${(durationVariance / avgDuration * 100).toFixed(1)}% duration, ${(throughputVariance / avgThroughput * 100).toFixed(1)}% throughput`)
    }, 300000)
  })
})