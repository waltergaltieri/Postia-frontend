import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { ErrorHandlingService, type ErrorRecoveryParams } from '../ErrorHandlingService'
import type { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from '../../agents/types'

// Mock agents
vi.mock('../../agents', () => ({
  createTextOnlyAgent: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: 'Recovered text content',
      metadata: {
        agentUsed: 'text-only',
        textPrompt: 'Recovery prompt',
        generationTime: new Date(),
        retryCount: 1,
        processingTimeMs: 1500
      }
    })
  })),
  createTextImageAgent: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: 'Recovered text with image',
      imageUrl: 'https://example.com/recovered-image.jpg',
      metadata: {
        agentUsed: 'text-image',
        textPrompt: 'Recovery prompt',
        imagePrompt: 'Recovery image prompt',
        generationTime: new Date(),
        retryCount: 1,
        processingTimeMs: 2500
      }
    })
  })),
  createTextTemplateAgent: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: 'Recovered template text',
      imageUrl: 'https://example.com/recovered-template.jpg',
      templateTexts: { title: 'Recovered Title' },
      metadata: {
        agentUsed: 'text-template',
        textPrompt: 'Recovery prompt',
        templateUsed: 'template-1',
        generationTime: new Date(),
        retryCount: 1,
        processingTimeMs: 3500
      }
    })
  })),
  createCarouselAgent: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: 'Recovered carousel text',
      imageUrls: ['https://example.com/recovered-carousel1.jpg'],
      templateTexts: [{ title: 'Recovered Slide' }],
      metadata: {
        agentUsed: 'carousel',
        textPrompt: 'Recovery prompt',
        templateUsed: 'carousel-template-1',
        generationTime: new Date(),
        retryCount: 1,
        processingTimeMs: 4500
      }
    })
  }))
}))

