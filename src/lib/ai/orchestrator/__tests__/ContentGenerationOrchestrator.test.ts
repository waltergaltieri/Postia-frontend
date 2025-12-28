import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { ContentGenerationOrchestrator } from '../ContentGenerationOrchestrator'
import { ProgressTrackingService } from '../ProgressTrackingService'
import { ErrorHandlingService } from '../ErrorHandlingService'
import { DatabaseService } from '../../../database/DatabaseService'
import type { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from '../../agents/types'

// Mock de los servicios
vi.mock('../ProgressTrackingService')
vi.mock('../ErrorHandlingService')
vi.mock('../../../database/DatabaseService')

// Mock de los agentes
vi.mock('../../agents', () => ({
  createTextOnlyAgent: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: 'Generated text content',
      metadata: {
        agentUsed: 'text-only',
        textPrompt: 'Test prompt',
        generationTime: new Date(),
        retryCount: 0,
        processingTimeMs: 1000
      }
    })
  })),
  createTextImageAgent: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: 'Generated text with image',
      imageUrl: 'https://example.com/image.jpg',
      metadata: {
        agentUsed: 'text-image',
        textPrompt: 'Test prompt',
        imagePrompt: 'Test image prompt',
        generationTime: new Date(),
        retryCount: 0,
        processingTimeMs: 2000
      }
    })
  })),
  createTextTemplateAgent: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: 'Generated text with template',
      imageUrl: 'https://example.com/template-image.jpg',
      templateTexts: { title: 'Test Title', subtitle: 'Test Subtitle' },
      metadata: {
        agentUsed: 'text-template',
        textPrompt: 'Test prompt',
        templateUsed: 'template-1',
        generationTime: new Date(),
        retryCount: 0,
        processingTimeMs: 3000
      }
    })
  })),
  createCarouselAgent: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue({
      text: 'Generated carousel text',
      imageUrls: ['https://example.com/carousel1.jpg', 'https://example.com/carousel2.jpg'],
      templateTexts: [
        { title: 'Slide 1', subtitle: 'Content 1' },
        { title: 'Slide 2', subtitle: 'Content 2' }
      ],
      metadata: {
        agentUsed: 'carousel',
        textPrompt: 'Test prompt',
        templateUsed: 'carousel-template-1',
        generationTime: new Date(),
        retryCount: 0,
        processingTimeMs: 5000
      }
    })
  }))
}))

