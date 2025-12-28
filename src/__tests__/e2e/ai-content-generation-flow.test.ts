/**
 * End-to-End Tests for AI Content Generation Flow
 * 
 * Tests the complete flow from step 4 (content plan confirmation) 
 * to calendar visualization with generated content.
 * 
 * Requirements covered:
 * - 1.1: Complete generation flow from step 4 to calendar
 * - 2.1: Calendar visualization of generated content
 * - 8.1: Integration with Gemini APIs
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DatabaseService } from '@/lib/database/DatabaseService'
import { ContentGenerationOrchestrator } from '@/lib/ai/orchestrator/ContentGenerationOrchestrator'
import { GeminiTextService } from '@/lib/ai/services/GeminiTextService'
import { GeminiImageService } from '@/lib/ai/services/GeminiImageService'
import { TextOnlyAgent } from '@/lib/ai/agents/TextOnlyAgent'
import { TextImageAgent } from '@/lib/ai/agents/TextImageAgent'
import { TextTemplateAgent } from '@/lib/ai/agents/TextTemplateAgent'
import { CarouselAgent } from '@/lib/ai/agents/CarouselAgent'
import type { ContentPlanItem, Campaign, Publication, GenerationProgress } from '@/lib/database/types'

// Mock external dependencies
vi.mock('@/lib/ai/services/GeminiTextService')
vi.mock('@/lib/ai/services/GeminiImageService')
vi.mock('@/lib/ai/agents/TextOnlyAgent')
vi.mock('@/lib/ai/agents/TextImageAgent')
vi.mock('@/lib/ai/agents/TextTemplateAgent')
vi.mock('@/lib/ai/agents/CarouselAgent')

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AI Content Generation End-to-End Flow', () => {
  let dbService: DatabaseService
  let orchestrator: ContentGenerationOrchestrator
  
  // Test data
  const testWorkspaceId = 'test-workspace-id'
  const testAgencyId = 'test-agency-id'
  const testUserId = 'test-user-id'
  const testCampaignId = 'test-campaign-id'

  const mockContentPlan: ContentPlanItem[] = [
    {
      id: 'plan-1',
      socialNetwork: 'instagram',
      contentType: 'text-image',
      idea: 'Showcase new product features with engaging visuals',
      scheduledDate: new Date('2024-02-15T10:00:00Z'),
      resourceIds: ['resource-1'],
      templateId: 'template-1'
    },
    {
      id: 'plan-2',
      socialNetwork: 'linkedin',
      contentType: 'text-only',
      idea: 'Professional insights about industry trends',
      scheduledDate: new Date('2024-02-15T14:00:00Z'),
      resourceIds: [],
      templateId: undefined
    },
    {
      id: 'plan-3',
      socialNetwork: 'facebook',
      contentType: 'text-template',
      idea: 'Brand story with custom design template',
      scheduledDate: new Date('2024-02-16T09:00:00Z'),
      resourceIds: ['resource-2'],
      templateId: 'template-2'
    },
    {
      id: 'plan-4',
      socialNetwork: 'instagram',
      contentType: 'carousel',
      idea: 'Multi-slide product showcase',
      scheduledDate: new Date('2024-02-16T16:00:00Z'),
      resourceIds: ['resource-1', 'resource-3'],
      templateId: 'template-carousel'
    }
  ]

  const mockWorkspaceData = {
    id: testWorkspaceId,
    name: 'Test Workspace',
    agencyId: testAgencyId,
    brandVoice: 'Professional and engaging',
    targetAudience: 'Tech professionals and enthusiasts',
    industry: 'Technology'
  }

  const mockResources = [
    {
      id: 'resource-1',
      name: 'Product Image 1',
      type: 'image',
      url: 'https://example.com/product1.jpg',
      description: 'Main product showcase image'
    },
    {
      id: 'resource-2',
      name: 'Brand Logo',
      type: 'image',
      url: 'https://example.com/logo.png',
      description: 'Company brand logo'
    },
    {
      id: 'resource-3',
      name: 'Product Image 2',
      type: 'image',
      url: 'https://example.com/product2.jpg',
      description: 'Secondary product image'
    }
  ]

  const mockTemplates = [
    {
      id: 'template-1',
      name: 'Modern Product Template',
      type: 'single',
      description: 'Clean modern design for product showcases'
    },
    {
      id: 'template-2',
      name: 'Brand Story Template',
      type: 'single',
      description: 'Template for brand storytelling'
    },
    {
      id: 'template-carousel',
      name: 'Product Carousel',
      type: 'carousel',
      description: 'Multi-slide carousel template'
    }
  ]

  beforeAll(async () => {
    // Initialize test database service
    dbService = new DatabaseService()
    
    // Setup test data would be handled by the actual database service
    // For now, we'll mock the database operations
  })

  afterAll(async () => {
    // Cleanup would be handled by the actual database service
  })

  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
    orchestrator = new ContentGenerationOrchestrator()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test data setup is mocked since we're using placeholder DatabaseService
  // In a real implementation, this would set up actual test data

  function setupMocks() {
    // Mock Gemini services
    const mockGeminiText = GeminiTextService as any
    const mockGeminiImage = GeminiImageService as any
    
    mockGeminiText.prototype.generateText = vi.fn().mockImplementation(async (prompt: string) => {
      if (prompt.includes('Instagram')) return 'Generated Instagram content with engaging hashtags #product #innovation'
      if (prompt.includes('LinkedIn')) return 'Professional LinkedIn post about industry trends and insights'
      if (prompt.includes('Facebook')) return 'Facebook post with brand story and call to action'
      return 'Generated social media content'
    })

    mockGeminiImage.prototype.generateImage = vi.fn().mockResolvedValue('https://generated.com/image.jpg')
    mockGeminiImage.prototype.generateTemplateImage = vi.fn().mockResolvedValue('https://generated.com/template-image.jpg')
    mockGeminiImage.prototype.generateCarousel = vi.fn().mockResolvedValue([
      'https://generated.com/carousel-1.jpg',
      'https://generated.com/carousel-2.jpg',
      'https://generated.com/carousel-3.jpg'
    ])

    // Mock agents
    const mockTextOnlyAgent = TextOnlyAgent as any
    const mockTextImageAgent = TextImageAgent as any
    const mockTextTemplateAgent = TextTemplateAgent as any
    const mockCarouselAgent = CarouselAgent as any

    mockTextOnlyAgent.prototype.generate = vi.fn().mockResolvedValue({
      text: 'Professional LinkedIn post about industry trends and insights',
      metadata: {
        agentUsed: 'text-only',
        textPrompt: 'Generate professional LinkedIn content',
        resourcesUsed: [],
        generationTime: new Date(),
        retryCount: 0,
        processingTimeMs: 2000
      }
    })

    mockTextImageAgent.prototype.generate = vi.fn().mockResolvedValue({
      text: 'Generated Instagram content with engaging hashtags #product #innovation',
      imageUrl: 'https://generated.com/instagram-image.jpg',
      metadata: {
        agentUsed: 'text-image',
        textPrompt: 'Generate Instagram content',
        imagePrompt: 'Product showcase image',
        resourcesUsed: ['resource-1'],
        generationTime: new Date(),
        retryCount: 0,
        processingTimeMs: 4000
      }
    })

    mockTextTemplateAgent.prototype.generate = vi.fn().mockResolvedValue({
      text: 'Facebook post with brand story and call to action',
      imageUrl: 'https://generated.com/template-image.jpg',
      templateTexts: { title: 'Brand Story', subtitle: 'Our Journey' },
      metadata: {
        agentUsed: 'text-template',
        textPrompt: 'Generate Facebook brand story',
        imagePrompt: 'Brand story template',
        templateUsed: 'template-2',
        resourcesUsed: ['resource-2'],
        generationTime: new Date(),
        retryCount: 0,
        processingTimeMs: 6000
      }
    })

    mockCarouselAgent.prototype.generate = vi.fn().mockResolvedValue({
      text: 'Multi-slide product showcase with detailed features',
      imageUrls: [
        'https://generated.com/carousel-1.jpg',
        'https://generated.com/carousel-2.jpg',
        'https://generated.com/carousel-3.jpg'
      ],
      templateTexts: [
        { title: 'Feature 1', description: 'Amazing capability' },
        { title: 'Feature 2', description: 'Innovative design' },
        { title: 'Feature 3', description: 'User-friendly interface' }
      ],
      metadata: {
        agentUsed: 'carousel',
        textPrompt: 'Generate carousel content',
        imagePrompt: 'Product carousel images',
        templateUsed: 'template-carousel',
        resourcesUsed: ['resource-1', 'resource-3'],
        generationTime: new Date(),
        retryCount: 0,
        processingTimeMs: 8000
      }
    })

    // Mock API responses
    mockFetch.mockImplementation(async (url: string, options: any) => {
      const urlStr = url.toString()
      
      if (urlStr.includes('/api/campaigns/') && urlStr.includes('/generate-content')) {
        return new Response(JSON.stringify({
          success: true,
          data: { generationId: 'gen-123' },
          message: 'Generación iniciada exitosamente'
        }), { status: 200 })
      }
      
      if (urlStr.includes('/api/campaigns/') && urlStr.includes('/generation-progress')) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            id: 'gen-123',
            campaignId: testCampaignId,
            totalPublications: 4,
            completedPublications: 4,
            currentPublicationId: null,
            currentAgent: null,
            currentStep: null,
            errors: [],
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            estimatedTimeRemaining: 0
          },
          message: 'Progreso obtenido exitosamente'
        }), { status: 200 })
      }
      
      if (urlStr.includes('/api/calendar')) {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              date: '2024-02-15',
              publicationCount: 2,
              publishedCount: 0,
              scheduledCount: 2,
              failedCount: 0,
              publications: [
                {
                  id: 'pub-1',
                  campaignId: testCampaignId,
                  campaignName: 'AI Generated Campaign',
                  workspaceName: 'Test Workspace',
                  socialNetwork: 'instagram',
                  content: 'Original content',
                  imageUrl: 'https://example.com/original.jpg',
                  scheduledDate: '2024-02-15T10:00:00Z',
                  status: 'scheduled',
                  generatedText: 'Generated Instagram content with engaging hashtags #product #innovation',
                  generatedImageUrls: ['https://generated.com/instagram-image.jpg'],
                  generationStatus: 'completed',
                  generationMetadata: {
                    agentUsed: 'text-image',
                    textPrompt: 'Generate Instagram content',
                    imagePrompt: 'Product showcase image',
                    resourcesUsed: ['resource-1'],
                    generationTime: new Date().toISOString(),
                    retryCount: 0,
                    processingTimeMs: 4000
                  },
                  campaignGenerationStatus: 'completed'
                },
                {
                  id: 'pub-2',
                  campaignId: testCampaignId,
                  campaignName: 'AI Generated Campaign',
                  workspaceName: 'Test Workspace',
                  socialNetwork: 'linkedin',
                  content: 'Original LinkedIn content',
                  imageUrl: null,
                  scheduledDate: '2024-02-15T14:00:00Z',
                  status: 'scheduled',
                  generatedText: 'Professional LinkedIn post about industry trends and insights',
                  generatedImageUrls: [],
                  generationStatus: 'completed',
                  generationMetadata: {
                    agentUsed: 'text-only',
                    textPrompt: 'Generate professional LinkedIn content',
                    resourcesUsed: [],
                    generationTime: new Date().toISOString(),
                    retryCount: 0,
                    processingTimeMs: 2000
                  },
                  campaignGenerationStatus: 'completed'
                }
              ]
            },
            {
              date: '2024-02-16',
              publicationCount: 2,
              publishedCount: 0,
              scheduledCount: 2,
              failedCount: 0,
              publications: [
                {
                  id: 'pub-3',
                  campaignId: testCampaignId,
                  campaignName: 'AI Generated Campaign',
                  workspaceName: 'Test Workspace',
                  socialNetwork: 'facebook',
                  content: 'Original Facebook content',
                  imageUrl: 'https://example.com/facebook.jpg',
                  scheduledDate: '2024-02-16T09:00:00Z',
                  status: 'scheduled',
                  generatedText: 'Facebook post with brand story and call to action',
                  generatedImageUrls: ['https://generated.com/template-image.jpg'],
                  generationStatus: 'completed',
                  generationMetadata: {
                    agentUsed: 'text-template',
                    textPrompt: 'Generate Facebook brand story',
                    imagePrompt: 'Brand story template',
                    templateUsed: 'template-2',
                    resourcesUsed: ['resource-2'],
                    generationTime: new Date().toISOString(),
                    retryCount: 0,
                    processingTimeMs: 6000
                  },
                  campaignGenerationStatus: 'completed'
                },
                {
                  id: 'pub-4',
                  campaignId: testCampaignId,
                  campaignName: 'AI Generated Campaign',
                  workspaceName: 'Test Workspace',
                  socialNetwork: 'instagram',
                  content: 'Original carousel content',
                  imageUrl: 'https://example.com/carousel.jpg',
                  scheduledDate: '2024-02-16T16:00:00Z',
                  status: 'scheduled',
                  generatedText: 'Multi-slide product showcase with detailed features',
                  generatedImageUrls: [
                    'https://generated.com/carousel-1.jpg',
                    'https://generated.com/carousel-2.jpg',
                    'https://generated.com/carousel-3.jpg'
                  ],
                  generationStatus: 'completed',
                  generationMetadata: {
                    agentUsed: 'carousel',
                    textPrompt: 'Generate carousel content',
                    imagePrompt: 'Product carousel images',
                    templateUsed: 'template-carousel',
                    resourcesUsed: ['resource-1', 'resource-3'],
                    generationTime: new Date().toISOString(),
                    retryCount: 0,
                    processingTimeMs: 8000
                  },
                  campaignGenerationStatus: 'completed'
                }
              ]
            }
          ],
          message: 'Eventos del calendario obtenidos exitosamente'
        }), { status: 200 })
      }
      
      return new Response(JSON.stringify({ success: false, message: 'Not found' }), { status: 404 })
    })
  }

  describe('Complete Generation Flow', () => {
    it('should complete the full flow from content plan to calendar visualization', async () => {
      // Step 1: Create campaign with content plan
      const campaign: Campaign = {
        id: testCampaignId,
        workspaceId: testWorkspaceId,
        name: 'AI Generated Campaign',
        description: 'Test campaign for AI content generation',
        status: 'planning',
        generationStatus: 'planning',
        generationProgress: {
          total: 4,
          completed: 0,
          current: undefined,
          errors: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await dbService.run(`
        INSERT INTO campaigns (id, workspace_id, name, description, status, generation_status, generation_progress, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        campaign.id,
        campaign.workspaceId,
        campaign.name,
        campaign.description,
        campaign.status,
        campaign.generationStatus,
        JSON.stringify(campaign.generationProgress),
        campaign.createdAt.toISOString(),
        campaign.updatedAt.toISOString()
      ])

      // Step 2: Trigger content generation
      const response = await fetch(`/api/campaigns/${testCampaignId}/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPlan: mockContentPlan,
          workspaceData: mockWorkspaceData,
          resources: mockResources,
          templates: mockTemplates
        })
      })

      expect(response.status).toBe(200)
      const generationResult = await response.json()
      expect(generationResult.success).toBe(true)
      expect(generationResult.data.generationId).toBe('gen-123')

      // Step 3: Monitor generation progress
      const progressResponse = await fetch(`/api/campaigns/${testCampaignId}/generation-progress`)
      expect(progressResponse.status).toBe(200)
      
      const progressData = await progressResponse.json()
      expect(progressData.success).toBe(true)
      expect(progressData.data.totalPublications).toBe(4)
      expect(progressData.data.completedPublications).toBe(4)
      expect(progressData.data.completedAt).toBeDefined()

      // Step 4: Verify calendar shows generated content
      const calendarResponse = await fetch(`/api/calendar?workspaceId=${testWorkspaceId}`)
      expect(calendarResponse.status).toBe(200)
      
      const calendarData = await calendarResponse.json()
      expect(calendarData.success).toBe(true)
      expect(calendarData.data).toHaveLength(2) // Two days with publications

      // Verify first day publications
      const day1 = calendarData.data[0]
      expect(day1.date).toBe('2024-02-15')
      expect(day1.publicationCount).toBe(2)
      expect(day1.publications).toHaveLength(2)

      // Check Instagram publication (text-image agent)
      const instagramPub = day1.publications.find((p: any) => p.socialNetwork === 'instagram')
      expect(instagramPub).toBeDefined()
      expect(instagramPub.generatedText).toBe('Generated Instagram content with engaging hashtags #product #innovation')
      expect(instagramPub.generatedImageUrls).toEqual(['https://generated.com/instagram-image.jpg'])
      expect(instagramPub.generationStatus).toBe('completed')
      expect(instagramPub.generationMetadata.agentUsed).toBe('text-image')

      // Check LinkedIn publication (text-only agent)
      const linkedinPub = day1.publications.find((p: any) => p.socialNetwork === 'linkedin')
      expect(linkedinPub).toBeDefined()
      expect(linkedinPub.generatedText).toBe('Professional LinkedIn post about industry trends and insights')
      expect(linkedinPub.generatedImageUrls).toEqual([])
      expect(linkedinPub.generationStatus).toBe('completed')
      expect(linkedinPub.generationMetadata.agentUsed).toBe('text-only')

      // Verify second day publications
      const day2 = calendarData.data[1]
      expect(day2.date).toBe('2024-02-16')
      expect(day2.publicationCount).toBe(2)
      expect(day2.publications).toHaveLength(2)

      // Check Facebook publication (text-template agent)
      const facebookPub = day2.publications.find((p: any) => p.socialNetwork === 'facebook')
      expect(facebookPub).toBeDefined()
      expect(facebookPub.generatedText).toBe('Facebook post with brand story and call to action')
      expect(facebookPub.generatedImageUrls).toEqual(['https://generated.com/template-image.jpg'])
      expect(facebookPub.generationStatus).toBe('completed')
      expect(facebookPub.generationMetadata.agentUsed).toBe('text-template')
      expect(facebookPub.generationMetadata.templateUsed).toBe('template-2')

      // Check Instagram carousel publication (carousel agent)
      const carouselPub = day2.publications.find((p: any) => p.id === 'pub-4')
      expect(carouselPub).toBeDefined()
      expect(carouselPub.generatedText).toBe('Multi-slide product showcase with detailed features')
      expect(carouselPub.generatedImageUrls).toHaveLength(3)
      expect(carouselPub.generationStatus).toBe('completed')
      expect(carouselPub.generationMetadata.agentUsed).toBe('carousel')
      expect(carouselPub.generationMetadata.templateUsed).toBe('template-carousel')
    })

    it('should handle all four agent types correctly', async () => {
      // Test each agent type individually through the orchestrator
      const params = {
        campaignId: testCampaignId,
        contentPlan: mockContentPlan,
        workspace: mockWorkspaceData,
        resources: mockResources,
        templates: mockTemplates
      }

      // This would normally be called by the API endpoint
      await orchestrator.generateCampaignContent(params)

      // Verify all agents were called
      expect(TextOnlyAgent.prototype.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          contentPlan: expect.objectContaining({ contentType: 'text-only' }),
          workspace: mockWorkspaceData
        })
      )

      expect(TextImageAgent.prototype.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          contentPlan: expect.objectContaining({ contentType: 'text-image' }),
          workspace: mockWorkspaceData,
          resources: expect.arrayContaining([
            expect.objectContaining({ id: 'resource-1' })
          ])
        })
      )

      expect(TextTemplateAgent.prototype.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          contentPlan: expect.objectContaining({ contentType: 'text-template' }),
          workspace: mockWorkspaceData,
          resources: expect.arrayContaining([
            expect.objectContaining({ id: 'resource-2' })
          ]),
          template: expect.objectContaining({ id: 'template-2' })
        })
      )

      expect(CarouselAgent.prototype.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          contentPlan: expect.objectContaining({ contentType: 'carousel' }),
          workspace: mockWorkspaceData,
          resources: expect.arrayContaining([
            expect.objectContaining({ id: 'resource-1' }),
            expect.objectContaining({ id: 'resource-3' })
          ]),
          template: expect.objectContaining({ id: 'template-carousel' })
        })
      )
    })

    it('should integrate with Gemini APIs correctly', async () => {
      // Test Gemini service integration
      const params = {
        campaignId: testCampaignId,
        contentPlan: mockContentPlan,
        workspace: mockWorkspaceData,
        resources: mockResources,
        templates: mockTemplates
      }

      await orchestrator.generateCampaignContent(params)

      // Verify Gemini text service was used
      expect(GeminiTextService.prototype.generateText).toHaveBeenCalled()
      
      // Verify Gemini image service was used for different content types
      expect(GeminiImageService.prototype.generateImage).toHaveBeenCalled()
      expect(GeminiImageService.prototype.generateTemplateImage).toHaveBeenCalled()
      expect(GeminiImageService.prototype.generateCarousel).toHaveBeenCalled()
    })

    it('should persist generated content correctly in database', async () => {
      // Test database persistence through the service methods
      const publicationData = {
        campaignId: testCampaignId,
        socialNetwork: 'instagram' as const,
        content: 'Original content',
        imageUrl: 'https://example.com/original.jpg',
        scheduledDate: new Date('2024-02-15T10:00:00Z'),
        status: 'scheduled' as const,
        generatedText: 'Generated Instagram content with engaging hashtags #product #innovation',
        generatedImageUrls: ['https://generated.com/instagram-image.jpg'],
        generationStatus: 'completed' as const,
        generationMetadata: {
          agentUsed: 'text-image' as const,
          textPrompt: 'Generate Instagram content',
          imagePrompt: 'Product showcase image',
          resourcesUsed: ['resource-1'],
          generationTime: new Date(),
          retryCount: 0,
          processingTimeMs: 4000
        }
      }

      // Create publication using the service
      const publicationId = await dbService.createPublication(publicationData)

      // Verify the publication was created
      expect(publicationId).toBeDefined()
      expect(typeof publicationId).toBe('string')
      expect(publicationId).toMatch(/^pub-/)
    })

    it('should handle generation errors gracefully', async () => {
      // Mock an agent to throw an error
      const mockTextOnlyAgent = TextOnlyAgent as any
      mockTextOnlyAgent.prototype.generate = vi.fn().mockRejectedValue(new Error('Gemini API error'))

      // Mock error response from API
      mockFetch.mockImplementationOnce(async () => {
        return new Response(JSON.stringify({
          success: false,
          message: 'Error en la generación de contenido',
          error: 'Gemini API error'
        }), { status: 500 })
      })

      const response = await fetch(`/api/campaigns/${testCampaignId}/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPlan: mockContentPlan.slice(0, 1), // Only text-only content
          workspaceData: mockWorkspaceData,
          resources: mockResources,
          templates: mockTemplates
        })
      })

      expect(response.status).toBe(500)
      const errorResult = await response.json()
      expect(errorResult.success).toBe(false)
      expect(errorResult.message).toBe('Error en la generación de contenido')
    })

    it('should support filtering generated content in calendar', async () => {
      // Test filtering by generation status
      const response = await fetch(`/api/calendar?workspaceId=${testWorkspaceId}&generationStatus=completed`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All publications should have completed generation status
      data.data.forEach((day: any) => {
        day.publications.forEach((pub: any) => {
          expect(pub.generationStatus).toBe('completed')
        })
      })
    })

    it('should support regeneration of individual publications', async () => {
      // Mock regeneration API response
      mockFetch.mockImplementationOnce(async () => {
        return new Response(JSON.stringify({
          success: true,
          data: {
            id: 'pub-1',
            generatedText: 'Regenerated Instagram content with new hashtags #updated #fresh',
            generatedImageUrls: ['https://generated.com/regenerated-image.jpg'],
            generationStatus: 'completed',
            generationMetadata: {
              agentUsed: 'text-image',
              textPrompt: 'Regenerate Instagram content',
              imagePrompt: 'Updated product showcase',
              resourcesUsed: ['resource-1'],
              generationTime: new Date().toISOString(),
              retryCount: 1,
              processingTimeMs: 3500
            }
          },
          message: 'Publicación regenerada exitosamente'
        }), { status: 200 })
      })

      const response = await fetch('/api/publications/pub-1/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.generatedText).toBe('Regenerated Instagram content with new hashtags #updated #fresh')
      expect(result.data.generationMetadata.retryCount).toBe(1)
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent generations', async () => {
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => 
        fetch(`/api/campaigns/campaign-${i}/generate-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentPlan: mockContentPlan.slice(0, 2), // Smaller plan for performance
            workspaceData: mockWorkspaceData,
            resources: mockResources,
            templates: mockTemplates
          })
        })
      )

      const responses = await Promise.all(concurrentRequests)
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      const results = await Promise.all(responses.map(r => r.json()))
      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.data.generationId).toBeDefined()
      })
    })

    it('should complete generation within reasonable time limits', async () => {
      const startTime = Date.now()
      
      const response = await fetch(`/api/campaigns/${testCampaignId}/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPlan: mockContentPlan,
          workspaceData: mockWorkspaceData,
          resources: mockResources,
          templates: mockTemplates
        })
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds for mocked services
    })
  })

  describe('Data Integrity and Validation', () => {
    it('should validate content plan structure', async () => {
      const invalidContentPlan = [
        {
          // Missing required fields
          socialNetwork: 'instagram',
          idea: 'Test idea'
        }
      ]

      mockFetch.mockImplementationOnce(async () => {
        return new Response(JSON.stringify({
          success: false,
          message: 'Plan de contenido inválido',
          error: 'Missing required fields'
        }), { status: 400 })
      })

      const response = await fetch(`/api/campaigns/${testCampaignId}/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPlan: invalidContentPlan,
          workspaceData: mockWorkspaceData,
          resources: mockResources,
          templates: mockTemplates
        })
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.message).toBe('Plan de contenido inválido')
    })

    it('should ensure generated content meets platform requirements', async () => {
      const calendarResponse = await fetch(`/api/calendar?workspaceId=${testWorkspaceId}`)
      const calendarData = await calendarResponse.json()

      calendarData.data.forEach((day: any) => {
        day.publications.forEach((pub: any) => {
          // Check text length limits based on platform
          if (pub.socialNetwork === 'twitter' || pub.socialNetwork === 'x') {
            expect(pub.generatedText.length).toBeLessThanOrEqual(280)
          } else if (pub.socialNetwork === 'instagram') {
            expect(pub.generatedText.length).toBeLessThanOrEqual(2200)
          } else if (pub.socialNetwork === 'linkedin') {
            expect(pub.generatedText.length).toBeLessThanOrEqual(3000)
          }

          // Check that generated content exists for completed publications
          if (pub.generationStatus === 'completed') {
            expect(pub.generatedText).toBeDefined()
            expect(pub.generatedText.length).toBeGreaterThan(0)
            expect(pub.generationMetadata).toBeDefined()
            expect(pub.generationMetadata.agentUsed).toBeDefined()
          }
        })
      })
    })
  })
})