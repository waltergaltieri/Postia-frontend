import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { ProgressTrackingService } from '../ProgressTrackingService'
import { DatabaseService } from '../../../database/DatabaseService'
import type { GenerationProgress, GenerationError } from '../../database/types'

// Mock DatabaseService
vi.mock('../../../database/DatabaseService')

describe('ProgressTrackingService', () => {
  let progressService: ProgressTrackingService
  let mockDatabaseService: Mock

  const mockProgress: GenerationProgress = {
    id: 'progress-1',
    campaignId: 'campaign-1',
    totalPublications: 5,
    completedPublications: 2,
    currentPublicationId: 'pub-1',
    currentAgent: 'text-only',
    currentStep: 'processing',
    errors: [],
    startedAt: new Date('2024-01-15T10:00:00Z'),
    completedAt: undefined,
    estimatedTimeRemaining: 45000,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:05:00Z')
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockDatabaseService = vi.mocked(DatabaseService).prototype
    
    // Setup default mocks
    mockDatabaseService.createGenerationProgress = vi.fn().mockResolvedValue(mockProgress)
    mockDatabaseService.updateGenerationProgress = vi.fn().mockResolvedValue(mockProgress)
    mockDatabaseService.getGenerationProgress = vi.fn().mockResolvedValue(mockProgress)
    mockDatabaseService.getGenerationProgressByCampaign = vi.fn().mockResolvedValue(mockProgress)

    progressService = new ProgressTrackingService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProgress', () => {
    it('should create new progress tracking', async () => {
      const result = await progressService.createProgress('campaign-1', 5)

      expect(mockDatabaseService.createGenerationProgress).toHaveBeenCalledWith({
        campaignId: 'campaign-1',
        totalPublications: 5,
        completedPublications: 0,
        currentPublicationId: undefined,
        currentAgent: undefined,
        currentStep: 'initializing',
        errors: [],
        startedAt: expect.any(Date),
        completedAt: undefined,
        estimatedTimeRemaining: expect.any(Number)
      })

      expect(result).toEqual(mockProgress)
    })

    it('should cache created progress', async () => {
      await progressService.createProgress('campaign-1', 5)

      // Second call should use cache
      const cachedResult = await progressService.getProgress('campaign-1')
      
      expect(cachedResult).toEqual(mockProgress)
      // Database should only be called once for creation
      expect(mockDatabaseService.getGenerationProgressByCampaign).not.toHaveBeenCalled()
    })
  })

  describe('updateCurrentPublication', () => {
    it('should update current publication info', async () => {
      const result = await progressService.updateCurrentPublication(
        'progress-1',
        'pub-2',
        'text-image',
        'generating'
      )

      expect(mockDatabaseService.updateGenerationProgress).toHaveBeenCalledWith('progress-1', {
        currentPublicationId: 'pub-2',
        currentAgent: 'text-image',
        currentStep: 'generating',
        estimatedTimeRemaining: expect.any(Number)
      })

      expect(result).toEqual(mockProgress)
    })
  })

  describe('incrementCompleted', () => {
    it('should increment completed publications', async () => {
      mockDatabaseService.getGenerationProgress = vi.fn().mockResolvedValue({
        ...mockProgress,
        completedPublications: 2
      })

      const result = await progressService.incrementCompleted('progress-1')

      expect(mockDatabaseService.updateGenerationProgress).toHaveBeenCalledWith('progress-1', {
        completedPublications: 3,
        currentPublicationId: undefined,
        currentAgent: undefined,
        currentStep: 'processing',
        estimatedTimeRemaining: expect.any(Number)
      })

      expect(result).toEqual(mockProgress)
    })

    it('should mark as completed when all publications done', async () => {
      mockDatabaseService.getGenerationProgress = vi.fn().mockResolvedValue({
        ...mockProgress,
        completedPublications: 4,
        totalPublications: 5
      })

      await progressService.incrementCompleted('progress-1')

      expect(mockDatabaseService.updateGenerationProgress).toHaveBeenCalledWith('progress-1', {
        completedPublications: 5,
        currentPublicationId: undefined,
        currentAgent: undefined,
        currentStep: 'completed',
        estimatedTimeRemaining: expect.any(Number)
      })
    })
  })

  describe('addError', () => {
    it('should add error to progress', async () => {
      const error: GenerationError = {
        publicationId: 'pub-1',
        agentType: 'text-only',
        errorMessage: 'Test error',
        timestamp: new Date(),
        retryCount: 1
      }

      mockDatabaseService.getGenerationProgress = vi.fn().mockResolvedValue({
        ...mockProgress,
        errors: []
      })

      await progressService.addError('progress-1', error)

      expect(mockDatabaseService.updateGenerationProgress).toHaveBeenCalledWith('progress-1', {
        errors: [error],
        currentStep: 'error_handling'
      })
    })
  })

  describe('completeProgress', () => {
    it('should mark progress as completed', async () => {
      const result = await progressService.completeProgress('progress-1')

      expect(mockDatabaseService.updateGenerationProgress).toHaveBeenCalledWith('progress-1', {
        completedAt: expect.any(Date),
        currentPublicationId: undefined,
        currentAgent: undefined,
        currentStep: 'completed',
        estimatedTimeRemaining: 0
      })

      expect(result).toEqual(mockProgress)
    })

    it('should clear cache after completion', async () => {
      // First, add to cache
      await progressService.createProgress('campaign-1', 5)
      
      // Complete progress
      await progressService.completeProgress('progress-1')
      
      // Next call should hit database, not cache
      await progressService.getProgress('campaign-1')
      
      expect(mockDatabaseService.getGenerationProgressByCampaign).toHaveBeenCalled()
    })
  })

  describe('getProgress', () => {
    it('should return cached progress if available', async () => {
      // Add to cache first
      await progressService.createProgress('campaign-1', 5)
      
      const result = await progressService.getProgress('campaign-1')
      
      expect(result).toEqual(mockProgress)
      // Should not call database since it's cached
      expect(mockDatabaseService.getGenerationProgressByCampaign).not.toHaveBeenCalled()
    })

    it('should fetch from database if not cached', async () => {
      const result = await progressService.getProgress('campaign-1')
      
      expect(mockDatabaseService.getGenerationProgressByCampaign).toHaveBeenCalledWith('campaign-1')
      expect(result).toEqual(mockProgress)
    })

    it('should return null if not found', async () => {
      mockDatabaseService.getGenerationProgressByCampaign = vi.fn().mockResolvedValue(null)
      
      const result = await progressService.getProgress('campaign-1')
      
      expect(result).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      mockDatabaseService.getGenerationProgressByCampaign = vi.fn().mockRejectedValue(new Error('DB Error'))
      
      const result = await progressService.getProgress('campaign-1')
      
      expect(result).toBeNull()
    })
  })

  describe('getProgressStats', () => {
    it('should calculate progress statistics', async () => {
      const progressWithStats = {
        ...mockProgress,
        totalPublications: 10,
        completedPublications: 6,
        errors: [
          { publicationId: 'pub-1', agentType: 'text-only', errorMessage: 'Error 1', timestamp: new Date(), retryCount: 1 }
        ],
        startedAt: new Date(Date.now() - 60000), // 1 minute ago
        estimatedTimeRemaining: 30000
      }

      mockDatabaseService.getGenerationProgressByCampaign = vi.fn().mockResolvedValue(progressWithStats)

      const stats = await progressService.getProgressStats('campaign-1')

      expect(stats).toEqual({
        percentage: 60, // 6/10 * 100
        completedCount: 6,
        totalCount: 10,
        errorCount: 1,
        estimatedTimeRemaining: 30000,
        elapsedTime: expect.any(Number),
        averageTimePerPublication: expect.any(Number)
      })
    })

    it('should return null if progress not found', async () => {
      mockDatabaseService.getGenerationProgressByCampaign = vi.fn().mockResolvedValue(null)

      const stats = await progressService.getProgressStats('campaign-1')

      expect(stats).toBeNull()
    })
  })

  describe('isGenerationActive', () => {
    it('should return true for active generation', async () => {
      const activeProgress = { ...mockProgress, completedAt: undefined }
      mockDatabaseService.getGenerationProgressByCampaign = vi.fn().mockResolvedValue(activeProgress)

      const isActive = await progressService.isGenerationActive('campaign-1')

      expect(isActive).toBe(true)
    })

    it('should return false for completed generation', async () => {
      const completedProgress = { ...mockProgress, completedAt: new Date() }
      mockDatabaseService.getGenerationProgressByCampaign = vi.fn().mockResolvedValue(completedProgress)

      const isActive = await progressService.isGenerationActive('campaign-1')

      expect(isActive).toBe(false)
    })

    it('should return false if no progress found', async () => {
      mockDatabaseService.getGenerationProgressByCampaign = vi.fn().mockResolvedValue(null)

      const isActive = await progressService.isGenerationActive('campaign-1')

      expect(isActive).toBe(false)
    })
  })

  describe('clearCache', () => {
    it('should clear specific campaign cache', async () => {
      // Add to cache
      await progressService.createProgress('campaign-1', 5)
      await progressService.createProgress('campaign-2', 3)
      
      // Clear specific campaign
      progressService.clearCache('campaign-1')
      
      // campaign-1 should hit database, campaign-2 should use cache
      await progressService.getProgress('campaign-1')
      await progressService.getProgress('campaign-2')
      
      expect(mockDatabaseService.getGenerationProgressByCampaign).toHaveBeenCalledWith('campaign-1')
      expect(mockDatabaseService.getGenerationProgressByCampaign).not.toHaveBeenCalledWith('campaign-2')
    })

    it('should clear all cache when no campaign specified', async () => {
      // Add to cache
      await progressService.createProgress('campaign-1', 5)
      await progressService.createProgress('campaign-2', 3)
      
      // Clear all cache
      progressService.clearCache()
      
      // Both should hit database
      await progressService.getProgress('campaign-1')
      await progressService.getProgress('campaign-2')
      
      expect(mockDatabaseService.getGenerationProgressByCampaign).toHaveBeenCalledWith('campaign-1')
      expect(mockDatabaseService.getGenerationProgressByCampaign).toHaveBeenCalledWith('campaign-2')
    })
  })

  describe('getServiceMetrics', () => {
    it('should return service metrics', async () => {
      // Add some items to cache
      await progressService.createProgress('campaign-1', 5)
      await progressService.createProgress('campaign-2', 3)
      
      const metrics = progressService.getServiceMetrics()
      
      expect(metrics).toEqual({
        cachedProgresses: 2,
        cachedEstimations: 0, // No estimations cached yet
        averageEstimationAccuracy: 0.85
      })
    })
  })
})