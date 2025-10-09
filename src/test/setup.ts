import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Mock environment variables for tests
process.env.GEMINI_API_KEY = 'test-gemini-key'
process.env.NANO_BANANA_API_KEY = 'test-nano-banana-key'
process.env.DATABASE_PATH = ':memory:'
process.env.NODE_ENV = 'test'

// Mock fetch globally
global.fetch = vi.fn()

// Setup global test utilities
beforeEach(() => {
  vi.clearAllMocks()
})