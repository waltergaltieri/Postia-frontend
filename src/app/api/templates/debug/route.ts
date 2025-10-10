import { NextRequest, NextResponse } from 'next/server'
import { TemplateRepository } from '@/lib/database/repositories/TemplateRepository'

/**
 * GET /api/templates/debug
 * Debug endpoint to see all templates
 */
export async function GET(req: NextRequest) {
  try {
    const templateRepo = new TemplateRepository()
    const allTemplates = templateRepo.findAll()
    
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
    const templateRepo = new TemplateRepository()
    
    // Get all templates and delete them
    const allTemplates = templateRepo.findAll()
    let deletedCount = 0
    
    for (const template of allTemplates) {
      try {
        templateRepo.delete(template.id)
        deletedCount++
      } catch (error) {
        console.error(`Failed to delete template ${template.id}:`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${deletedCount} templates cleared`,
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