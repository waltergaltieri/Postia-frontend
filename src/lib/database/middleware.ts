import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from './connection'

/**
 * Database connection middleware for Next.js API routes
 * Ensures database is initialized before handling requests
 */
export function withDatabase<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T) => {
    try {
      // Initialize database connection (synchronous)
      initializeDatabase()

      // Call the original handler
      return await handler(...args)
    } catch (error) {
      console.error('Database middleware error:', error)
      return NextResponse.json(
        {
          error: 'Error de conexión a la base de datos',
          success: false,
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Global database initialization for the application
 * Should be called once when the app starts
 */
export function initializeDatabaseForApp(): void {
  try {
    initializeDatabase()
    console.log('✅ Database initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    throw error
  }
}
