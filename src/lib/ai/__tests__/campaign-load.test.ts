/**
 * Campaign Generation Load Tests
 * 
 * Tests the complete campaign generation pipeline under various load conditions,
 * including multiple concurrent campaigns, large campaign sizes, and resource constraints.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock all the dependencies
vi.mock('../orchestrator/ContentGenerationOrchestrator')
vi.mock('../orchestrator/ProgressTrackingService')
vi.mock('../orchestrator/ErrorHandlingService')
vi.mock('../../database/DatabaseService')

// Import after mocking
import { ContentGenerationOrchestrator } from '../orchestrator/ContentGenerationOrchestrator'
import type { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from '../agents/types'

// Campaign Load Test Configuration
const CAMPAIGN_LOAD_CONFIG = {
  SMALL_CAMPAIGN: 5,
  MEDIUM_CAMPAIGN: 15,
  LARGE_CAMPAIGN: 30,
  XLARGE_CAMPAIGN: 50,
  MAX_CONCURRENT_CAMPAIGNS: 5,
  STRESS_TEST_CAMPAIGNS: 10,
  MEMORY_LIMIT_MB: 1000,
  TIMEOUT_PER_ITEM_MS: 10000,
  EXPECTED_THROUGHPUT_ITEMS_PER_SEC: 0.5
}

// Campaign generation simulator
class CampaignGenerationSimulator {
  private activeGenerations = new Map<string, {
    startTime: number
    itemsCompleted: number
    totalItems: number
    errors: number
  }>()

  startGeneration(campaignId: string, totalItems: number) {
    this.activeGenerations.set(campaignId, {
      startTime: Date.now(),
      itemsCompleted: 0,
      totalItems,
      errors: 0
    })
  }

  completeItem(campaignId: string, success: boolean = true) {
    const generation = this.activeGenerations.get(campaignId)
    if (generation) {
      generation.itemsCompleted++
      if (!success) {
        generation.errors++
      }
    }
  }

  finishGeneration(campaignId: string) {
    const generation = this.activeGenerations.get(campaignId)
    if (generation) {
      const duration = Date.now() - generation.startTime
      const result = {
        campaignId,
        duration,
        itemsCompleted: generation.itemsCompleted,
        totalItems: generation.totalItems,
        errors: generation.errors,
        successRate: (generation.itemsCompleted - generation.errors) / generation.totalItems,
        throughput: generation.itemsCompleted / (duration / 1000)
      }
      this.activeGenerations.delete(campaignId)
      return result
    }
    return null
  }

  getActiveGenerations() {
    return Array.from(this.activeGenerations.entries()).map(([id, data]) => ({
      campaignId: id,
      ...data,
      duration: Date.now() - data.startTime
    }))
  }

  reset() {
    this.activeGenerations.clear()
  }
}

// Load test metrics collector
class CampaignLoadMetrics {
  private campaigns: Array<{
    campaignId: string
    size: number
    startTime: number
    endTime: number
    success: boolean
    itemsGenerated: number
    errors: number
    memoryUsed: number
  }> = []

  recordCampaign(
    campaignId: string,
    size: number,
    startTime: number,
    endTime: number,
    success: boolean,
    itemsGenerated: number,
    errors: number,
    memoryUsed: number
  ) {
    this.campaigns.push({
      campaignId,
      size,
      startTime,
      endTime,
      success,
      itemsGenerated,
      errors,
      memoryUsed
    })
  }

  getMetrics() {
    if (this.campaigns.length === 0) return null

    const totalCampaigns = this.campaigns.length
    const successfulCampaigns = this.campaigns.filter(c => c.success).length
    const totalItems = this.campaigns.reduce((sum, c) => sum + c.size, 0)
    const totalItemsGenerated = this.campaigns.reduce((sum, c) => sum + c.itemsGenerated, 0)
    const totalErrors = this.campaigns.reduce((sum, c) => sum + c.errors, 0)

    const durations = this.campaigns.map(c => c.endTime - c.startTime)
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)

    const memoryUsages = this.campaigns.map(c => c.memoryUsed)
    const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
    const maxMemory = Math.max(...memoryUsages)

    const testDuration = Math.max(...this.campaigns.map(c => c.endTime)) - 
                        Math.min(...this.campaigns.map(c => c.startTime))
    const overallThroughput = totalItemsGenerated / (testDuration / 1000)

    return {
      totalCampaigns,
      successfulCampaigns,
      campaignSuccessRate: successfulCampaigns / totalCampaigns,
      totalItems,
      totalItemsGenerated,
      itemGenerationRate: totalItemsGenerated / totalItems,
      totalErrors,
      errorRate: totalErrors / totalItems,
      avgDuration,
      maxDuration,
      minDuration,
      avgMemory,
      maxMemory,
      overallThroughput,
      testDuration
    }
  }

  reset() {
    this.campaigns = []
  }
}

// Mock data generators for load testing
function createLoadTestWorkspace(id: string): WorkspaceData {
  return {
    id: `load-test-workspace-${id}`,
    name: `Load Test Workspace ${id}`,
    branding: {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      logo: 'https://example.com/logo.png',
      slogan: 'Innovation through technology',
      description: `Workspace for load testing campaign generation`,
      whatsapp: '+1234567890'
    }
  }
}

function createLoadTestResources(count: number): ResourceData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `load-resource-${i}`,
    name: `Load Test Resource ${i}`,
    type: 'image' as const,
    url: `https://example.com/load-resource-${i}.jpg`,
    mimeType: 'image/jpeg'
  }))
}

function createLoadTestTemplates(count: number): TemplateData[] {
  const templateTypes = ['single', 'carousel'] as const
  
  return Array.from({ length: count }, (_, i) => ({
    id: `load-template-${i}`,
    name: `Load Test Template ${i}`,
    type: templateTypes[i % templateTypes.length],
    socialNetworks: ['instagram', 'linkedin'],
    images: [`https://example.com/load-template-${i}.jpg`],
    description: `Template ${i} for load testing with various content types`
  }))
}

function createLoadTestContentPlan(size: number, campaignId: string): ContentPlanItem[] {
  const contentTypes = ['text-only', 'text-with-image', 'text-with-carousel'] as const
  const socialNetworks = ['linkedin', 'instagram', 'tiktok'] as const
  
  return Array.from({ length: size }, (_, i) => ({
    id: `${campaignId}-content-${i}`,
    title: `Load Test Content ${i} for Campaign ${campaignId}`,
    description: `This is load test content item ${i} designed to stress test the campaign generation system with realistic content requirements and complexity.`,
    contentType: contentTypes[i % contentTypes.length],
    socialNetwork: socialNetworks[i % socialNetworks.length],
    scheduledDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString(),
    resourceIds: [`load-resource-${i % 5}`, `load-resource-${(i + 1) % 5}`],
    templateId: i % 2 === 0 ? `load-template-${i % 3}` : undefined,
    estimatedReach: Math.floor(Math.random() * 2000) + 500,
    priority: 'medium' as const,
    tags: ['loadtest', 'performance', `campaign${campaignId}`, `item${i}`],
    notes: `Load test item ${i} for campaign ${campaignId}`
  }))
}

describe('Campaign Generation Load Tests', () => {
  let orchestrator: ContentGenerationOrchestrator
  let simulator: CampaignGenerationSimulator
  let metrics: CampaignLoadMetrics
  let loadTestResources: ResourceData[]
  let loadTestTemplates: TemplateData[]

  beforeEach(() => {
    // Create mock orchestrator
    orchestrator = new ContentGenerationOrchestrator()
    
    // Mock the generateCampaignContent method
    vi.spyOn(orchestrator, 'generateCampaignContent')
    
    simulator = new CampaignGenerationSimulator()
    metrics = new CampaignLoadMetrics()
    loadTestResources = createLoadTestResources(20)
    loadTestTemplates = createLoadTestTemplates(10)

    // Mock the orchestrator's generation methods with realistic timing
    vi.mocked(orchestrator.generateCampaignContent).mockImplementation(async (params) => {
      const { campaignId, contentPlan } = params
      
      simulator.startGeneration(campaignId, contentPlan.length)
      
      // Simulate processing each item with realistic timing
      for (let i = 0; i < contentPlan.length; i++) {
        const processingTime = Math.random() * 3000 + 2000 // 2-5 seconds per item
        await new Promise(resolve => setTimeout(resolve, processingTime))
        
        // Simulate occasional failures (5% error rate)
        const success = Math.random() > 0.05
        simulator.completeItem(campaignId, success)
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    simulator.reset()
    metrics.reset()
  })

  describe('Single Campaign Load Tests', () => {
    it('should handle small campaigns efficiently', async () => {
      const campaignId = 'load-test-small'
      const workspace = createLoadTestWorkspace('small')
      const contentPlan = createLoadTestContentPlan(CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN, campaignId)
      
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      
      await orchestrator.generateCampaignContent({
        campaignId,
        contentPlan,
        workspace,
        resources: loadTestResources,
        templates: loadTestTemplates
      })
      
      const endTime = Date.now()
      const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      const memoryUsed = endMemory - startMemory
      
      metrics.recordCampaign(
        campaignId,
        CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN,
        startTime,
        endTime,
        true,
        CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN,
        0,
        memoryUsed
      )
      
      const testMetrics = metrics.getMetrics()!
      
      // Performance assertions
      expect(testMetrics.avgDuration).toBeLessThan(CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN * CAMPAIGN_LOAD_CONFIG.TIMEOUT_PER_ITEM_MS)
      expect(testMetrics.maxMemory).toBeLessThan(CAMPAIGN_LOAD_CONFIG.MEMORY_LIMIT_MB / 4)
      expect(testMetrics.overallThroughput).toBeGreaterThan(CAMPAIGN_LOAD_CONFIG.EXPECTED_THROUGHPUT_ITEMS_PER_SEC)
      
      console.log(`📊 Small campaign load test:`)
      console.log(`   Duration: ${testMetrics.avgDuration.toFixed(2)}ms`)
      console.log(`   Memory used: ${testMetrics.maxMemory.toFixed(2)}MB`)
      console.log(`   Throughput: ${testMetrics.overallThroughput.toFixed(2)} items/sec`)
    }, 120000)

    it('should handle medium campaigns with consistent performance', async () => {
      const campaignId = 'load-test-medium'
      const workspace = createLoadTestWorkspace('medium')
      const contentPlan = createLoadTestContentPlan(CAMPAIGN_LOAD_CONFIG.MEDIUM_CAMPAIGN, campaignId)
      
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      
      await orchestrator.generateCampaignContent({
        campaignId,
        contentPlan,
        workspace,
        resources: loadTestResources,
        templates: loadTestTemplates
      })
      
      const endTime = Date.now()
      const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      const memoryUsed = endMemory - startMemory
      
      metrics.recordCampaign(
        campaignId,
        CAMPAIGN_LOAD_CONFIG.MEDIUM_CAMPAIGN,
        startTime,
        endTime,
        true,
        CAMPAIGN_LOAD_CONFIG.MEDIUM_CAMPAIGN,
        0,
        memoryUsed
      )
      
      const testMetrics = metrics.getMetrics()!
      
      // Performance should scale reasonably
      const timePerItem = testMetrics.avgDuration / CAMPAIGN_LOAD_CONFIG.MEDIUM_CAMPAIGN
      expect(timePerItem).toBeLessThan(CAMPAIGN_LOAD_CONFIG.TIMEOUT_PER_ITEM_MS)
      expect(testMetrics.maxMemory).toBeLessThan(CAMPAIGN_LOAD_CONFIG.MEMORY_LIMIT_MB / 2)
      
      console.log(`📊 Medium campaign load test:`)
      console.log(`   Duration: ${testMetrics.avgDuration.toFixed(2)}ms`)
      console.log(`   Time per item: ${timePerItem.toFixed(2)}ms`)
      console.log(`   Memory used: ${testMetrics.maxMemory.toFixed(2)}MB`)
      console.log(`   Throughput: ${testMetrics.overallThroughput.toFixed(2)} items/sec`)
    }, 300000)

    it('should handle large campaigns without memory leaks', async () => {
      const campaignId = 'load-test-large'
      const workspace = createLoadTestWorkspace('large')
      const contentPlan = createLoadTestContentPlan(CAMPAIGN_LOAD_CONFIG.LARGE_CAMPAIGN, campaignId)
      
      // Monitor memory usage throughout
      const memorySnapshots: number[] = []
      const memoryInterval = setInterval(() => {
        memorySnapshots.push(process.memoryUsage().heapUsed / (1024 * 1024))
      }, 5000)
      
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      
      await orchestrator.generateCampaignContent({
        campaignId,
        contentPlan,
        workspace,
        resources: loadTestResources,
        templates: loadTestTemplates
      })
      
      clearInterval(memoryInterval)
      const endTime = Date.now()
      const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
      const memoryUsed = endMemory - startMemory
      
      metrics.recordCampaign(
        campaignId,
        CAMPAIGN_LOAD_CONFIG.LARGE_CAMPAIGN,
        startTime,
        endTime,
        true,
        CAMPAIGN_LOAD_CONFIG.LARGE_CAMPAIGN,
        0,
        memoryUsed
      )
      
      const testMetrics = metrics.getMetrics()!
      const maxMemoryDuringTest = Math.max(...memorySnapshots)
      const memoryGrowth = maxMemoryDuringTest - Math.min(...memorySnapshots)
      
      // Memory usage should remain reasonable
      expect(maxMemoryDuringTest).toBeLessThan(CAMPAIGN_LOAD_CONFIG.MEMORY_LIMIT_MB)
      expect(memoryGrowth).toBeLessThan(CAMPAIGN_LOAD_CONFIG.MEMORY_LIMIT_MB / 2)
      
      // Performance should still be acceptable
      const timePerItem = testMetrics.avgDuration / CAMPAIGN_LOAD_CONFIG.LARGE_CAMPAIGN
      expect(timePerItem).toBeLessThan(CAMPAIGN_LOAD_CONFIG.TIMEOUT_PER_ITEM_MS * 1.5) // Allow 50% more time for large campaigns
      
      console.log(`📊 Large campaign load test:`)
      console.log(`   Duration: ${testMetrics.avgDuration.toFixed(2)}ms`)
      console.log(`   Time per item: ${timePerItem.toFixed(2)}ms`)
      console.log(`   Peak memory: ${maxMemoryDuringTest.toFixed(2)}MB`)
      console.log(`   Memory growth: ${memoryGrowth.toFixed(2)}MB`)
      console.log(`   Throughput: ${testMetrics.overallThroughput.toFixed(2)} items/sec`)
    }, 600000)
  })

  describe('Concurrent Campaign Load Tests', () => {
    it('should handle multiple concurrent small campaigns', async () => {
      const concurrentCampaigns = CAMPAIGN_LOAD_CONFIG.MAX_CONCURRENT_CAMPAIGNS
      const campaignPromises: Promise<void>[] = []
      
      const overallStartTime = Date.now()
      
      for (let i = 0; i < concurrentCampaigns; i++) {
        const campaignId = `concurrent-small-${i}`
        const workspace = createLoadTestWorkspace(`concurrent-${i}`)
        const contentPlan = createLoadTestContentPlan(CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN, campaignId)
        
        const promise = (async () => {
          const startTime = Date.now()
          const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
          
          await orchestrator.generateCampaignContent({
            campaignId,
            contentPlan,
            workspace,
            resources: loadTestResources,
            templates: loadTestTemplates
          })
          
          const endTime = Date.now()
          const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
          const memoryUsed = endMemory - startMemory
          
          metrics.recordCampaign(
            campaignId,
            CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN,
            startTime,
            endTime,
            true,
            CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN,
            0,
            memoryUsed
          )
        })()
        
        campaignPromises.push(promise)
      }
      
      await Promise.all(campaignPromises)
      
      const testMetrics = metrics.getMetrics()!
      const overallDuration = Date.now() - overallStartTime
      
      // Concurrent processing should be more efficient than sequential
      const sequentialEstimate = concurrentCampaigns * CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN * 5000 // 5s per item
      expect(overallDuration).toBeLessThan(sequentialEstimate * 0.7) // Should be at least 30% faster
      
      // All campaigns should complete successfully
      expect(testMetrics.campaignSuccessRate).toBe(1.0)
      expect(testMetrics.totalCampaigns).toBe(concurrentCampaigns)
      
      console.log(`📊 Concurrent small campaigns test:`)
      console.log(`   Campaigns: ${testMetrics.totalCampaigns}`)
      console.log(`   Success rate: ${(testMetrics.campaignSuccessRate * 100).toFixed(1)}%`)
      console.log(`   Overall duration: ${overallDuration.toFixed(2)}ms`)
      console.log(`   Average campaign duration: ${testMetrics.avgDuration.toFixed(2)}ms`)
      console.log(`   Peak memory: ${testMetrics.maxMemory.toFixed(2)}MB`)
      console.log(`   Overall throughput: ${testMetrics.overallThroughput.toFixed(2)} items/sec`)
    }, 360000)

    it('should handle mixed campaign sizes concurrently', async () => {
      const campaigns = [
        { size: CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN, id: 'mixed-small' },
        { size: CAMPAIGN_LOAD_CONFIG.MEDIUM_CAMPAIGN, id: 'mixed-medium' },
        { size: CAMPAIGN_LOAD_CONFIG.LARGE_CAMPAIGN, id: 'mixed-large' },
        { size: CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN, id: 'mixed-small-2' }
      ]
      
      const campaignPromises = campaigns.map(async (campaign, index) => {
        const workspace = createLoadTestWorkspace(`mixed-${index}`)
        const contentPlan = createLoadTestContentPlan(campaign.size, campaign.id)
        
        const startTime = Date.now()
        const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        
        await orchestrator.generateCampaignContent({
          campaignId: campaign.id,
          contentPlan,
          workspace,
          resources: loadTestResources,
          templates: loadTestTemplates
        })
        
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        const memoryUsed = endMemory - startMemory
        
        metrics.recordCampaign(
          campaign.id,
          campaign.size,
          startTime,
          endTime,
          true,
          campaign.size,
          0,
          memoryUsed
        )
      })
      
      await Promise.all(campaignPromises)
      
      const testMetrics = metrics.getMetrics()!
      
      // Should handle mixed sizes efficiently
      expect(testMetrics.campaignSuccessRate).toBe(1.0)
      expect(testMetrics.itemGenerationRate).toBeGreaterThan(0.95) // At least 95% of items generated
      expect(testMetrics.maxMemory).toBeLessThan(CAMPAIGN_LOAD_CONFIG.MEMORY_LIMIT_MB)
      
      console.log(`📊 Mixed campaign sizes test:`)
      console.log(`   Total campaigns: ${testMetrics.totalCampaigns}`)
      console.log(`   Total items: ${testMetrics.totalItems}`)
      console.log(`   Success rate: ${(testMetrics.campaignSuccessRate * 100).toFixed(1)}%`)
      console.log(`   Item generation rate: ${(testMetrics.itemGenerationRate * 100).toFixed(1)}%`)
      console.log(`   Peak memory: ${testMetrics.maxMemory.toFixed(2)}MB`)
      console.log(`   Overall throughput: ${testMetrics.overallThroughput.toFixed(2)} items/sec`)
    }, 600000)
  })

  describe('Stress Testing', () => {
    it('should survive stress test with many campaigns', async () => {
      const stressCampaigns = CAMPAIGN_LOAD_CONFIG.STRESS_TEST_CAMPAIGNS
      const batchSize = 3 // Process in batches to avoid overwhelming
      const batches = Math.ceil(stressCampaigns / batchSize)
      
      console.log(`🔥 Starting stress test with ${stressCampaigns} campaigns in ${batches} batches`)
      
      for (let batch = 0; batch < batches; batch++) {
        const batchPromises: Promise<void>[] = []
        
        for (let i = 0; i < batchSize && (batch * batchSize + i) < stressCampaigns; i++) {
          const campaignIndex = batch * batchSize + i
          const campaignId = `stress-test-${campaignIndex}`
          const workspace = createLoadTestWorkspace(`stress-${campaignIndex}`)
          
          // Vary campaign sizes for realistic stress testing
          const campaignSize = [
            CAMPAIGN_LOAD_CONFIG.SMALL_CAMPAIGN,
            CAMPAIGN_LOAD_CONFIG.MEDIUM_CAMPAIGN,
            CAMPAIGN_LOAD_CONFIG.LARGE_CAMPAIGN
          ][campaignIndex % 3]
          
          const contentPlan = createLoadTestContentPlan(campaignSize, campaignId)
          
          const promise = (async () => {
            const startTime = Date.now()
            const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
            
            try {
              await orchestrator.generateCampaignContent({
                campaignId,
                contentPlan,
                workspace,
                resources: loadTestResources,
                templates: loadTestTemplates
              })
              
              const endTime = Date.now()
              const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
              const memoryUsed = endMemory - startMemory
              
              metrics.recordCampaign(
                campaignId,
                campaignSize,
                startTime,
                endTime,
                true,
                campaignSize,
                0,
                memoryUsed
              )
            } catch (error) {
              const endTime = Date.now()
              const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
              const memoryUsed = endMemory - startMemory
              
              metrics.recordCampaign(
                campaignId,
                campaignSize,
                startTime,
                endTime,
                false,
                0,
                campaignSize,
                memoryUsed
              )
              
              console.log(`   Campaign ${campaignIndex} failed: ${error}`)
            }
          })()
          
          batchPromises.push(promise)
        }
        
        await Promise.all(batchPromises)
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        console.log(`   Completed batch ${batch + 1}/${batches}`)
      }
      
      const testMetrics = metrics.getMetrics()!
      
      // System should survive stress test with reasonable success rate
      expect(testMetrics.totalCampaigns).toBe(stressCampaigns)
      expect(testMetrics.campaignSuccessRate).toBeGreaterThan(0.7) // At least 70% success under stress
      expect(testMetrics.maxMemory).toBeLessThan(CAMPAIGN_LOAD_CONFIG.MEMORY_LIMIT_MB * 1.5) // Allow some memory overhead
      
      console.log(`📊 Stress test results:`)
      console.log(`   Total campaigns: ${testMetrics.totalCampaigns}`)
      console.log(`   Successful campaigns: ${testMetrics.successfulCampaigns}`)
      console.log(`   Campaign success rate: ${(testMetrics.campaignSuccessRate * 100).toFixed(1)}%`)
      console.log(`   Total items: ${testMetrics.totalItems}`)
      console.log(`   Items generated: ${testMetrics.totalItemsGenerated}`)
      console.log(`   Item generation rate: ${(testMetrics.itemGenerationRate * 100).toFixed(1)}%`)
      console.log(`   Peak memory: ${testMetrics.maxMemory.toFixed(2)}MB`)
      console.log(`   Overall throughput: ${testMetrics.overallThroughput.toFixed(2)} items/sec`)
      console.log(`   Test duration: ${(testMetrics.testDuration / 1000).toFixed(2)}s`)
    }, 1200000) // 20 minutes timeout for stress test
  })

  describe('Resource Constraint Testing', () => {
    it('should handle memory constraints gracefully', async () => {
      // Simulate memory pressure by creating large campaigns
      const largeCampaigns = 3
      const memorySnapshots: Array<{ time: number; memory: number; campaign: string }> = []
      
      const memoryTracker = setInterval(() => {
        const activeGenerations = simulator.getActiveGenerations()
        const activeCampaign = activeGenerations.length > 0 ? activeGenerations[0].campaignId : 'none'
        
        memorySnapshots.push({
          time: Date.now(),
          memory: process.memoryUsage().heapUsed / (1024 * 1024),
          campaign: activeCampaign
        })
      }, 2000)
      
      for (let i = 0; i < largeCampaigns; i++) {
        const campaignId = `memory-constraint-${i}`
        const workspace = createLoadTestWorkspace(`memory-${i}`)
        const contentPlan = createLoadTestContentPlan(CAMPAIGN_LOAD_CONFIG.XLARGE_CAMPAIGN, campaignId)
        
        const startTime = Date.now()
        const startMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        
        await orchestrator.generateCampaignContent({
          campaignId,
          contentPlan,
          workspace,
          resources: loadTestResources,
          templates: loadTestTemplates
        })
        
        const endTime = Date.now()
        const endMemory = process.memoryUsage().heapUsed / (1024 * 1024)
        const memoryUsed = endMemory - startMemory
        
        metrics.recordCampaign(
          campaignId,
          CAMPAIGN_LOAD_CONFIG.XLARGE_CAMPAIGN,
          startTime,
          endTime,
          true,
          CAMPAIGN_LOAD_CONFIG.XLARGE_CAMPAIGN,
          0,
          memoryUsed
        )
        
        // Force garbage collection between campaigns if available
        if (global.gc) {
          global.gc()
        }
      }
      
      clearInterval(memoryTracker)
      
      const testMetrics = metrics.getMetrics()!
      const maxMemory = Math.max(...memorySnapshots.map(s => s.memory))
      const memoryGrowthPerCampaign = testMetrics.maxMemory / largeCampaigns
      
      // Memory usage should remain within constraints
      expect(maxMemory).toBeLessThan(CAMPAIGN_LOAD_CONFIG.MEMORY_LIMIT_MB)
      expect(memoryGrowthPerCampaign).toBeLessThan(CAMPAIGN_LOAD_CONFIG.MEMORY_LIMIT_MB / 2)
      
      console.log(`📊 Memory constraint test:`)
      console.log(`   Campaigns: ${testMetrics.totalCampaigns}`)
      console.log(`   Peak memory: ${maxMemory.toFixed(2)}MB`)
      console.log(`   Memory per campaign: ${memoryGrowthPerCampaign.toFixed(2)}MB`)
      console.log(`   Success rate: ${(testMetrics.campaignSuccessRate * 100).toFixed(1)}%`)
    }, 900000)
  })
})