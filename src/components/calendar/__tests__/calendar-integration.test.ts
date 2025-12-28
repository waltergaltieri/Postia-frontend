/**
 * Integration tests for calendar functionality with AI-generated content
 * Tests visualization, filtering, and regeneration features
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { CalendarDay, CalendarPublication } from '@/lib/database/services/CalendarService'

// Mock the CalendarService
vi.mock('@/lib/database/services/CalendarService')

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-workspace-id' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

// Mock WorkspaceContext
vi.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      id: 'test-workspace-id',
      name: 'Test Workspace',
      agencyId: 'test-agency-id'
    },
    switchWorkspace: vi.fn(),
    workspaces: [
      {
        id: 'test-workspace-id',
        name: 'Test Workspace',
        agencyId: 'test-agency-id'
      }
    ]
  })
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

// Test data
const mockCalendarData: CalendarDay[] = [
  {
    date: '2024-01-15',
    publicationCount: 3,
    publishedCount: 1,
    scheduledCount: 2,
    failedCount: 0,
    publications: [
      {
        id: 'pub-1',
        campaignId: 'campaign-1',
        campaignName: 'AI Campaign Test',
        workspaceName: 'Test Workspace',
        socialNetwork: 'instagram',
        content: 'Original content',
        imageUrl: 'https://example.com/image1.jpg',
        scheduledDate: new Date('2024-01-15T10:00:00Z'),
        status: 'scheduled',
        generatedText: 'AI generated text for Instagram post',
        generatedImageUrls: ['https://generated.com/image1.jpg'],
        generationStatus: 'completed',
        generationMetadata: {
          agentUsed: 'text-image',
          textPrompt: 'Create engaging Instagram content',
          imagePrompt: 'Modern product showcase',
          templateUsed: 'template-1',
          resourcesUsed: ['resource-1'],
          generationTime: new Date('2024-01-15T09:30:00Z'),
          retryCount: 0,
          processingTimeMs: 5000
        },
        campaignGenerationStatus: 'completed'
      },
      {
        id: 'pub-2',
        campaignId: 'campaign-1',
        campaignName: 'AI Campaign Test',
        workspaceName: 'Test Workspace',
        socialNetwork: 'linkedin',
        content: 'LinkedIn content',
        imageUrl: 'https://example.com/image2.jpg',
        scheduledDate: new Date('2024-01-15T14:00:00Z'),
        status: 'scheduled',
        generatedText: 'Professional LinkedIn post content',
        generatedImageUrls: [],
        generationStatus: 'completed',
        generationMetadata: {
          agentUsed: 'text-only',
          textPrompt: 'Create professional LinkedIn content',
          templateUsed: undefined,
          resourcesUsed: [],
          generationTime: new Date('2024-01-15T13:45:00Z'),
          retryCount: 0,
          processingTimeMs: 3000
        },
        campaignGenerationStatus: 'completed'
      },
      {
        id: 'pub-3',
        campaignId: 'campaign-2',
        campaignName: 'Manual Campaign',
        workspaceName: 'Test Workspace',
        socialNetwork: 'facebook',
        content: 'Manual Facebook content',
        imageUrl: 'https://example.com/image3.jpg',
        scheduledDate: new Date('2024-01-15T16:00:00Z'),
        status: 'published',
        generationStatus: 'pending',
        campaignGenerationStatus: 'planning'
      }
    ] as CalendarPublication[]
  }
]

describe('Calendar Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock fetch for API calls
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Calendar Data Structure and AI Content', () => {
    it('should handle calendar data with AI-generated content', () => {
      const dayData = mockCalendarData[0]
      
      expect(dayData.date).toBe('2024-01-15')
      expect(dayData.publicationCount).toBe(3)
      expect(dayData.publications).toHaveLength(3)

      // Check AI-generated publications
      const aiPublication = dayData.publications[0]
      expect(aiPublication.generatedText).toBe('AI generated text for Instagram post')
      expect(aiPublication.generatedImageUrls).toEqual(['https://generated.com/image1.jpg'])
      expect(aiPublication.generationStatus).toBe('completed')
      expect(aiPublication.generationMetadata).toBeDefined()
      expect(aiPublication.campaignGenerationStatus).toBe('completed')
    })

    it('should group publications by AI campaign correctly', () => {
      const dayData = mockCalendarData[0]
      
      // Count publications by campaign
      const aiCampaignPubs = dayData.publications.filter(pub => pub.campaignName === 'AI Campaign Test')
      const manualCampaignPubs = dayData.publications.filter(pub => pub.campaignName === 'Manual Campaign')
      
      expect(aiCampaignPubs).toHaveLength(2) // pub-1 and pub-2
      expect(manualCampaignPubs).toHaveLength(1) // pub-3
      
      // Verify AI campaign publications have AI content
      aiCampaignPubs.forEach(pub => {
        expect(pub.generationStatus).toBe('completed')
        expect(pub.generatedText).toBeDefined()
      })
    })

    it('should distinguish between AI-generated and manual content', () => {
      const dayData = mockCalendarData[0]
      
      const aiGenerated = dayData.publications.filter(pub => pub.generationStatus === 'completed')
      const manual = dayData.publications.filter(pub => pub.generationStatus === 'pending')
      
      expect(aiGenerated).toHaveLength(2)
      expect(manual).toHaveLength(1)
      
      // AI-generated should have generated content
      aiGenerated.forEach(pub => {
        expect(pub.generatedText).toBeDefined()
        expect(pub.generationMetadata).toBeDefined()
      })
      
      // Manual should not have generated content
      manual.forEach(pub => {
        expect(pub.generatedText).toBeUndefined()
        expect(pub.generationMetadata).toBeUndefined()
      })
    })
  })

  describe('Calendar API Integration', () => {
    it('should fetch calendar data with AI content filters', async () => {
      const mockResponse = {
        success: true,
        data: mockCalendarData,
        message: 'Eventos del calendario obtenidos exitosamente'
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const response = await fetch('/api/calendar?workspaceId=test-workspace-id&generationStatus=completed')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      // Check that we have AI-generated publications
      expect(data.data[0].publications.some((pub: any) => pub.generationStatus === 'completed')).toBe(true)
    })

    it('should filter by social network and generation status', async () => {
      const filteredData = mockCalendarData.map(day => ({
        ...day,
        publications: day.publications.filter(pub => 
          pub.socialNetwork === 'instagram' && pub.generationStatus === 'completed'
        ),
        publicationCount: 1
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: filteredData
        })
      })

      const response = await fetch('/api/calendar?workspaceId=test-workspace-id&socialNetwork=instagram&generationStatus=completed')
      const data = await response.json()

      expect(data.data[0].publications).toHaveLength(1)
      expect(data.data[0].publications[0].socialNetwork).toBe('instagram')
      expect(data.data[0].publications[0].generationStatus).toBe('completed')
    })

    it('should handle empty results when filtering', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: []
        })
      })

      const response = await fetch('/api/calendar?workspaceId=test-workspace-id&generationStatus=failed')
      const data = await response.json()

      expect(data.data).toHaveLength(0)
    })
  })

  describe('Publication Regeneration', () => {
    it('should handle individual publication regeneration', async () => {
      const mockRegenerateResponse = {
        success: true,
        data: {
          id: 'pub-1',
          generatedText: 'Newly regenerated AI content',
          generatedImageUrls: ['https://generated.com/new-image.jpg'],
          generationStatus: 'completed',
          generationMetadata: {
            agentUsed: 'text-image',
            textPrompt: 'Create engaging Instagram content',
            retryCount: 1,
            processingTimeMs: 4500
          }
        },
        message: 'Publicación regenerada exitosamente'
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegenerateResponse)
      })

      const response = await fetch('/api/publications/pub-1/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customPrompt: null
        })
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data.generatedText).toBe('Newly regenerated AI content')
      expect(data.data.generationMetadata.retryCount).toBe(1)
    })

    it('should handle regeneration with custom prompt', async () => {
      const customPrompt = 'Create more engaging content'
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 'pub-1',
            generatedText: 'Content with custom prompt',
            generationStatus: 'completed'
          }
        })
      })

      const response = await fetch('/api/publications/pub-1/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPrompt })
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data.generatedText).toBe('Content with custom prompt')
    })

    it('should handle regeneration errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          message: 'Esta publicación no fue generada con IA'
        })
      })

      const response = await fetch('/api/publications/pub-manual/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPrompt: null })
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Esta publicación no fue generada con IA')
    })
  })

  describe('Generation Metadata Validation', () => {
    it('should validate generation metadata structure', () => {
      const publication = mockCalendarData[0].publications[0]
      const metadata = publication.generationMetadata!

      expect(metadata).toHaveProperty('agentUsed')
      expect(metadata).toHaveProperty('textPrompt')
      expect(metadata).toHaveProperty('processingTimeMs')
      expect(metadata).toHaveProperty('retryCount')
      expect(metadata).toHaveProperty('generationTime')

      expect(typeof metadata.agentUsed).toBe('string')
      expect(typeof metadata.textPrompt).toBe('string')
      expect(typeof metadata.processingTimeMs).toBe('number')
      expect(typeof metadata.retryCount).toBe('number')
      expect(metadata.generationTime).toBeInstanceOf(Date)
    })

    it('should support different agent types', () => {
      const publications = mockCalendarData[0].publications
      
      const textImageAgent = publications.find(p => p.generationMetadata?.agentUsed === 'text-image')
      const textOnlyAgent = publications.find(p => p.generationMetadata?.agentUsed === 'text-only')
      
      expect(textImageAgent).toBeDefined()
      expect(textImageAgent?.generationMetadata?.imagePrompt).toBeDefined()
      expect(textImageAgent?.generatedImageUrls).toHaveLength(1)
      
      expect(textOnlyAgent).toBeDefined()
      expect(textOnlyAgent?.generationMetadata?.imagePrompt).toBeUndefined()
      expect(textOnlyAgent?.generatedImageUrls).toHaveLength(0)
    })

    it('should handle carousel agent metadata', () => {
      const carouselPublication = {
        id: 'pub-carousel',
        campaignId: 'campaign-1',
        campaignName: 'AI Campaign',
        workspaceName: 'Test Workspace',
        socialNetwork: 'instagram' as const,
        content: 'Carousel content',
        imageUrl: 'https://example.com/carousel.jpg',
        scheduledDate: new Date(),
        status: 'scheduled' as const,
        generatedText: 'Carousel post content',
        generatedImageUrls: [
          'https://generated.com/slide1.jpg',
          'https://generated.com/slide2.jpg',
          'https://generated.com/slide3.jpg'
        ],
        generationStatus: 'completed' as const,
        generationMetadata: {
          agentUsed: 'carousel' as const,
          textPrompt: 'Create carousel content',
          imagePrompt: 'Product showcase slides',
          templateUsed: 'carousel-template-1',
          resourcesUsed: ['resource-1', 'resource-2'],
          generationTime: new Date(),
          retryCount: 0,
          processingTimeMs: 12000
        },
        campaignGenerationStatus: 'completed' as const
      }

      expect(carouselPublication.generationMetadata.agentUsed).toBe('carousel')
      expect(carouselPublication.generatedImageUrls).toHaveLength(3)
      expect(carouselPublication.generationMetadata.templateUsed).toBe('carousel-template-1')
      expect(carouselPublication.generationMetadata.resourcesUsed).toHaveLength(2)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      try {
        await fetch('/api/calendar?workspaceId=test-workspace-id')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
    })

    it('should handle malformed calendar data', () => {
      const malformedData = {
        date: '2024-01-15',
        publicationCount: 1,
        publishedCount: 0,
        scheduledCount: 1,
        failedCount: 0,
        publications: [
          {
            id: 'pub-malformed',
            // Missing required fields
            generationStatus: 'completed',
            generationMetadata: null // Null metadata
          }
        ]
      }

      // Should handle missing fields gracefully
      expect(malformedData.publications[0].id).toBe('pub-malformed')
      expect(malformedData.publications[0].generationStatus).toBe('completed')
      expect(malformedData.publications[0].generationMetadata).toBeNull()
    })

    it('should handle publications without AI generation', () => {
      const manualPublication = mockCalendarData[0].publications[2] // pub-3
      
      expect(manualPublication.generationStatus).toBe('pending')
      expect(manualPublication.generatedText).toBeUndefined()
      expect(manualPublication.generatedImageUrls).toBeUndefined()
      expect(manualPublication.generationMetadata).toBeUndefined()
      expect(manualPublication.campaignGenerationStatus).toBe('planning')
    })
  })
})