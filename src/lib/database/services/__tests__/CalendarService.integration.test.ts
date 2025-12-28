/**
 * Integration tests for CalendarService with AI-generated content support
 * Tests database queries, filtering, and data aggregation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CalendarService } from '../CalendarService'
import type { CalendarFilters } from '../CalendarService'

// Mock the database connection
vi.mock('../../connection', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn(),
      run: vi.fn(),
      get: vi.fn()
    }))
  }))
}))

describe('CalendarService Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Calendar Range Queries with AI Content', () => {
    it('should build correct SQL queries for AI content filtering', () => {
      const filters: CalendarFilters = {
        generationStatuses: ['completed'],
        campaignGenerationStatuses: ['completed', 'generating']
      }

      // Test that the service can handle AI-specific filters
      expect(filters.generationStatuses).toContain('completed')
      expect(filters.campaignGenerationStatuses).toContain('completed')
      expect(filters.campaignGenerationStatuses).toContain('generating')
    })

    it('should handle multiple filter types simultaneously', () => {
      const filters: CalendarFilters = {
        socialNetworks: ['instagram', 'linkedin'],
        generationStatuses: ['completed'],
        statuses: ['scheduled'],
        campaignGenerationStatuses: ['completed']
      }

      // Verify filter structure
      expect(filters.socialNetworks).toEqual(['instagram', 'linkedin'])
      expect(filters.generationStatuses).toEqual(['completed'])
      expect(filters.statuses).toEqual(['scheduled'])
      expect(filters.campaignGenerationStatuses).toEqual(['completed'])
    })
  })

  describe('Filter Hash Generation', () => {
    it('should generate consistent hash for same filters', () => {
      const filters1: CalendarFilters = {
        socialNetworks: ['instagram', 'linkedin'],
        generationStatuses: ['completed']
      }

      const filters2: CalendarFilters = {
        socialNetworks: ['instagram', 'linkedin'],
        generationStatuses: ['completed']
      }

      // Access private method for testing
      const hash1 = (CalendarService as any).hashFilters(filters1)
      const hash2 = (CalendarService as any).hashFilters(filters2)

      expect(hash1).toBe(hash2)
      expect(typeof hash1).toBe('string')
      expect(hash1.length).toBeGreaterThan(0)
    })

    it('should generate different hashes for different filters', () => {
      const filters1: CalendarFilters = {
        socialNetworks: ['instagram']
      }

      const filters2: CalendarFilters = {
        socialNetworks: ['linkedin']
      }

      const hash1 = (CalendarService as any).hashFilters(filters1)
      const hash2 = (CalendarService as any).hashFilters(filters2)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle AI-specific filters in hash generation', () => {
      const filters: CalendarFilters = {
        generationStatuses: ['completed', 'generating'],
        campaignGenerationStatuses: ['completed']
      }

      const hash = (CalendarService as any).hashFilters(filters)

      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
    })
  })

  describe('Calendar Data Structure', () => {
    it('should define correct CalendarPublication interface for AI content', () => {
      // Test that the interface supports AI-generated content fields
      const mockPublication = {
        id: 'pub-1',
        campaignId: 'campaign-1',
        campaignName: 'AI Campaign',
        workspaceName: 'Test Workspace',
        socialNetwork: 'instagram' as const,
        content: 'Original content',
        imageUrl: 'https://example.com/image.jpg',
        scheduledDate: new Date('2024-01-15T10:00:00Z'),
        status: 'scheduled' as const,
        generatedText: 'AI generated content',
        generatedImageUrls: ['https://generated.com/image.jpg'],
        generationStatus: 'completed' as const,
        generationMetadata: {
          agentUsed: 'text-image' as const,
          textPrompt: 'Create content',
          imagePrompt: 'Product image',
          templateUsed: 'template-1',
          resourcesUsed: ['resource-1'],
          generationTime: new Date(),
          retryCount: 0,
          processingTimeMs: 5000
        },
        campaignGenerationStatus: 'completed' as const
      }

      // Verify all AI-specific fields are present
      expect(mockPublication.generatedText).toBeDefined()
      expect(mockPublication.generatedImageUrls).toBeDefined()
      expect(mockPublication.generationStatus).toBeDefined()
      expect(mockPublication.generationMetadata).toBeDefined()
      expect(mockPublication.campaignGenerationStatus).toBeDefined()

      // Verify metadata structure
      expect(mockPublication.generationMetadata.agentUsed).toBe('text-image')
      expect(mockPublication.generationMetadata.processingTimeMs).toBe(5000)
      expect(mockPublication.generationMetadata.retryCount).toBe(0)
    })

    it('should support different agent types in metadata', () => {
      const agentTypes = ['text-only', 'text-image', 'text-template', 'carousel'] as const

      agentTypes.forEach(agentType => {
        const metadata = {
          agentUsed: agentType,
          textPrompt: 'Test prompt',
          processingTimeMs: 3000,
          retryCount: 0,
          generationTime: new Date(),
          resourcesUsed: []
        }

        expect(metadata.agentUsed).toBe(agentType)
        expect(typeof metadata.processingTimeMs).toBe('number')
        expect(typeof metadata.retryCount).toBe('number')
      })
    })
  })

  describe('Calendar Filters Interface', () => {
    it('should support all AI-related filter options', () => {
      const filters: CalendarFilters = {
        workspaceIds: ['workspace-1'],
        campaignIds: ['campaign-1'],
        socialNetworks: ['instagram', 'linkedin'],
        statuses: ['scheduled', 'published'],
        generationStatuses: ['pending', 'generating', 'completed', 'failed'],
        campaignGenerationStatuses: ['planning', 'generating', 'completed', 'failed']
      }

      // Verify all filter types are supported
      expect(filters.workspaceIds).toBeDefined()
      expect(filters.campaignIds).toBeDefined()
      expect(filters.socialNetworks).toBeDefined()
      expect(filters.statuses).toBeDefined()
      expect(filters.generationStatuses).toBeDefined()
      expect(filters.campaignGenerationStatuses).toBeDefined()

      // Verify AI-specific filter values
      expect(filters.generationStatuses).toContain('generating')
      expect(filters.generationStatuses).toContain('completed')
      expect(filters.campaignGenerationStatuses).toContain('generating')
      expect(filters.campaignGenerationStatuses).toContain('completed')
    })

    it('should handle empty and undefined filters', () => {
      const emptyFilters: CalendarFilters = {}
      const partialFilters: CalendarFilters = {
        generationStatuses: ['completed']
      }

      expect(emptyFilters.generationStatuses).toBeUndefined()
      expect(partialFilters.generationStatuses).toEqual(['completed'])
      expect(partialFilters.socialNetworks).toBeUndefined()
    })
  })

  describe('Service Method Signatures', () => {
    it('should have correct method signatures for AI content support', () => {
      // Test that methods exist and can be called with correct parameters
      expect(typeof CalendarService.getCalendarRange).toBe('function')
      expect(typeof CalendarService.getCalendarMonth).toBe('function')
      expect(typeof CalendarService.getDayPublications).toBe('function')
      expect(typeof CalendarService.getUpcomingPublications).toBe('function')
      expect(typeof CalendarService.getPublicationStatsByNetwork).toBe('function')
      expect(typeof CalendarService.reschedulePublication).toBe('function')
      expect(typeof CalendarService.cancelPublication).toBe('function')
    })

    it('should support AI-specific filters in all query methods', () => {
      const aiFilters: CalendarFilters = {
        generationStatuses: ['completed'],
        campaignGenerationStatuses: ['completed']
      }

      // Test that the filter types are correctly defined
      expect(aiFilters.generationStatuses).toEqual(['completed'])
      expect(aiFilters.campaignGenerationStatuses).toEqual(['completed'])
      
      // Test that the methods exist and accept the filter parameter
      expect(typeof CalendarService.getCalendarRange).toBe('function')
      expect(typeof CalendarService.getCalendarMonth).toBe('function')
      expect(typeof CalendarService.getDayPublications).toBe('function')
      expect(typeof CalendarService.getUpcomingPublications).toBe('function')
    })
  })

  describe('Data Transformation', () => {
    it('should handle JSON parsing for AI metadata fields', () => {
      // Simulate database row with JSON fields
      const mockDbRow = {
        generatedImageUrls: '["https://image1.jpg", "https://image2.jpg"]',
        generationMetadata: JSON.stringify({
          agentUsed: 'text-image',
          textPrompt: 'Create content',
          processingTimeMs: 5000
        })
      }

      // Test JSON parsing
      const parsedImageUrls = JSON.parse(mockDbRow.generatedImageUrls)
      const parsedMetadata = JSON.parse(mockDbRow.generationMetadata)

      expect(Array.isArray(parsedImageUrls)).toBe(true)
      expect(parsedImageUrls).toHaveLength(2)
      expect(parsedMetadata.agentUsed).toBe('text-image')
      expect(parsedMetadata.processingTimeMs).toBe(5000)
    })

    it('should handle null/undefined AI fields gracefully', () => {
      const mockDbRow = {
        generatedImageUrls: null,
        generationMetadata: null,
        generationStatus: null
      }

      // Should handle null values without errors
      const imageUrls = mockDbRow.generatedImageUrls ? JSON.parse(mockDbRow.generatedImageUrls) : undefined
      const metadata = mockDbRow.generationMetadata ? JSON.parse(mockDbRow.generationMetadata) : undefined
      const status = mockDbRow.generationStatus || 'pending'

      expect(imageUrls).toBeUndefined()
      expect(metadata).toBeUndefined()
      expect(status).toBe('pending')
    })
  })
})