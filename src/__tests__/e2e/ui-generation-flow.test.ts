/**
 * End-to-End UI Tests for AI Content Generation Flow
 * 
 * Tests the complete user interface flow from step 4 confirmation
 * to calendar visualization of generated content.
 * 
 * Requirements covered:
 * - 1.1: UI flow from step 4 to calendar
 * - 2.1: Calendar visualization of generated content
 * - 7.1, 7.2, 7.3: Loading screen and progress indicators
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import CampaignCreationForm from '@/components/campaigns/CampaignCreationForm'
import ContentGenerationLoadingScreen from '@/components/campaigns/ContentGenerationLoadingScreen'
import CalendarPage from '@/app/workspace/[id]/calendar/page'

// Mock Next.js router
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  }),
  useParams: () => ({ id: 'test-workspace-id' }),
  useSearchParams: () => new URLSearchParams()
}))

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Redux store
const createMockStore = () => configureStore({
  reducer: {
    campaigns: (state = { current: null, loading: false }, action) => state,
    workspace: (state = { current: { id: 'test-workspace-id', name: 'Test Workspace' } }, action) => state
  }
})

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const store = createMockStore()
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  )
}

describe('UI Generation Flow End-to-End Tests', () => {
  const user = userEvent.setup()
  
  const mockContentPlan = [
    {
      id: 'plan-1',
      socialNetwork: 'instagram',
      contentType: 'text-image',
      idea: 'Showcase new product features',
      scheduledDate: new Date('2024-02-15T10:00:00Z'),
      resourceIds: ['resource-1'],
      templateId: 'template-1'
    },
    {
      id: 'plan-2',
      socialNetwork: 'linkedin',
      contentType: 'text-only',
      idea: 'Professional insights',
      scheduledDate: new Date('2024-02-15T14:00:00Z'),
      resourceIds: [],
      templateId: undefined
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    setupMockResponses()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function setupMockResponses() {
    mockFetch.mockImplementation(async (url: string, options: any) => {
      const urlStr = url.toString()
      
      // Mock campaign creation/update
      if (urlStr.includes('/api/campaigns') && options?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: {
            id: 'campaign-123',
            name: 'Test Campaign',
            status: 'planning'
          },
          message: 'Campaña creada exitosamente'
        }), { status: 200 })
      }
      
      // Mock content generation trigger
      if (urlStr.includes('/generate-content') && options?.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          data: { generationId: 'gen-123' },
          message: 'Generación iniciada exitosamente'
        }), { status: 200 })
      }
      
      // Mock generation progress
      if (urlStr.includes('/generation-progress')) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            id: 'gen-123',
            campaignId: 'campaign-123',
            totalPublications: 2,
            completedPublications: 2,
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
      
      // Mock calendar data
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
                  campaignId: 'campaign-123',
                  campaignName: 'Test Campaign',
                  workspaceName: 'Test Workspace',
                  socialNetwork: 'instagram',
                  content: 'Original content',
                  imageUrl: 'https://example.com/original.jpg',
                  scheduledDate: '2024-02-15T10:00:00Z',
                  status: 'scheduled',
                  generatedText: 'Generated Instagram content with hashtags #product #innovation',
                  generatedImageUrls: ['https://generated.com/instagram.jpg'],
                  generationStatus: 'completed',
                  generationMetadata: {
                    agentUsed: 'text-image',
                    textPrompt: 'Generate Instagram content',
                    imagePrompt: 'Product showcase',
                    resourcesUsed: ['resource-1'],
                    generationTime: new Date().toISOString(),
                    retryCount: 0,
                    processingTimeMs: 4000
                  },
                  campaignGenerationStatus: 'completed'
                },
                {
                  id: 'pub-2',
                  campaignId: 'campaign-123',
                  campaignName: 'Test Campaign',
                  workspaceName: 'Test Workspace',
                  socialNetwork: 'linkedin',
                  content: 'Original LinkedIn content',
                  imageUrl: null,
                  scheduledDate: '2024-02-15T14:00:00Z',
                  status: 'scheduled',
                  generatedText: 'Professional LinkedIn post about industry insights',
                  generatedImageUrls: [],
                  generationStatus: 'completed',
                  generationMetadata: {
                    agentUsed: 'text-only',
                    textPrompt: 'Generate LinkedIn content',
                    resourcesUsed: [],
                    generationTime: new Date().toISOString(),
                    retryCount: 0,
                    processingTimeMs: 2000
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

  describe('Step 4 to Generation Flow', () => {
    it('should transition from step 4 to loading screen when confirming content plan', async () => {
      const { rerender } = render(
        <TestWrapper>
          <CampaignCreationForm />
        </TestWrapper>
      )

      // Simulate being on step 4 with content plan ready
      const confirmButton = screen.getByRole('button', { name: /confirmar y generar contenido/i })
      expect(confirmButton).toBeInTheDocument()

      // Click confirm button
      await user.click(confirmButton)

      // Should show loading screen
      await waitFor(() => {
        expect(screen.getByText(/generando contenido/i)).toBeInTheDocument()
      })

      // Should show progress indicators
      expect(screen.getByText(/progreso general/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should display detailed progress during generation', async () => {
      render(
        <TestWrapper>
          <ContentGenerationLoadingScreen 
            campaignId="campaign-123"
            contentPlan={mockContentPlan}
            onComplete={() => {}}
            onError={() => {}}
          />
        </TestWrapper>
      )

      // Should show campaign info
      expect(screen.getByText(/generando contenido para la campaña/i)).toBeInTheDocument()

      // Should show publication count
      expect(screen.getByText(/2 publicaciones/i)).toBeInTheDocument()

      // Should show progress bar
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()

      // Wait for progress updates
      await waitFor(() => {
        expect(screen.getByText(/completado/i)).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should show agent-specific progress information', async () => {
      // Mock in-progress generation
      mockFetch.mockImplementationOnce(async (url: string) => {
        if (url.includes('/generation-progress')) {
          return new Response(JSON.stringify({
            success: true,
            data: {
              id: 'gen-123',
              campaignId: 'campaign-123',
              totalPublications: 2,
              completedPublications: 1,
              currentPublicationId: 'pub-2',
              currentAgent: 'text-only',
              currentStep: 'Generando texto para LinkedIn',
              errors: [],
              startedAt: new Date().toISOString(),
              completedAt: null,
              estimatedTimeRemaining: 30000
            },
            message: 'Progreso obtenido exitosamente'
          }), { status: 200 })
        }
        return new Response('{}', { status: 200 })
      })

      render(
        <TestWrapper>
          <ContentGenerationLoadingScreen 
            campaignId="campaign-123"
            contentPlan={mockContentPlan}
            onComplete={() => {}}
            onError={() => {}}
          />
        </TestWrapper>
      )

      // Should show current agent working
      await waitFor(() => {
        expect(screen.getByText(/text-only/i)).toBeInTheDocument()
        expect(screen.getByText(/generando texto para linkedin/i)).toBeInTheDocument()
      })

      // Should show estimated time remaining
      expect(screen.getByText(/tiempo estimado/i)).toBeInTheDocument()
    })

    it('should handle generation errors gracefully', async () => {
      // Mock error response
      mockFetch.mockImplementationOnce(async (url: string) => {
        if (url.includes('/generate-content')) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Error en la generación de contenido',
            error: 'Gemini API error'
          }), { status: 500 })
        }
        return new Response('{}', { status: 200 })
      })

      const onError = vi.fn()

      render(
        <TestWrapper>
          <ContentGenerationLoadingScreen 
            campaignId="campaign-123"
            contentPlan={mockContentPlan}
            onComplete={() => {}}
            onError={onError}
          />
        </TestWrapper>
      )

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error en la generación/i)).toBeInTheDocument()
      })

      // Should call error handler
      expect(onError).toHaveBeenCalled()

      // Should show retry option
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
    })

    it('should allow cancellation of generation process', async () => {
      render(
        <TestWrapper>
          <ContentGenerationLoadingScreen 
            campaignId="campaign-123"
            contentPlan={mockContentPlan}
            onComplete={() => {}}
            onError={() => {}}
          />
        </TestWrapper>
      )

      // Should show cancel button
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      expect(cancelButton).toBeInTheDocument()

      // Click cancel
      await user.click(cancelButton)

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/¿estás seguro que deseas cancelar/i)).toBeInTheDocument()
      })

      // Confirm cancellation
      const confirmCancel = screen.getByRole('button', { name: /sí, cancelar/i })
      await user.click(confirmCancel)

      // Should call cancel API
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cancel-generation'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('Calendar Visualization', () => {
    it('should redirect to calendar after successful generation', async () => {
      const onComplete = vi.fn()

      render(
        <TestWrapper>
          <ContentGenerationLoadingScreen 
            campaignId="campaign-123"
            contentPlan={mockContentPlan}
            onComplete={onComplete}
            onError={() => {}}
          />
        </TestWrapper>
      )

      // Wait for completion
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled()
      }, { timeout: 5000 })

      // Should redirect to calendar
      expect(mockPush).toHaveBeenCalledWith('/workspace/test-workspace-id/calendar')
    })

    it('should display generated content in calendar view', async () => {
      render(
        <TestWrapper>
          <CalendarPage params={{ id: 'test-workspace-id' }} />
        </TestWrapper>
      )

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText(/calendario/i)).toBeInTheDocument()
      })

      // Should show publications with generated content
      await waitFor(() => {
        expect(screen.getByText(/generated instagram content/i)).toBeInTheDocument()
        expect(screen.getByText(/professional linkedin post/i)).toBeInTheDocument()
      })

      // Should show generation status indicators
      expect(screen.getAllByText(/completado/i)).toHaveLength(2)
    })

    it('should show AI generation metadata in publication details', async () => {
      render(
        <TestWrapper>
          <CalendarPage params={{ id: 'test-workspace-id' }} />
        </TestWrapper>
      )

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText(/calendario/i)).toBeInTheDocument()
      })

      // Click on a publication to view details
      const instagramPost = screen.getByText(/generated instagram content/i)
      await user.click(instagramPost)

      // Should show generation metadata
      await waitFor(() => {
        expect(screen.getByText(/agente utilizado/i)).toBeInTheDocument()
        expect(screen.getByText(/text-image/i)).toBeInTheDocument()
        expect(screen.getByText(/tiempo de procesamiento/i)).toBeInTheDocument()
        expect(screen.getByText(/4000ms/i)).toBeInTheDocument()
      })

      // Should show generated vs original content
      expect(screen.getByText(/contenido generado/i)).toBeInTheDocument()
      expect(screen.getByText(/contenido original/i)).toBeInTheDocument()
    })

    it('should support filtering by generation status', async () => {
      render(
        <TestWrapper>
          <CalendarPage params={{ id: 'test-workspace-id' }} />
        </TestWrapper>
      )

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText(/calendario/i)).toBeInTheDocument()
      })

      // Find and use generation status filter
      const filterButton = screen.getByRole('button', { name: /filtros/i })
      await user.click(filterButton)

      const generationFilter = screen.getByLabelText(/estado de generación/i)
      await user.selectOptions(generationFilter, 'completed')

      // Apply filter
      const applyButton = screen.getByRole('button', { name: /aplicar filtros/i })
      await user.click(applyButton)

      // Should only show completed generations
      await waitFor(() => {
        const completedPosts = screen.getAllByText(/completado/i)
        expect(completedPosts.length).toBeGreaterThan(0)
      })
    })

    it('should support regeneration of individual publications', async () => {
      render(
        <TestWrapper>
          <CalendarPage params={{ id: 'test-workspace-id' }} />
        </TestWrapper>
      )

      // Wait for calendar to load
      await waitFor(() => {
        expect(screen.getByText(/calendario/i)).toBeInTheDocument()
      })

      // Click on a publication
      const instagramPost = screen.getByText(/generated instagram content/i)
      await user.click(instagramPost)

      // Should show regenerate option
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /regenerar/i })).toBeInTheDocument()
      })

      // Click regenerate
      const regenerateButton = screen.getByRole('button', { name: /regenerar/i })
      await user.click(regenerateButton)

      // Should show regeneration confirmation
      await waitFor(() => {
        expect(screen.getByText(/¿deseas regenerar este contenido/i)).toBeInTheDocument()
      })

      // Confirm regeneration
      const confirmRegenerate = screen.getByRole('button', { name: /sí, regenerar/i })
      await user.click(confirmRegenerate)

      // Should call regeneration API
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/publications/pub-1/regenerate'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors during generation', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const onError = vi.fn()

      render(
        <TestWrapper>
          <ContentGenerationLoadingScreen 
            campaignId="campaign-123"
            contentPlan={mockContentPlan}
            onComplete={() => {}}
            onError={onError}
          />
        </TestWrapper>
      )

      // Should show network error
      await waitFor(() => {
        expect(screen.getByText(/error de conexión/i)).toBeInTheDocument()
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle empty content plan gracefully', async () => {
      render(
        <TestWrapper>
          <ContentGenerationLoadingScreen 
            campaignId="campaign-123"
            contentPlan={[]}
            onComplete={() => {}}
            onError={() => {}}
          />
        </TestWrapper>
      )

      // Should show appropriate message for empty plan
      await waitFor(() => {
        expect(screen.getByText(/no hay publicaciones para generar/i)).toBeInTheDocument()
      })
    })

    it('should handle partial generation failures', async () => {
      // Mock partial failure response
      mockFetch.mockImplementationOnce(async (url: string) => {
        if (url.includes('/generation-progress')) {
          return new Response(JSON.stringify({
            success: true,
            data: {
              id: 'gen-123',
              campaignId: 'campaign-123',
              totalPublications: 2,
              completedPublications: 1,
              currentPublicationId: null,
              currentAgent: null,
              currentStep: null,
              errors: [
                {
                  publicationId: 'pub-2',
                  agentType: 'text-only',
                  errorMessage: 'API rate limit exceeded',
                  timestamp: new Date().toISOString(),
                  retryCount: 3
                }
              ],
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              estimatedTimeRemaining: 0
            },
            message: 'Generación completada con errores'
          }), { status: 200 })
        }
        return new Response('{}', { status: 200 })
      })

      render(
        <TestWrapper>
          <ContentGenerationLoadingScreen 
            campaignId="campaign-123"
            contentPlan={mockContentPlan}
            onComplete={() => {}}
            onError={() => {}}
          />
        </TestWrapper>
      )

      // Should show partial completion status
      await waitFor(() => {
        expect(screen.getByText(/completado parcialmente/i)).toBeInTheDocument()
        expect(screen.getByText(/1 de 2 publicaciones generadas/i)).toBeInTheDocument()
      })

      // Should show error details
      expect(screen.getByText(/api rate limit exceeded/i)).toBeInTheDocument()
      expect(screen.getByText(/3 reintentos/i)).toBeInTheDocument()
    })

    it('should maintain UI responsiveness during long generations', async () => {
      // Mock slow progress updates
      let progressCallCount = 0
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/generation-progress')) {
          progressCallCount++
          const completed = Math.min(progressCallCount, 2)
          
          return new Response(JSON.stringify({
            success: true,
            data: {
              id: 'gen-123',
              campaignId: 'campaign-123',
              totalPublications: 2,
              completedPublications: completed,
              currentPublicationId: completed < 2 ? `pub-${completed + 1}` : null,
              currentAgent: completed < 2 ? 'text-image' : null,
              currentStep: completed < 2 ? 'Generando imagen' : null,
              errors: [],
              startedAt: new Date().toISOString(),
              completedAt: completed === 2 ? new Date().toISOString() : null,
              estimatedTimeRemaining: completed < 2 ? 15000 : 0
            },
            message: 'Progreso obtenido exitosamente'
          }), { status: 200 })
        }
        return new Response('{}', { status: 200 })
      })

      render(
        <TestWrapper>
          <ContentGenerationLoadingScreen 
            campaignId="campaign-123"
            contentPlan={mockContentPlan}
            onComplete={() => {}}
            onError={() => {}}
          />
        </TestWrapper>
      )

      // UI should remain responsive
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      expect(cancelButton).toBeEnabled()

      // Progress should update over time
      await waitFor(() => {
        expect(screen.getByText(/1 de 2/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      await waitFor(() => {
        expect(screen.getByText(/2 de 2/i)).toBeInTheDocument()
      }, { timeout: 6000 })
    })
  })
})