describe('ContentGenerationOrchestrator', () => {
  let orchestrator: ContentGenerationOrchestrator
  let mockProgressService: Mock
  let mockErrorService: Mock
  let mockDatabaseService: Mock

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
    },
    {
      id: 'carousel-template-1',
      name: 'Test Carousel Template',
      type: 'carousel',
      socialNetworks: ['instagram'],
      images: ['https://example.com/carousel-template.jpg']
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mocks
    mockProgressService = vi.mocked(ProgressTrackingService).prototype
    mockErrorService = vi.mocked(ErrorHandlingService).prototype
    mockDatabaseService = vi.mocked(DatabaseService).prototype

    // Mock progress service methods
    mockProgressService.createProgress = vi.fn().mockResolvedValue({
      id: 'progress-1',
      campaignId: 'campaign-1',
      totalPublications: 2,
      completedPublications: 0,
      errors: [],
      startedAt: new Date()
    })
    mockProgressService.updateCurrentPublication = vi.fn().mockResolvedValue({})
    mockProgressService.incrementCompleted = vi.fn().mockResolvedValue({})
    mockProgressService.addError = vi.fn().mockResolvedValue(undefined)
    mockProgressService.completeProgress = vi.fn().mockResolvedValue({})

    // Mock database service methods
    mockDatabaseService.createPublication = vi.fn().mockResolvedValue('publication-1')
    mockDatabaseService.updateCampaign = vi.fn().mockResolvedValue(undefined)

    orchestrator = new ContentGenerationOrchestrator()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateCampaignContent', () => {
    it('should successfully generate content for text-only publications', async () => {
      const contentPlan: ContentPlanItem[] = [
        {
          id: 'content-1',
          title: 'Test Text Content',
          description: 'Test description for text content',
          socialNetwork: 'instagram',
          scheduledDate: '2024-01-15T10:00:00Z',
          contentType: 'text-only',
          resourceIds: [],
          priority: 'medium',
          tags: ['test']
        }
      ]

      await orchestrator.generateCampaignContent({
        campaignId: 'campaign-1',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })

      // Verify progress tracking was called
      expect(mockProgressService.createProgress).toHaveBeenCalledWith('campaign-1', 1)
      expect(mockProgressService.updateCurrentPublication).toHaveBeenCalled()
      expect(mockProgressService.incrementCompleted).toHaveBeenCalled()
      expect(mockProgressService.completeProgress).toHaveBeenCalled()

      // Verify database operations
      expect(mockDatabaseService.updateCampaign).toHaveBeenCalledWith('campaign-1', { generationStatus: 'generating' })
      expect(mockDatabaseService.createPublication).toHaveBeenCalled()
      expect(mockDatabaseService.updateCampaign).toHaveBeenCalledWith('campaign-1', { generationStatus: 'completed' })
    })

    it('should successfully generate content for text-image publications', async () => {
      const contentPlan: ContentPlanItem[] = [
        {
          id: 'content-1',
          title: 'Test Image Content',
          description: 'Test description for image content',
          socialNetwork: 'instagram',
          scheduledDate: '2024-01-15T10:00:00Z',
          contentType: 'text-with-image',
          resourceIds: ['resource-1'],
          priority: 'medium',
          tags: ['test']
        }
      ]

      await orchestrator.generateCampaignContent({
        campaignId: 'campaign-1',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })

      expect(mockProgressService.createProgress).toHaveBeenCalledWith('campaign-1', 1)
      expect(mockDatabaseService.createPublication).toHaveBeenCalled()
    })

    it('should successfully generate content for template publications', async () => {
      const contentPlan: ContentPlanItem[] = [
        {
          id: 'content-1',
          title: 'Test Template Content',
          description: 'Test description for template content',
          socialNetwork: 'instagram',
          scheduledDate: '2024-01-15T10:00:00Z',
          contentType: 'text-with-image',
          templateId: 'template-1',
          resourceIds: ['resource-1'],
          priority: 'medium',
          tags: ['test']
        }
      ]

      await orchestrator.generateCampaignContent({
        campaignId: 'campaign-1',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })

      expect(mockProgressService.createProgress).toHaveBeenCalledWith('campaign-1', 1)
      expect(mockDatabaseService.createPublication).toHaveBeenCalled()
    })

    it('should successfully generate content for carousel publications', async () => {
      const contentPlan: ContentPlanItem[] = [
        {
          id: 'content-1',
          title: 'Test Carousel Content',
          description: 'Test description for carousel content',
          socialNetwork: 'instagram',
          scheduledDate: '2024-01-15T10:00:00Z',
          contentType: 'text-with-carousel',
          templateId: 'carousel-template-1',
          resourceIds: ['resource-1'],
          priority: 'medium',
          tags: ['test']
        }
      ]

      await orchestrator.generateCampaignContent({
        campaignId: 'campaign-1',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })

      expect(mockProgressService.createProgress).toHaveBeenCalledWith('campaign-1', 1)
      expect(mockDatabaseService.createPublication).toHaveBeenCalled()
    })

    it('should handle multiple publications sequentially', async () => {
      const contentPlan: ContentPlanItem[] = [
        {
          id: 'content-1',
          title: 'Test Content 1',
          description: 'Test description 1',
          socialNetwork: 'instagram',
          scheduledDate: '2024-01-15T10:00:00Z',
          contentType: 'text-only',
          resourceIds: [],
          priority: 'medium',
          tags: ['test']
        },
        {
          id: 'content-2',
          title: 'Test Content 2',
          description: 'Test description 2',
          socialNetwork: 'instagram',
          scheduledDate: '2024-01-16T10:00:00Z',
          contentType: 'text-with-image',
          resourceIds: ['resource-1'],
          priority: 'medium',
          tags: ['test']
        }
      ]

      await orchestrator.generateCampaignContent({
        campaignId: 'campaign-1',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })

      // Should create progress for 2 publications
      expect(mockProgressService.createProgress).toHaveBeenCalledWith('campaign-1', 2)
      
      // Should update current publication twice
      expect(mockProgressService.updateCurrentPublication).toHaveBeenCalledTimes(2)
      
      // Should increment completed twice
      expect(mockProgressService.incrementCompleted).toHaveBeenCalledTimes(2)
      
      // Should create 2 publications
      expect(mockDatabaseService.createPublication).toHaveBeenCalledTimes(2)
    })

    it('should handle errors and attempt recovery', async () => {
      const contentPlan: ContentPlanItem[] = [
        {
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
      ]

      // Mock agent to throw error
      const { createTextOnlyAgent } = await import('../../agents')
      const mockAgent = vi.mocked(createTextOnlyAgent)()
      mockAgent.generate = vi.fn().mockRejectedValue(new Error('Test error'))

      // Mock error service recovery
      mockErrorService.handlePublicationError = vi.fn().mockResolvedValue({
        publicationId: 'content-1',
        success: true,
        content: {
          text: 'Recovered content',
          metadata: { agentUsed: 'text-only', retryCount: 1 }
        },
        retryCount: 1
      })

      await orchestrator.generateCampaignContent({
        campaignId: 'campaign-1',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })

      // Should attempt error recovery
      expect(mockErrorService.handlePublicationError).toHaveBeenCalled()
      
      // Should still complete successfully after recovery
      expect(mockProgressService.incrementCompleted).toHaveBeenCalled()
      expect(mockDatabaseService.updateCampaign).toHaveBeenCalledWith('campaign-1', { generationStatus: 'completed' })
    })

    it('should handle permanent failures', async () => {
      const contentPlan: ContentPlanItem[] = [
        {
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
      ]

      // Mock agent to throw error
      const { createTextOnlyAgent } = await import('../../agents')
      const mockAgent = vi.mocked(createTextOnlyAgent)()
      mockAgent.generate = vi.fn().mockRejectedValue(new Error('Test error'))

      // Mock error service to fail recovery
      mockErrorService.handlePublicationError = vi.fn().mockResolvedValue({
        publicationId: 'content-1',
        success: false,
        error: 'Recovery failed',
        retryCount: 3
      })

      await orchestrator.generateCampaignContent({
        campaignId: 'campaign-1',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })

      // Should mark campaign as failed
      expect(mockDatabaseService.updateCampaign).toHaveBeenCalledWith('campaign-1', { generationStatus: 'failed' })
    })

    it('should prevent concurrent generations for same campaign', async () => {
      const contentPlan: ContentPlanItem[] = [
        {
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
      ]

      const params = {
        campaignId: 'campaign-1',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      }

      // Start first generation (don't await)
      const firstGeneration = orchestrator.generateCampaignContent(params)

      // Try to start second generation immediately
      await expect(orchestrator.generateCampaignContent(params))
        .rejects.toThrow('Generation already in progress for campaign campaign-1')

      // Wait for first generation to complete
      await firstGeneration
    })
  })

  describe('cancelGeneration', () => {
    it('should cancel active generation', async () => {
      mockProgressService.getProgress = vi.fn().mockResolvedValue({
        id: 'progress-1',
        campaignId: 'campaign-1'
      })

      await orchestrator.cancelGeneration('campaign-1')

      expect(mockDatabaseService.updateCampaign).toHaveBeenCalledWith('campaign-1', { generationStatus: 'failed' })
      expect(mockProgressService.completeProgress).toHaveBeenCalledWith('progress-1')
    })
  })

  describe('getGenerationProgress', () => {
    it('should return progress for campaign', async () => {
      const mockProgress = {
        id: 'progress-1',
        campaignId: 'campaign-1',
        totalPublications: 5,
        completedPublications: 3,
        errors: [],
        startedAt: new Date()
      }

      mockProgressService.getProgress = vi.fn().mockResolvedValue(mockProgress)

      const result = await orchestrator.getGenerationProgress('campaign-1')

      expect(result).toEqual(mockProgress)
      expect(mockProgressService.getProgress).toHaveBeenCalledWith('campaign-1')
    })
  })

  describe('isGenerationActive', () => {
    it('should return true for active generation', async () => {
      // Start a generation to make it active
      const contentPlan: ContentPlanItem[] = [
        {
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
      ]

      // Start generation (don't await to keep it active)
      const generation = orchestrator.generateCampaignContent({
        campaignId: 'campaign-1',
        contentPlan,
        workspace: mockWorkspace,
        resources: mockResources,
        templates: mockTemplates
      })

      // Check if active
      expect(orchestrator.isGenerationActive('campaign-1')).toBe(true)

      // Wait for completion
      await generation

      // Should no longer be active
      expect(orchestrator.isGenerationActive('campaign-1')).toBe(false)
    })

    it('should return false for inactive generation', () => {
      expect(orchestrator.isGenerationActive('campaign-1')).toBe(false)
    })
  })

  describe('getOrchestratorStats', () => {
    it('should return orchestrator statistics', () => {
      const stats = orchestrator.getOrchestratorStats()

      expect(stats).toEqual({
        activeGenerations: 0,
        supportedAgents: ['text-only', 'text-image', 'text-template', 'carousel'],
        capabilities: [
          'Sequential publication processing',
          'Real-time progress tracking',
          'Automatic error recovery',
          'Agent routing by content type',
          'Database persistence',
          'Generation cancellation'
        ]
      })
    })
  })
})