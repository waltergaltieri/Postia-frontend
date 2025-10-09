import { NextRequest, NextResponse } from 'next/server'
import { TemplateStorage } from '../storage'

/**
 * GET /api/templates/debug
 * Debug endpoint to see all templates
 */
export async function GET(req: NextRequest) {
  try {
    const allTemplates = TemplateStorage.getAll()
    
    return NextResponse.json({
      success: true,
      message: 'Debug info retrieved',
      data: {
        totalTemplates: allTemplates.length,
        templates: allTemplates,
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
 * DELETE /api/templates/debug
 * Clear all templates for testing
 */
export async function DELETE(req: NextRequest) {
  try {
    TemplateStorage.clear()
    
    return NextResponse.json({
      success: true,
      message: 'All templates cleared',
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