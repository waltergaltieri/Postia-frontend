/**
 * Integration tests for Calendar API route with AI-generated content support
 * Tests API endpoints, filtering, and response formatting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GET } from '../route'
import { CalendarService } from '@/lib/database/services/CalendarService'
import type { CalendarDay } from '@/lib/database/services/CalendarService'

// Mock CalendarService
vi.mock('@/lib/database/services/CalendarService')

// Mock auth middleware
vi.mock('../../auth/middleware', () => ({
  withAuth: (handler: any) => handler,
  handleApiError: (error: any) => {
    return new Response(JSON.stringify({
      success: false,
      message: error.message || 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  },
  successResponse: (data: any, message: string) => {
    return new Response(JSON.stringify({
      success: true,
      data,
      message
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}))

describe('Calendar API Integration Tests', () => {
  const mockCalendarService = CalendarService as any
  
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
          generatedText: 'AI generated Instagram content',
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
      ]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockCalendarService.getCalendarRange = vi.fn().mockResolvedValue(mockCalendarData)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Calendar Data Retrieval', () => {
    it('should return calendar data with AI-generated content', async () => {
      const request = new Request('http://localhost/api/calendar?workspaceId=test-workspace-id')
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      
      const dayData = data.data[0]
      expect(dayData.date).toBe('2024-01-15')
      expect(dayData.publicationCount).toBe(3)
      expect(dayData.publications).toHaveLength(3)

      // Check AI-generated content is included
      const aiPublication = dayData.publications[0]
      expect(aiPublication.generatedText).toBe('AI generated Instagram content')
      expect(aiPublication.generatedImageUrls).toEqual(['https://generated.com/image1.jpg'])
      expect(aiPublication.generationStatus).toBe('completed')
      expect(aiPublication.generationMetadata).toBeDefined()
      expect(aiPublication.campaignGenerationStatus).toBe('completed')
    })

    it('should require workspaceId parameter', async () => {
      const request = new Request('http://localhost/api/calendar')
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('workspaceId es requerido')
    })

    it('should require authenticated user with agencyId', async () => {
      const request = new Request('http://localhost/api/calendar?workspaceId=test-workspace-id')
      ;(request as any).user = {
        id: 'test-user-id'
        // Missing agencyId
      }

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Usuario no autenticado')
    })
  })

  describe('Date Range Filtering', () => {
    it('should use provided date range', async () => {
      const startDate = '2024-01-01'
      const endDate = '2024-01-31'
      const request = new Request(
        `http://localhost/api/calendar?workspaceId=test-workspace-id&startDate=${startDate}&endDate=${endDate}`
      )
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      await GET(request as any)

      expect(mockCalendarService.getCalendarRange).toHaveBeenCalledWith(
        'test-agency-id',
        new Date(startDate),
        new Date(endDate),
        {}
      )
    })

    it('should use default date range when not provided', async () => {
      const request = new Request('http://localhost/api/calendar?workspaceId=test-workspace-id')
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      await GET(request as any)

      expect(mockCalendarService.getCalendarRange).toHaveBeenCalledWith(
        'test-agency-id',
        expect.any(Date),
        expect.any(Date),
        {}
      )

      // Verify the end date is approximately 30 days from now
      const calls = mockCalendarService.getCalendarRange.mock.calls[0]
      const startDate = calls[1]
      const endDate = calls[2]
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBeCloseTo(30, 1)
    })
  })

  describe('AI Content Filtering', () => {
    it('should filter by generation status', async () => {
      const filteredData = mockCalendarData.map(day => ({
        ...day,
        publications: day.publications.filter(pub => pub.generationStatus === 'completed'),
        publicationCount: day.publications.filter(pub => pub.generationStatus === 'completed').length
      }))

      mockCalendarService.getCalendarRange.mockResolvedValue(filteredData)

      const request = new Request(
        'http://localhost/api/calendar?workspaceId=test-workspace-id&generationStatus=completed'
      )
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data[0].publications).toHaveLength(2) // Only AI-generated publications
      expect(data.data[0].publications.every((pub: any) => pub.generationStatus === 'completed')).toBe(true)
    })

    it('should filter by social network', async () => {
      const request = new Request(
        'http://localhost/api/calendar?workspaceId=test-workspace-id&socialNetwork=instagram'
      )
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      await GET(request as any)

      expect(mockCalendarService.getCalendarRange).toHaveBeenCalledWith(
        'test-agency-id',
        expect.any(Date),
        expect.any(Date),
        {
          socialNetworks: ['instagram']
        }
      )
    })

    it('should filter by campaign ID', async () => {
      const request = new Request(
        'http://localhost/api/calendar?workspaceId=test-workspace-id&campaignId=campaign-1'
      )
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      await GET(request as any)

      expect(mockCalendarService.getCalendarRange).toHaveBeenCalledWith(
        'test-agency-id',
        expect.any(Date),
        expect.any(Date),
        {
          campaignIds: ['campaign-1']
        }
      )
    })

    it('should filter by publication status', async () => {
      const request = new Request(
        'http://localhost/api/calendar?workspaceId=test-workspace-id&status=scheduled'
      )
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      await GET(request as any)

      expect(mockCalendarService.getCalendarRange).toHaveBeenCalledWith(
        'test-agency-id',
        expect.any(Date),
        expect.any(Date),
        {
          statuses: ['scheduled']
        }
      )
    })

    it('should apply multiple filters simultaneously', async () => {
      const request = new Request(
        'http://localhost/api/calendar?workspaceId=test-workspace-id&socialNetwork=instagram&status=scheduled&campaignId=campaign-1'
      )
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      await GET(request as any)

      expect(mockCalendarService.getCalendarRange).toHaveBeenCalledWith(
        'test-agency-id',
        expect.any(Date),
        expect.any(Date),
        {
          socialNetworks: ['instagram'],
          statuses: ['scheduled'],
          campaignIds: ['campaign-1']
        }
      )
    })
  })

  describe('AI Content Enhancement', () => {
    it('should enhance publications with AI generation data', async () => {
      const request = new Request('http://localhost/api/calendar?workspaceId=test-workspace-id')
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      const response = await GET(request as any)
      const data = await response.json()

      const publication = data.data[0].publications[0]
      
      // Check AI fields are properly included
      expect(publication.generatedText).toBe('AI generated Instagram content')
      expect(publication.generatedImageUrls).toEqual(['https://generated.com/image1.jpg'])
      expect(publication.generationStatus).toBe('completed')
      expect(publication.generationMetadata).toEqual({
        agentUsed: 'text-image',
        textPrompt: 'Create engaging Instagram content',
        imagePrompt: 'Modern product showcase',
        templateUsed: 'template-1',
        resourcesUsed: ['resource-1'],
        generationTime: expect.any(String),
        retryCount: 0,
        processingTimeMs: 5000
      })
      expect(publication.campaignGenerationStatus).toBe('completed')
    })

    it('should handle publications without AI generation data', async () => {
      const dataWithoutAI = [{
        date: '2024-01-15',
        publicationCount: 1,
        publishedCount: 0,
        scheduledCount: 1,
        failedCount: 0,
        publications: [{
          id: 'pub-manual',
          campaignId: 'campaign-manual',
          campaignName: 'Manual Campaign',
          workspaceName: 'Test Workspace',
          socialNetwork: 'facebook',
          content: 'Manual content',
          imageUrl: 'https://example.com/manual.jpg',
          scheduledDate: new Date('2024-01-15T10:00:00Z'),
          status: 'scheduled'
          // No AI fields
        }]
      }]

      mockCalendarService.getCalendarRange.mockResolvedValue(dataWithoutAI)

      const request = new Request('http://localhost/api/calendar?workspaceId=test-workspace-id')
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      const response = await GET(request as any)
      const data = await response.json()

      const publication = data.data[0].publications[0]
      
      // Check default AI field values
      expect(publication.generatedText).toBeUndefined()
      expect(publication.generatedImageUrls).toBeUndefined()
      expect(publication.generationStatus).toBe('pending')
      expect(publication.generationMetadata).toBeUndefined()
      expect(publication.campaignGenerationStatus).toBeUndefined()
    })
  })

  describe('Generation Status Filtering', () => {
    it('should filter publications by generation status and update counts', async () => {
      const request = new Request(
        'http://localhost/api/calendar?workspaceId=test-workspace-id&generationStatus=completed'
      )
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.data).toHaveLength(1)
      
      const dayData = data.data[0]
      expect(dayData.publicationCount).toBe(2) // Only completed AI publications
      expect(dayData.publications).toHaveLength(2)
      expect(dayData.publications.every((pub: any) => pub.generationStatus === 'completed')).toBe(true)
    })

    it('should exclude days with no matching publications when filtering by generation status', async () => {
      const dataWithMixedStatus = [{
        date: '2024-01-15',
        publicationCount: 2,
        publishedCount: 0,
        scheduledCount: 2,
        failedCount: 0,
        publications: [
          {
            id: 'pub-pending',
            generationStatus: 'pending'
          },
          {
            id: 'pub-failed',
            generationStatus: 'failed'
          }
        ]
      }]

      mockCalendarService.getCalendarRange.mockResolvedValue(dataWithMixedStatus)

      const request = new Request(
        'http://localhost/api/calendar?workspaceId=test-workspace-id&generationStatus=completed'
      )
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      const response = await GET(request as any)
      const data = await response.json()

      // Should return empty array since no publications match the filter
      expect(data.data).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle CalendarService errors', async () => {
      mockCalendarService.getCalendarRange.mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost/api/calendar?workspaceId=test-workspace-id')
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Database error')
    })

    it('should handle missing user context', async () => {
      const request = new Request('http://localhost/api/calendar?workspaceId=test-workspace-id')
      // No user attached to request

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('Response Format', () => {
    it('should return properly formatted success response', async () => {
      const request = new Request('http://localhost/api/calendar?workspaceId=test-workspace-id')
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('message', 'Eventos del calendario obtenidos exitosamente')
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should maintain publication data structure', async () => {
      const request = new Request('http://localhost/api/calendar?workspaceId=test-workspace-id')
      ;(request as any).user = {
        agencyId: 'test-agency-id',
        id: 'test-user-id'
      }

      const response = await GET(request as any)
      const data = await response.json()

      const publication = data.data[0].publications[0]
      
      // Check all required fields are present
      expect(publication).toHaveProperty('id')
      expect(publication).toHaveProperty('campaignId')
      expect(publication).toHaveProperty('campaignName')
      expect(publication).toHaveProperty('socialNetwork')
      expect(publication).toHaveProperty('content')
      expect(publication).toHaveProperty('imageUrl')
      expect(publication).toHaveProperty('scheduledDate')
      expect(publication).toHaveProperty('status')
      
      // Check AI-specific fields
      expect(publication).toHaveProperty('generatedText')
      expect(publication).toHaveProperty('generatedImageUrls')
      expect(publication).toHaveProperty('generationStatus')
      expect(publication).toHaveProperty('generationMetadata')
      expect(publication).toHaveProperty('campaignGenerationStatus')
    })
  })
})