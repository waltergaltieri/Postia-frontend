import { vi } from 'vitest'

/**
 * Mock implementation for faster image generation simulation
 */
export function createFastImageServiceMock() {
  return {
    simulateNanoBananaCall: vi.fn().mockImplementation(async (payload: any) => {
      // Much faster simulation for tests
      await new Promise(resolve => setTimeout(resolve, 10))
      
      return {
        imageUrl: `https://generated-images.nano-banana.com/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
        width: payload.dimensions?.width || 1080,
        height: payload.dimensions?.height || 1080,
        format: 'jpeg',
        sizeBytes: Math.floor(200000 + Math.random() * 300000),
        jobId: `nb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    })
  }
}

/**
 * Creates a complete mock brand manual for testing
 */
export function createMockBrandManual() {
  return {
    brandVoice: 'Professional and friendly',
    brandValues: ['Innovation', 'Quality', 'Trust'],
    targetAudience: 'Tech professionals',
    keyMessages: ['Leading technology', 'Customer first'],
    dosDonts: {
      dos: ['Use clear language', 'Be helpful'],
      donts: ['Avoid jargon', 'Don\'t be pushy']
    }
  }
}

/**
 * Creates a mock resource for testing
 */
export function createMockResource(overrides: any = {}) {
  return {
    id: 'resource-1',
    name: 'Test Image',
    type: 'image',
    url: 'https://example.com/test-image.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 500000,
    workspaceId: 'workspace-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

/**
 * Creates a mock template for testing
 */
export function createMockTemplate(overrides: any = {}) {
  return {
    id: 'template-1',
    name: 'Product Showcase',
    type: 'single',
    category: 'product',
    description: 'Modern product showcase template',
    previewUrl: 'https://example.com/template-preview.jpg',
    templateUrl: 'https://example.com/template.json',
    textAreas: [
      { id: 'title', name: 'Title', maxLength: 50 },
      { id: 'subtitle', name: 'Subtitle', maxLength: 100 }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

/**
 * Creates a mock Gemini API response
 */
export function createMockGeminiResponse(text: string) {
  return {
    candidates: [{
      content: {
        parts: [{ text }]
      }
    }]
  }
}

/**
 * Sets up fetch mock with success response
 */
export function setupSuccessfulFetchMock(mockFetch: any, responseText: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(createMockGeminiResponse(responseText))
  })
}

/**
 * Sets up fetch mock with error response
 */
export function setupErrorFetchMock(mockFetch: any, status: number, message: string) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve({
      error: { message }
    })
  })
}