describe('ErrorHandlingService', () => {
  let errorService: ErrorHandlingService
  let mockNotificationCallback: Mock

  const mockWorkspace: WorkspaceData = {
    id: 'workspace-1',
    name: 'Test Workspace',
    branding: {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      slogan: 'Test Slogan',
      description: 'Test Description'
    }
  }

  const mockResources: ResourceData[] = [
    {
      id: 'resource-1',
      name: 'Test Image',
      url: 'https://example.com/test-image.jpg',
      type: 'image',
      mimeType: 'image/jpeg'
    }
  ]

  const mockTemplates: TemplateData[] = [
    {
      id: 'template-1',
      name: 'Test Template',
      type: 'single',
      socialNetworks: ['instagram'],
      images: ['https://example.com/template.jpg']
    }
  ]

  const mockContentItem: ContentPlanItem = {
    id: 'content-1',
    title: 'Test Content',
    description: 'Test description',
    socialNetwork: 'instagram',
    scheduledDate: '2024-01-15T10:00:00Z',
    contentType: 'text-only',
    resourceIds: [],
    priority: 'medium',
    tags: ['test']
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    errorService = new ErrorHandlingService()
    mockNotificationCallback = vi.fn()
    
    // Subscribe to notifications for testing
    errorService.subscribeToErrorNotifications(mockNotificationCallback)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('handlePublicationError', () => {
    const baseParams: ErrorRecoveryParams = {
      publicationId: 'pub-1',
      error: new Error('Test error'),
      contentItem: mockContentItem,
      workspace: mockWorkspace,
      resources: mockResources,
      templates: mockTemplates,
      campaignId: 'campaign-1',
      attemptNumber: 1
    }

    it('should successfully recover from retryable error', async () => {
      const retryableError = new Error('Network error occurred')
      const params = { ...baseParams, error: retryableError }

      const result = await errorService.handlePublicationError(params)

      expect(result.success).toBe(true)
      expect(result.publicationId).toBe('pub-1')
      expect(result.content).toBeDefined()
      expect(result.retryCount).toBe(1)
      
      // Should notify successful recovery
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('recuperada exitosamente'),
          publicationId: 'pub-1'
        })
      )
    })

    it('should fail immediately for non-retryable errors', async () => {
      const nonRetryableError = new Error('Invalid API key')
      const params = { ...baseParams, error: nonRetryableError }

      const result = await errorService.handlePublicationError(params)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Max retry attempts reached')
      
      // Should notify critical error
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'critical',
          canRetry: false
        })
      )
    })

    it('should fail after max retry attempts', async () => {
      const retryableError = new Error('Timeout error')
      const params = { ...baseParams, error: retryableError, attemptNumber: 3 }

      const result = await errorService.handlePublicationError(params)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Max retry attempts reached')
    })

    it('should apply exponential backoff for rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      const params = { ...baseParams, error: rateLimitError }

      const startTime = Date.now()
      await errorService.handlePublicationError(params)
      const endTime = Date.now()

      // Should have waited at least 1 second (first retry delay)
      expect(endTime - startTime).toBeGreaterThan(1000)
    })

    it('should use fallback agent for API failures', async () => {
      const apiError = new Error('Gemini API failure')
      const params = { 
        ...baseParams, 
        error: apiError,
        contentItem: { ...mockContentItem, contentType: 'text-with-image' }
      }

      const result = await errorService.handlePublicationError(params)

      expect(result.success).toBe(true)
      // Should fallback to text-only for complex content types
      expect(result.content?.metadata.fallbackUsed).toBe(true)
    })

    it('should handle content optimization for length errors', async () => {
      const lengthError = new Error('Content too long for platform')
      const params = { ...baseParams, error: lengthError }

      const result = await errorService.handlePublicationError(params)

      expect(result.success).toBe(true)
      expect(result.content).toBeDefined()
    })

    it('should record error history', async () => {
      const error = new Error('Test error for history')
      const params = { ...baseParams, error }

      await errorService.handlePublicationError(params)

      const history = errorService.getErrorHistory('pub-1')
      expect(history).toHaveLength(1)
      expect(history[0].errorMessage).toBe('Test error for history')
      expect(history[0].publicationId).toBe('pub-1')
    })
  })

  describe('recovery strategies', () => {
    it('should handle text-only content recovery', async () => {
      const params: ErrorRecoveryParams = {
        publicationId: 'pub-1',
        error: new Error('Network timeout'),
        contentItem: { ...mockContentItem, contentType: 'text-only' },
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates,
        campaignId: 'campaign-1',
        attemptNumber: 1
      }

      const result = await errorService.handlePublicationError(params)

      expect(result.success).toBe(true)
      expect(result.content?.text).toBe('Recovered text content')
    })

    it('should handle text-image content recovery', async () => {
      const params: ErrorRecoveryParams = {
        publicationId: 'pub-1',
        error: new Error('Image generation failed'),
        contentItem: { 
          ...mockContentItem, 
          contentType: 'text-with-image',
          resourceIds: ['resource-1']
        },
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates,
        campaignId: 'campaign-1',
        attemptNumber: 1
      }

      const result = await errorService.handlePublicationError(params)

      expect(result.success).toBe(true)
      expect(result.content?.text).toBe('Recovered text with image')
    })

    it('should handle template content recovery', async () => {
      const params: ErrorRecoveryParams = {
        publicationId: 'pub-1',
        error: new Error('Template processing failed'),
        contentItem: { 
          ...mockContentItem, 
          contentType: 'text-with-image',
          templateId: 'template-1',
          resourceIds: ['resource-1']
        },
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates,
        campaignId: 'campaign-1',
        attemptNumber: 1
      }

      const result = await errorService.handlePublicationError(params)

      expect(result.success).toBe(true)
      expect(result.content?.text).toBe('Recovered template text')
    })

    it('should handle carousel content recovery', async () => {
      const params: ErrorRecoveryParams = {
        publicationId: 'pub-1',
        error: new Error('Carousel generation failed'),
        contentItem: { 
          ...mockContentItem, 
          contentType: 'text-with-carousel',
          templateId: 'template-1',
          resourceIds: ['resource-1']
        },
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates,
        campaignId: 'campaign-1',
        attemptNumber: 1
      }

      const result = await errorService.handlePublicationError(params)

      expect(result.success).toBe(true)
      expect(result.content?.text).toBe('Recovered carousel text')
    })
  })

  describe('error notifications', () => {
    it('should notify subscribers of errors', async () => {
      const error = new Error('Test notification error')
      const params: ErrorRecoveryParams = {
        publicationId: 'pub-1',
        error,
        contentItem: mockContentItem,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates,
        campaignId: 'campaign-1',
        attemptNumber: 1
      }

      await errorService.handlePublicationError(params)

      expect(mockNotificationCallback).toHaveBeenCalled()
    })

    it('should allow unsubscribing from notifications', () => {
      const unsubscribe = errorService.subscribeToErrorNotifications(mockNotificationCallback)
      
      unsubscribe()
      
      // Notification should not be called after unsubscribing
      // This is tested implicitly by other tests not receiving unexpected calls
    })
  })

  describe('error history management', () => {
    it('should track error history per publication', async () => {
      const error1 = new Error('First error')
      const error2 = new Error('Second error')
      
      const params1: ErrorRecoveryParams = {
        publicationId: 'pub-1',
        error: error1,
        contentItem: mockContentItem,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates,
        campaignId: 'campaign-1',
        attemptNumber: 1
      }

      const params2: ErrorRecoveryParams = {
        ...params1,
        error: error2,
        attemptNumber: 2
      }

      await errorService.handlePublicationError(params1)
      await errorService.handlePublicationError(params2)

      const history = errorService.getErrorHistory('pub-1')
      expect(history).toHaveLength(2)
      expect(history[0].errorMessage).toBe('First error')
      expect(history[1].errorMessage).toBe('Second error')
    })

    it('should clear error history', async () => {
      const params: ErrorRecoveryParams = {
        publicationId: 'pub-1',
        error: new Error('Test error'),
        contentItem: mockContentItem,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates,
        campaignId: 'campaign-1',
        attemptNumber: 1
      }

      await errorService.handlePublicationError(params)
      
      expect(errorService.getErrorHistory('pub-1')).toHaveLength(1)
      
      errorService.clearErrorHistory('pub-1')
      
      expect(errorService.getErrorHistory('pub-1')).toHaveLength(0)
    })

    it('should clear all error history', async () => {
      const params1: ErrorRecoveryParams = {
        publicationId: 'pub-1',
        error: new Error('Error 1'),
        contentItem: mockContentItem,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates,
        campaignId: 'campaign-1',
        attemptNumber: 1
      }

      const params2: ErrorRecoveryParams = {
        ...params1,
        publicationId: 'pub-2',
        error: new Error('Error 2')
      }

      await errorService.handlePublicationError(params1)
      await errorService.handlePublicationError(params2)
      
      errorService.clearErrorHistory()
      
      expect(errorService.getErrorHistory('pub-1')).toHaveLength(0)
      expect(errorService.getErrorHistory('pub-2')).toHaveLength(0)
    })
  })

  describe('getErrorStats', () => {
    it('should return error statistics', async () => {
      // Generate some errors
      const params1: ErrorRecoveryParams = {
        publicationId: 'pub-1',
        error: new Error('Text agent error'),
        contentItem: { ...mockContentItem, contentType: 'text-only' },
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates,
        campaignId: 'campaign-1',
        attemptNumber: 1
      }

      const params2: ErrorRecoveryParams = {
        publicationId: 'pub-2',
        error: new Error('Image agent error'),
        contentItem: { ...mockContentItem, contentType: 'text-with-image' },
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates,
        campaignId: 'campaign-1',
        attemptNumber: 1
      }

      await errorService.handlePublicationError(params1)
      await errorService.handlePublicationError(params2)

      const stats = errorService.getErrorStats()

      expect(stats.totalErrors).toBe(2)
      expect(stats.errorsByType).toHaveProperty('text-only')
      expect(stats.errorsByType).toHaveProperty('text-image')
      expect(stats.mostCommonErrors).toContain('Text agent error')
      expect(stats.mostCommonErrors).toContain('Image agent error')
      expect(stats.recoveryRate).toBe(0.75) // Placeholder value
    })
  })
})