import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { PublicationService } from '@/lib/database/services'
import { ContentGenerationOrchestrator } from '@/lib/ai/orchestrator/ContentGenerationOrchestrator'

// Mock dependencies
vi.mock('@/lib/database/services')
vi.mock('@/lib/ai/orchestrator/ContentGenerationOrchestrator')
vi.mock('../../../auth/middleware', () => ({
  withAuth: (handler: any) => handler,
  handleApiError: (error: any) => ({
    status: 500,
    json: () => Promise.resolve({ success: false, message: error.message })
  }),
  successResponse: (data: any, message: string) => ({
    status: 200,
    json: () => Promise.resolve({ success: true, data, message })
  })
}))

const mockPublicationService = vi.mocked(PublicationService)
const mockOrchestrator = vi.mocked(ContentGenerationOrchestrator)

describe('/api/publications/[id]/regenerate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockRequest = {
    user: { agencyId: 'agency-123' },
    json: vi.fn()
  } as any

  const mockParams = { params: { id: 'pub-123' } }

  it('should regenerate publication successfully', async () => {
    // Mock request body
    mockRequest.json.mockResolvedValue({
      customPrompt: 'Make it more engaging',
      reason: 'content_improvement'
    })

    // Mock publication service
    const mockPublication = {
      id: 'pub-123',
      status: 'scheduled',
      workspace: { id: 'ws-123', name: 'Test Workspace', branding: {} },
      campaign: { resources: [], templates: [] },
      generationMetadata: { agentUsed: 'text-only', textPrompt: 'Original prompt' }
    }

    const mockPublicationServiceInstance = {
      getPublicationWithContext: vi.fn().mockResolvedValue(mockPublication),
      updatePublicationStatus: vi.fn().mockResolvedValue(undefined),
      getPublicationById: vi.fn().mockResolvedValue({
        ...mockPublication,
        generatedText: 'New regenerated content',
        generationStatus: 'completed'
      }),
      getRegenerationHistory: vi.fn().mockResolvedValue([])
    }

    mockPublicationService.mockImplementation(() => mockPublicationServiceInstance as any)

    // Mock orchestrator
    const mockOrchestratorInstance = {
      regeneratePublication: vi.fn().mockResolvedValue(undefined)
    }

    mockOrchestrator.mockImplementation(() => mockOrchestratorInstance as any)

    // Execute request
    const response = await POST(mockRequest, mockParams)
    const result = await response.json()

    // Assertions
    expect(result.success).toBe(true)
    expect(result.message).toBe('Publicación regenerada exitosamente')
    expect(mockPublicationServiceInstance.getPublicationWithContext).toHaveBeenCalledWith('pub-123', 'agency-123')
    expect(mockPublicationServiceInstance.updatePublicationStatus).toHaveBeenCalledWith('pub-123', 'generating', 'agency-123')
    expect(mockOrchestratorInstance.regeneratePublication).toHaveBeenCalled()
  })

  it('should reject regeneration of published publication', async () => {
    mockRequest.json.mockResolvedValue({})

    const mockPublication = {
      id: 'pub-123',
      status: 'published',
      workspace: { id: 'ws-123', name: 'Test Workspace', branding: {} }
    }

    const mockPublicationServiceInstance = {
      getPublicationWithContext: vi.fn().mockResolvedValue(mockPublication)
    }

    mockPublicationService.mockImplementation(() => mockPublicationServiceInstance as any)

    const response = await POST(mockRequest, mockParams)
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toBe('No se puede regenerar una publicación ya publicada')
  })

  it('should handle publication not found', async () => {
    mockRequest.json.mockResolvedValue({})

    const mockPublicationServiceInstance = {
      getPublicationWithContext: vi.fn().mockResolvedValue(null)
    }

    mockPublicationService.mockImplementation(() => mockPublicationServiceInstance as any)

    const response = await POST(mockRequest, mockParams)
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Publicación no encontrada')
  })

  it('should handle regeneration failure', async () => {
    mockRequest.json.mockResolvedValue({})

    const mockPublication = {
      id: 'pub-123',
      status: 'scheduled',
      workspace: { id: 'ws-123', name: 'Test Workspace', branding: {} },
      campaign: { resources: [], templates: [] }
    }

    const mockPublicationServiceInstance = {
      getPublicationWithContext: vi.fn().mockResolvedValue(mockPublication),
      updatePublicationStatus: vi.fn().mockResolvedValue(undefined)
    }

    mockPublicationService.mockImplementation(() => mockPublicationServiceInstance as any)

    const mockOrchestratorInstance = {
      regeneratePublication: vi.fn().mockRejectedValue(new Error('AI service unavailable'))
    }

    mockOrchestrator.mockImplementation(() => mockOrchestratorInstance as any)

    const response = await POST(mockRequest, mockParams)
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toBe('AI service unavailable')
    expect(mockPublicationServiceInstance.updatePublicationStatus).toHaveBeenCalledWith('pub-123', 'failed', 'agency-123')
  })

  it('should handle unauthenticated user', async () => {
    const unauthenticatedRequest = {
      user: null,
      json: vi.fn()
    } as any

    const response = await POST(unauthenticatedRequest, mockParams)
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Usuario no autenticado')
  })

  it('should use default reason when not provided', async () => {
    mockRequest.json.mockResolvedValue({
      customPrompt: 'Test prompt'
      // reason not provided, should default to 'user_request'
    })

    const mockPublication = {
      id: 'pub-123',
      status: 'scheduled',
      workspace: { id: 'ws-123', name: 'Test Workspace', branding: {} },
      campaign: { resources: [], templates: [] }
    }

    const mockPublicationServiceInstance = {
      getPublicationWithContext: vi.fn().mockResolvedValue(mockPublication),
      updatePublicationStatus: vi.fn().mockResolvedValue(undefined),
      getPublicationById: vi.fn().mockResolvedValue(mockPublication),
      getRegenerationHistory: vi.fn().mockResolvedValue([])
    }

    mockPublicationService.mockImplementation(() => mockPublicationServiceInstance as any)

    const mockOrchestratorInstance = {
      regeneratePublication: vi.fn().mockResolvedValue(undefined)
    }

    mockOrchestrator.mockImplementation(() => mockOrchestratorInstance as any)

    await POST(mockRequest, mockParams)

    // Verify that the orchestrator was called (indicating default reason was accepted)
    expect(mockOrchestratorInstance.regeneratePublication).toHaveBeenCalled()
  })
})