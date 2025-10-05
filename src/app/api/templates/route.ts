import { NextRequest, NextResponse } from 'next/server'
import { TemplateStorage } from './storage'

/**
 * GET /api/templates
 * Get templates for a workspace
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Templates API called')
    
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    console.log('Template filters:', { workspaceId, type, search })

    // Get templates from storage
    let filteredTemplates = workspaceId 
      ? TemplateStorage.getByWorkspace(workspaceId)
      : TemplateStorage.getAll()

    // Filter by type if specified
    if (type && type !== 'all') {
      filteredTemplates = filteredTemplates.filter(t => t.type === type)
    }

    // Filter by search term if specified
    if (search) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Plantillas obtenidas exitosamente',
      data: filteredTemplates,
    })
  } catch (error) {
    console.error('Templates API error:', error)
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
 * POST /api/templates
 * Create a new template
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Create template API called')
    
    const body = await req.json()
    
    if (!body.workspaceId || !body.name) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId y name son requeridos',
        },
        { status: 400 }
      )
    }
    
    // Create new template
    const newTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: body.workspaceId,
      name: body.name,
      type: body.type || 'single',
      images: body.images || [],
      socialNetworks: body.socialNetworks || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Store the template
    TemplateStorage.add(newTemplate)

    return NextResponse.json({
      success: true,
      message: 'Plantilla creada exitosamente',
      data: newTemplate,
    }, { status: 201 })
  } catch (error) {
    console.error('Create template API error:', error)
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