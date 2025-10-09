import { NextRequest, NextResponse } from 'next/server'
import { ResourceStorage } from '../storage'

/**
 * GET /api/resources/debug
 * Debug endpoint to see all resources
 */
export async function GET(req: NextRequest) {
  try {
    const allResources = ResourceStorage.getAll()
    
    return NextResponse.json({
      success: true,
      message: 'Debug info retrieved',
      data: {
        totalResources: allResources.length,
        resources: allResources,
      },
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/resources/debug
 * Clear all resources for testing
 */
export async function DELETE(req: NextRequest) {
  try {
    ResourceStorage.clear()
    
    return NextResponse.json({
      success: true,
      message: 'All resources cleared',
    })
  } catch (error) {
    console.error('Debug clear API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}