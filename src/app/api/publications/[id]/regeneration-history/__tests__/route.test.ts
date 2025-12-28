import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { PublicationService } from '@/lib/database/services'

// Mock dependencies
vi.mock('@/lib/database/services')
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

describe('/api/publications/[id]/regeneration-history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockRequest = {
    user: { agencyId: 'agency-123' }
  } as any

  const mockParams = { params: { id: 'pub-123' } }

  it('should get regeneration history successfully', async () => {
    const mockHistory = [
      {
        id: 'regen-1',
        publicationId: 'pub-123',
        previousContent: 'Old content',
        newContent: 'New content',
        reason: 'user_request',
        regeneratedAt: '2024-01-01T10:00:00Z',
        customPrompt: 'Make it better'
      },
      {
        id: 'regen-2',
        publicationId: 'pub-123',
        previousContent: 'New content',
        newContent: 'Newer content',
        reason: 'content_improvement',
        regeneratedAt: '2024-01-02T10:00:00Z'
      }
    ]

    const mockPublicationServiceInstance = {
      getRegenerationHistory: vi.fn().mockResolvedValue(mockHistory)
    }

    mockPublicationService.mockImplementation(() => mockPublicationServiceInstance as any)

    const response = await GET(mockRequest, mockParams)
    const result = await response.json()

    expect(result.success).toBe(true)
    expect(result.message).toBe('Historial de regeneración obtenido exitosamente')
    expect(result.data).toEqual(mockHistory)
    expect(mockPublicationServiceInstance.getRegenerationHistory).toHaveBeenCalledWith('pub-123', 'agency-123')
  })

  it('should return empty history when no regenerations exist', async () => {
    const mockPublicationServiceInstance = {
      getRegenerationHistory: vi.fn().mockResolvedValue([])
    }

    mockPublicationService.mockImplementation(() => mockPublicationServiceInstance as any)

    const response = await GET(mockRequest, mockParams)
    const result = await response.json()

    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('should handle access denied error', async () => {
    const mockPublicationServiceInstance = {
      getRegenerationHistory: vi.fn().mockRejectedValue(new Error('Access denied'))
    }

    mockPublicationService.mockImplementation(() => mockPublicationServiceInstance as any)

    const response = await GET(mockRequest, mockParams)
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Access denied')
  })

  it('should handle unauthenticated user', async () => {
    const unauthenticatedRequest = {
      user: null
    } as any

    const response = await GET(unauthenticatedRequest, mockParams)
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Usuario no autenticado')
  })

  it('should handle publication not found', async () => {
    const mockPublicationServiceInstance = {
      getRegenerationHistory: vi.fn().mockRejectedValue(new Error('Publication not found'))
    }

    mockPublicationService.mockImplementation(() => mockPublicationServiceInstance as any)

    const response = await GET(mockRequest, mockParams)
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Publication not found')
  })
})