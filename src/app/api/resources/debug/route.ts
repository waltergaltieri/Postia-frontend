import { NextRequest, NextResponse } from 'next/server'
import { ResourceRepository } from '@/lib/database/repositories/ResourceRepository'

/**
 * GET /api/resources/debug
 * Debug endpoint to see all resources
 */
export async function GET(req: NextRequest) {
  try {
    const resourceRepo = new ResourceRepository()
    const allResources = resourceRepo.findAll()
    
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
    const resourceRepo = new ResourceRepository()
    
    // Get all resources and delete them
    const allResources = resourceRepo.findAll()
    let deletedCount = 0
    
    for (const resource of allResources) {
      try {
        resourceRepo.delete(resource.id)
        deletedCount++
      } catch (error) {
        console.error(`Failed to delete resource ${resource.id}:`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${deletedCount} resources cleared`,
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