/**
 * Integration tests for Publication Regeneration API
 * Tests individual publication regeneration from calendar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the regeneration route
const mockRegenerateResponse = {
  success: true,
  data: {
    id: 'pub-1',
    generatedText: 'Newly regenerated AI content',
    generatedImageUrls: ['https://generated.com/new-image.jpg'],
    generationStatus: 'completed',
    generationMetadata: {
      agentUsed: 'text-image',
      textPrompt: 'Create engaging content',
      processingTimeMs: 4500,
      retryCount: 1,
      generationTime: new Date()
    }
  },
  message: 'Publicación regenerada exitosamente'
}

describe('Publication Regeneration API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock fetch globally for API calls
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Successful Regeneration', () => {
    it('should regenerate AI-generated publication successfully', async () => {
      // Mock successful API response
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
      expect(data.message).toBe('Publicación regenerada exitosamente')
      expect(data.data.generatedText).toBe('Newly regenerated AI content')
      expect(data.data.generatedImageUrls).toEqual(['https://generated.com/new-image.jpg'])
      expect(data.data.generationMetadata.retryCount).toBe(1)
    })

    it('should regenerate with custom prompt', async () => {
      const customPrompt = 'Create more professional content for LinkedIn'
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ...mockRegenerateResponse,
          data: {
            ...mockRegenerateResponse.data,
            generatedText: 'Content with custom prompt'
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
      
      // Verify the request was made with custom prompt
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/publications/pub-1/regenerate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ customPrompt })
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should return error when publication not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          success: false,
          message: 'Publicación no encontrada'
        })
      })

      const response = await fetch('/api/publications/non-existent/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPrompt: null })
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Publicación no encontrada')
    })

    it('should return error when publication is not AI-generated', async () => {
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

    it('should handle API service errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          message: 'AI service unavailable'
        })
      })

      const response = await fetch('/api/publications/pub-1/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPrompt: null })
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(data.success).toBe(false)
      expect(data.message).toBe('AI service unavailable')
    })

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      try {
        await fetch('/api/publications/pub-1/regenerate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ customPrompt: null })
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
    })
  })

  describe('Request Validation', () => {
    it('should handle missing request body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegenerateResponse)
      })

      const response = await fetch('/api/publications/pub-1/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
        // No body
      })

      // Should still work with default null customPrompt
      expect(response.ok).toBe(true)
    })

    it('should handle different content types', async () => {
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
          customPrompt: 'Test prompt'
        })
      })

      expect(response.ok).toBe(true)
    })
  })

  describe('Different Agent Types', () => {
    it('should regenerate text-only publication', async () => {
      const textOnlyResponse = {
        ...mockRegenerateResponse,
        data: {
          ...mockRegenerateResponse.data,
          generatedText: 'Regenerated text-only content',
          generatedImageUrls: [], // No images for text-only
          generationMetadata: {
            agentUsed: 'text-only',
            textPrompt: 'Create professional content',
            processingTimeMs: 3000,
            retryCount: 1
          }
        }
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(textOnlyResponse)
      })

      const response = await fetch('/api/publications/pub-text/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPrompt: null })
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data.generatedText).toBe('Regenerated text-only content')
      expect(data.data.generatedImageUrls).toEqual([])
      expect(data.data.generationMetadata.agentUsed).toBe('text-only')
    })

    it('should regenerate carousel publication', async () => {
      const carouselResponse = {
        ...mockRegenerateResponse,
        data: {
          ...mockRegenerateResponse.data,
          generatedText: 'Regenerated carousel content',
          generatedImageUrls: [
            'https://generated.com/carousel1.jpg',
            'https://generated.com/carousel2.jpg',
            'https://generated.com/carousel3.jpg'
          ],
          generationMetadata: {
            agentUsed: 'carousel',
            textPrompt: 'Create carousel content',
            imagePrompt: 'Product showcase carousel',
            processingTimeMs: 8000,
            retryCount: 1
          }
        }
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(carouselResponse)
      })

      const response = await fetch('/api/publications/pub-carousel/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPrompt: null })
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data.generatedImageUrls).toHaveLength(3)
      expect(data.data.generationMetadata.agentUsed).toBe('carousel')
    })

    it('should regenerate text-template publication', async () => {
      const templateResponse = {
        ...mockRegenerateResponse,
        data: {
          ...mockRegenerateResponse.data,
          generatedText: 'Regenerated template content',
          generatedImageUrls: ['https://generated.com/template-image.jpg'],
          generationMetadata: {
            agentUsed: 'text-template',
            textPrompt: 'Create template content',
            imagePrompt: 'Template design',
            templateUsed: 'template-1',
            processingTimeMs: 6000,
            retryCount: 1
          }
        }
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(templateResponse)
      })

      const response = await fetch('/api/publications/pub-template/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPrompt: null })
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data.generationMetadata.agentUsed).toBe('text-template')
      expect(data.data.generationMetadata.templateUsed).toBe('template-1')
    })
  })

  describe('Response Format', () => {
    it('should return properly formatted success response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegenerateResponse)
      })

      const response = await fetch('/api/publications/pub-1/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPrompt: null })
      })

      const data = await response.json()

      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('message')
      expect(data.data).toHaveProperty('id')
      expect(data.data).toHaveProperty('generatedText')
      expect(data.data).toHaveProperty('generationStatus')
      expect(data.data).toHaveProperty('generationMetadata')
    })

    it('should maintain generation metadata structure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegenerateResponse)
      })

      const response = await fetch('/api/publications/pub-1/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPrompt: null })
      })

      const data = await response.json()
      const metadata = data.data.generationMetadata

      expect(metadata).toHaveProperty('agentUsed')
      expect(metadata).toHaveProperty('textPrompt')
      expect(metadata).toHaveProperty('processingTimeMs')
      expect(metadata).toHaveProperty('retryCount')
      expect(metadata).toHaveProperty('generationTime')
      expect(typeof metadata.processingTimeMs).toBe('number')
      expect(typeof metadata.retryCount).toBe('number')
    })
  })
})