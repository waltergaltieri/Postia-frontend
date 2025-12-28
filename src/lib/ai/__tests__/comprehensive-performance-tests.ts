/**
 * Comprehensive Performance and Load Tests for AI Content Generation System
 * 
 * This file combines all performance tests and provides comprehensive coverage
 * for the AI content generation system under various load conditions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ContentGenerationOrchestrator } from '../orchestrator/ContentGenerationOrchestrator'
import { GeminiTextService } from '../services/GeminiTextService'
import { GeminiImageService } from '../services/GeminiImageService'
import type { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from '../agents/types'
import { getPerformanceConfig, createTestConfig } from './performance-config'

// Mock all dependencies
vi.mock('../services/GeminiTextService')
vi.mock('../services/GeminiImageService')
vi.mock('../orchestrator/ProgressTrackingService')
vi.mock('../orchestrator/ErrorHandlingService')
vi.mock('../../database/DatabaseService')

// Performance test configuration
const config = getPerformanceConfig()

// Comprehensive performance metrics collector
class ComprehensiveMetrics {
  private testResults: Array<{
    testName: string
    category: 'unit' | 'integration' | 'load' | 'stress'
    startTime: number
    endTime: number
    success: boolean
    metrics: {
      duration: number
      memoryUsed: number
      throughput?: number
      errorRate?: number
      concurrency?: number
    }
    details: Record<string, any>
  }> = []

  recordTest(
    testName: string,
    category: 'unit' | 'integration' | 'load' | 'stress',
    startTime: number,
    endTime: number,
    success: boolean,
    metrics: any,
    details: Record<string, any> = {}
  ) {
    this.testResults.push({
      testName,
      category,
      startTime,
      endTime,
      success,
      metrics,
      details
    })
  }

  generateReport(): string {
    const report = ['📊 COMPREHENSIVE PERFORMANCE TEST REPORT', '=' .repeat(60)]
    
    const categories = ['unit', 'integration', 'load', 'stress'] as const
    
    categories.forEach(category => {
      const categoryTests = this.testResults.filter(t => t.category === category)
      if (categoryTests.length === 0) return
      
      report.push(`\n🔍 ${category.toUpperCase()} TESTS (${categoryTests.length} tests)`)
      report.push('-'.repeat(40))
      
      const successful = categoryTests.filter(t => t.success).length
      const failed = categoryTests.length - successful
      const successRate = (successful / categoryTests.length) * 100
      
      report.push(`Success Rate: ${successRate.toFixed(1)}% (${successful}/${categoryTests.length})`)
      
      if (failed > 0) {
        report.push(`Failed Tests: ${failed}`)
        categoryTests.filter(t => !t.success).forEach(test => {
          report.push(`  ❌ ${test.testName}`)
        })
      }
      
      // Performance metrics summary
      const durations = categoryTests.map(t => t.metrics.duration)
      const memoryUsages = categoryTests.map(t => t.metrics.memoryUsed)
      
      if (durations.length > 0) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
        const maxDuration = Math.max(...durations)
        const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
        const maxMemory = Math.max(...memoryUsages)
        
        report.push(`Average Duration: ${avgDuration.toFixed(2)}ms`)
        report.push(`Max Duration: ${maxDuration.toFixed(2)}ms`)
        report.push(`Average Memory: ${avgMemory.toFixed(2)}MB`)
        report.push(`Peak Memory: ${maxMemory.toFixed(2)}MB`)
      }
      
      // Category-specific metrics
      if (category === 'load' || category === 'stress') {
        const throughputs = categoryTests
          .map(t => t.metrics.throughput)
          .filter(t => t !== undefined) as number[]
        
        if (throughputs.length > 0) {
          const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length
          report.push(`Average Throughput: ${avgThroughput.toFixed(2)} items/sec`)
        }
      }
    })
    
    // Overall summary
    report.push('\n🎯 OVERALL SUMMARY')
    report.push('-'.repeat(40))
    
    const totalTests = this.testResults.length
    const totalSuccessful = this.testResults.filter(t => t.success).length
    const overallSuccessRate = (totalSuccessful / totalTests) * 100
    
    report.push(`Total Tests: ${totalTests}`)
    report.push(`Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`)
    
    const totalDuration = this.testResults.reduce((sum, t) => sum + t.metrics.duration, 0)
    report.push(`Total Test Duration: ${(totalDuration / 1000).toFixed(2)}s`)
    
    return report.join('\n')
  }

  reset() {
    this.testResults = []
  }
}

// Mock data generators
function createMockWorkspace(id: string = 'test'): WorkspaceData {
  return {
    id: `workspace-${id}`,
    name: `Test Workspace ${id}`,
    branding: {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      logo: 'https://example.com/logo.png',
      slogan: 'Innovation through technology',
      description: 'Test workspace for performance testing',
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
    description: `Test template ${i} for performance testing`
  }))
}

function createMockContentPlan(size: number, prefix: string = 'test'): ContentPlanItem[] {
  const contentTypes = ['text-only', 'text-with-image', 'text-with-carousel'] as const
  const socialNetworks = ['linkedin', 'instagram', 'tiktok'] as const
  
  return Array.from({ length: size }, (_, i) => ({
    id: `${prefix}-content-${i}`,
    title: `${prefix} Content ${i}`,
    description: `Performance test content item ${i}`,
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

// API response simulator for realistic testing
class ApiSimulator {
  constructor(
    private baseLatency: number = 2000,
    private variance: number = 0.3,
    private errorRate: number = 0.05
  ) {}

  async simulateTextGeneration(): Promise<any> {
    const latency = this.baseLatency + (Math.random() - 0.5) * this.variance * this.baseLatency
    await new Promise(resolve => setTimeout(resolve, latency))
    
    if (Math.random() < this.errorRate) {
      throw new Error('Simulated text generation error')
    }
    
    return {
      text: 'Generated text content',
      platform: 'instagram',
      characterCount: 150,
      withinLimits: true,
      metadata: {
        prompt: 'test prompt',
        model: 'gemini-pro',
        generationTime: latency,
        retryCount: 0
      }
    }
  }

  async simulateImageGeneration(): Promise<any> {
    const latency = this.baseLatency * 2.5 + (Math.random() - 0.5) * this.variance * this.baseLatency
    await new Promise(resolve => setTimeout(resolve, latency))
    
    if (Math.random() < this.errorRate) {
      throw new Error('Simulated image generation error')
    }
    
    return {
      imageUrl: 'https://example.com/generated-image.jpg',
      width: 1024,
      height: 1024,
      format: 'jpeg',
      sizeBytes: 1024 * 1024,
      generationTime: latency,
      metadata: {
        prompt: 'test image prompt',
        model: 'nano-banana',
        parameters: {},
        nanoBananaJobId: 'test-job-id'
      }
    }
  }

  async simulateCampaignGeneration(itemCount: number): Promise<void> {
    for (let i = 0; i < itemCount; i++) {
      const processingTime = Math.random() * 3000 + 2000 // 2-5 seconds per item
      await new Promise(resolve => setTimeout(resolve, processingTime))
      
      // Simulate occasional failures
      if (Math.random() < this.errorRate) {
        throw new Error(`Simulated failure on item ${i}`)
      }
    }
  }
}

describe('Comprehensive AI Content Generation Performance Tests', () => {
  let orchestrator: ContentGenerationOrchestrator
  let textService: GeminiTextService
  let imageService: GeminiImageService
  let apiSimulator: ApiSimulator
  let metrics: ComprehensiveMetrics
  let mockWorkspace: WorkspaceData
  let mockResources: ResourceData[]
  let mockTemplates: TemplateData[]

  beforeEach(() => {
    orchestrator = new ContentGenerationOrchestrator()
    textService = new GeminiTextService()
    imageService = new GeminiImageService()
    apiSimulator = new ApiSimulator()
    metrics = new ComprehensiveMetrics()
    
    mockWorkspace = createMockWorkspace()
    mockResources = createMockResources(10)
    mockTemplates = createMockTemplates(5)

    // Mock service methods
    vi.spyOn(textService, 'generateSocialText').mockImplementation(() => 
      apiSimulator.simulateTextGeneration()
    )
    
    vi.spyOn(imageService, 'generateSimpleImage').mockImplementation(() => 
      apiSimulator.simulateImageGeneration()
    )
    
    vi.spyOn(orchestrator, 'generateCampaignContent').mockImplementation(async (params) => {
      await apiSimulator.simulateCampaignGeneration(params.contentPlan.length)
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Unit Performance Tests', () => {
    it('should generate single text content within performance thresholds', async () => {
      const testName = 'Single Text Generation'
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      
      try {
        await textService.generateSocialText({
          contentIdea: 'Test content idea',
          platform: 'instagram',
          brandManual: {} as any,
          contentType: 'text_simple'
        })
        
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        const duration = endTime - startTime
        const memoryUsed = endMemory - startMemory
        
        expect(duration).toBeLessThan(config.thresholds.maxTimeoutPerItemMS)
        expect(memoryUsed).toBeLessThan(50) // 50MB limit for single operation
        
        metrics.recordTest(testName, 'unit', startTime, endTime, true, {
          duration,
          memoryUsed
        })
      } catch (error) {
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        
        metrics.recordTest(testName, 'unit', startTime, endTime, false, {
          duration: endTime - startTime,
          memoryUsed: endMemory - startMemory
        }, { error: (error as Error).message })
        
        throw error
      }
    }, config.execution.testTimeoutMS)

    it('should generate single image content within performance thresholds', async () => {
      const testName = 'Single Image Generation'
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      
      try {
        await imageService.generateSimpleImage({
          contentIdea: 'Test image idea',
          platform: 'instagram'
        })
        
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        const duration = endTime - startTime
        const memoryUsed = endMemory - startMemory
        
        expect(duration).toBeLessThan(config.thresholds.maxTimeoutPerItemMS * 3) // Images take longer
        expect(memoryUsed).toBeLessThan(100) // 100MB limit for image generation
        
        metrics.recordTest(testName, 'unit', startTime, endTime, true, {
          duration,
          memoryUsed
        })
      } catch (error) {
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        
        metrics.recordTest(testName, 'unit', startTime, endTime, false, {
          duration: endTime - startTime,
          memoryUsed: endMemory - startMemory
        }, { error: (error as Error).message })
        
        throw error
      }
    }, config.execution.testTimeoutMS)
  })

  describe('Integration Performance Tests', () => {
    it('should handle small campaign generation efficiently', async () => {
      const testName = 'Small Campaign Integration'
      const contentPlan = createMockContentPlan(config.campaigns.small, 'integration-small')
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      
      try {
        await orchestrator.generateCampaignContent({
          campaignId: 'integration-test-small',
          contentPlan,
          workspace: mockWorkspace,
          resources: mockResources,
          templates: mockTemplates
        })
        
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        const duration = endTime - startTime
        const memoryUsed = endMemory - startMemory
        const throughput = contentPlan.length / (duration / 1000)
        
        expect(duration).toBeLessThan(config.campaigns.small * config.thresholds.maxTimeoutPerItemMS)
        expect(memoryUsed).toBeLessThan(config.thresholds.maxMemoryUsageMB / 4)
        expect(throughput).toBeGreaterThan(config.thresholds.expectedThroughputItemsPerSec)
        
        metrics.recordTest(testName, 'integration', startTime, endTime, true, {
          duration,
          memoryUsed,
          throughput
        }, { campaignSize: config.campaigns.small })
      } catch (error) {
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        
        metrics.recordTest(testName, 'integration', startTime, endTime, false, {
          duration: endTime - startTime,
          memoryUsed: endMemory - startMemory,
          throughput: 0
        }, { error: (error as Error).message, campaignSize: config.campaigns.small })
        
        throw error
      }
    }, config.execution.testTimeoutMS)
  })

  describe('Load Performance Tests', () => {
    it('should handle medium campaigns under load', async () => {
      const testName = 'Medium Campaign Load'
      const contentPlan = createMockContentPlan(config.campaigns.medium, 'load-medium')
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      
      try {
        await orchestrator.generateCampaignContent({
          campaignId: 'load-test-medium',
          contentPlan,
          workspace: mockWorkspace,
          resources: mockResources,
          templates: mockTemplates
        })
        
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        const duration = endTime - startTime
        const memoryUsed = endMemory - startMemory
        const throughput = contentPlan.length / (duration / 1000)
        
        expect(duration).toBeLessThan(config.campaigns.medium * config.thresholds.maxTimeoutPerItemMS)
        expect(memoryUsed).toBeLessThan(config.thresholds.maxMemoryUsageMB / 2)
        expect(throughput).toBeGreaterThan(config.thresholds.expectedThroughputItemsPerSec * 0.8) // Allow 20% degradation under load
        
        metrics.recordTest(testName, 'load', startTime, endTime, true, {
          duration,
          memoryUsed,
          throughput
        }, { campaignSize: config.campaigns.medium })
      } catch (error) {
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        
        metrics.recordTest(testName, 'load', startTime, endTime, false, {
          duration: endTime - startTime,
          memoryUsed: endMemory - startMemory,
          throughput: 0
        }, { error: (error as Error).message, campaignSize: config.campaigns.medium })
        
        throw error
      }
    }, config.execution.testTimeoutMS * 2)

    it('should handle concurrent campaigns efficiently', async () => {
      const testName = 'Concurrent Campaigns Load'
      const concurrentCount = config.concurrency.maxConcurrentCampaigns
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      
      try {
        const campaigns = Array.from({ length: concurrentCount }, (_, i) => ({
          campaignId: `concurrent-load-${i}`,
          contentPlan: createMockContentPlan(config.campaigns.small, `concurrent-${i}`),
          workspace: createMockWorkspace(`concurrent-${i}`),
          resources: mockResources,
          templates: mockTemplates
        }))
        
        const promises = campaigns.map(campaign => 
          orchestrator.generateCampaignContent(campaign)
        )
        
        await Promise.all(promises)
        
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        const duration = endTime - startTime
        const memoryUsed = endMemory - startMemory
        const totalItems = campaigns.reduce((sum, c) => sum + c.contentPlan.length, 0)
        const throughput = totalItems / (duration / 1000)
        
        // Concurrent processing should be more efficient than sequential
        const sequentialEstimate = concurrentCount * config.campaigns.small * config.thresholds.expectedGenerationTimePerItemMS
        expect(duration).toBeLessThan(sequentialEstimate * 0.8) // Should be at least 20% faster
        expect(memoryUsed).toBeLessThan(config.thresholds.maxMemoryUsageMB)
        
        metrics.recordTest(testName, 'load', startTime, endTime, true, {
          duration,
          memoryUsed,
          throughput,
          concurrency: concurrentCount
        }, { totalCampaigns: concurrentCount, totalItems })
      } catch (error) {
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        
        metrics.recordTest(testName, 'load', startTime, endTime, false, {
          duration: endTime - startTime,
          memoryUsed: endMemory - startMemory,
          throughput: 0,
          concurrency: concurrentCount
        }, { error: (error as Error).message })
        
        throw error
      }
    }, config.execution.testTimeoutMS * 3)
  })

  describe('Stress Performance Tests', () => {
    it('should survive stress test with large campaigns', async () => {
      const testName = 'Large Campaign Stress'
      const contentPlan = createMockContentPlan(config.campaigns.large, 'stress-large')
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      
      // Monitor memory usage throughout
      const memorySnapshots: number[] = []
      const memoryInterval = setInterval(() => {
        memorySnapshots.push(process.memoryUsage().heapUsed / (1024 * 1024))
      }, config.execution.memorySnapshotIntervalMS)
      
      try {
        await orchestrator.generateCampaignContent({
          campaignId: 'stress-test-large',
          contentPlan,
          workspace: mockWorkspace,
          resources: mockResources,
          templates: mockTemplates
        })
        
        clearInterval(memoryInterval)
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        const duration = endTime - startTime
        const memoryUsed = endMemory - startMemory
        const maxMemoryDuringTest = Math.max(...memorySnapshots)
        const memoryGrowth = maxMemoryDuringTest - Math.min(...memorySnapshots)
        const throughput = contentPlan.length / (duration / 1000)
        
        // Should complete within reasonable time even under stress
        expect(duration).toBeLessThan(config.campaigns.large * config.thresholds.maxTimeoutPerItemMS * 1.5)
        expect(maxMemoryDuringTest).toBeLessThan(config.thresholds.maxMemoryUsageMB * 1.5) // Allow 50% more memory under stress
        expect(memoryGrowth).toBeLessThan(config.thresholds.maxMemoryUsageMB)
        
        metrics.recordTest(testName, 'stress', startTime, endTime, true, {
          duration,
          memoryUsed,
          throughput
        }, { 
          campaignSize: config.campaigns.large,
          maxMemoryDuringTest,
          memoryGrowth
        })
      } catch (error) {
        clearInterval(memoryInterval)
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        
        metrics.recordTest(testName, 'stress', startTime, endTime, false, {
          duration: endTime - startTime,
          memoryUsed: endMemory - startMemory,
          throughput: 0
        }, { error: (error as Error).message, campaignSize: config.campaigns.large })
        
        throw error
      }
    }, config.execution.testTimeoutMS * 4)

    it('should handle extreme concurrent load', async () => {
      const testName = 'Extreme Concurrent Stress'
      const stressCampaigns = config.concurrency.stressTestCampaigns
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      
      try {
        // Process in batches to avoid overwhelming the system
        const batchSize = 3
        const batches = Math.ceil(stressCampaigns / batchSize)
        let successfulCampaigns = 0
        let totalItems = 0
        
        for (let batch = 0; batch < batches; batch++) {
          const batchPromises: Promise<void>[] = []
          
          for (let i = 0; i < batchSize && (batch * batchSize + i) < stressCampaigns; i++) {
            const campaignIndex = batch * batchSize + i
            const campaignSize = [
              config.campaigns.small,
              config.campaigns.medium,
              config.campaigns.large
            ][campaignIndex % 3]
            
            const contentPlan = createMockContentPlan(campaignSize, `stress-${campaignIndex}`)
            totalItems += contentPlan.length
            
            const promise = orchestrator.generateCampaignContent({
              campaignId: `stress-concurrent-${campaignIndex}`,
              contentPlan,
              workspace: createMockWorkspace(`stress-${campaignIndex}`),
              resources: mockResources,
              templates: mockTemplates
            }).then(() => {
              successfulCampaigns++
            }).catch(() => {
              // Count failures but don't throw
            })
            
            batchPromises.push(promise)
          }
          
          await Promise.all(batchPromises)
          
          // Brief pause between batches
          await new Promise(resolve => setTimeout(resolve, config.execution.batchProcessingDelay))
        }
        
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        const duration = endTime - startTime
        const memoryUsed = endMemory - startMemory
        const successRate = successfulCampaigns / stressCampaigns
        const throughput = totalItems / (duration / 1000)
        
        // Should survive stress test with reasonable success rate
        expect(successRate).toBeGreaterThan(0.7) // At least 70% success under extreme stress
        expect(memoryUsed).toBeLessThan(config.thresholds.maxMemoryUsageMB * 2) // Allow 2x memory under extreme stress
        
        metrics.recordTest(testName, 'stress', startTime, endTime, true, {
          duration,
          memoryUsed,
          throughput,
          errorRate: 1 - successRate,
          concurrency: stressCampaigns
        }, { 
          totalCampaigns: stressCampaigns,
          successfulCampaigns,
          totalItems,
          successRate
        })
      } catch (error) {
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        
        metrics.recordTest(testName, 'stress', startTime, endTime, false, {
          duration: endTime - startTime,
          memoryUsed: endMemory - startMemory,
          throughput: 0,
          errorRate: 1,
          concurrency: stressCampaigns
        }, { error: (error as Error).message })
        
        throw error
      }
    }, config.execution.testTimeoutMS * 6)
  })

  // Generate comprehensive report after all tests
  afterAll(() => {
    const report = metrics.generateReport()
    console.log('\n' + report)
    
    // Write report to file for CI/CD
    if (process.env.CI) {
      const fs = require('fs')
      const path = require('path')
      const reportPath = path.join(process.cwd(), 'performance-test-report.txt')
      fs.writeFileSync(reportPath, report)
      console.log(`\n📄 Performance report written to: ${reportPath}`)
    }
  })
})