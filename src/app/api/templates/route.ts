import { NextRequest, NextResponse } from 'next/server'
import { TemplateRepository } from '@/lib/database/repositories/TemplateRepository'

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

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId es requerido',
        },
        { status: 400 }
      )
    }

    const templateRepo = new TemplateRepository()
    let filteredTemplates

    // Get templates from database
    if (search) {
      filteredTemplates = templateRepo.searchByName(workspaceId, search)
    } else if (type && type !== 'all') {
      filteredTemplates = templateRepo.findByType(workspaceId, type as 'single' | 'carousel')
    } else {
      filteredTemplates = templateRepo.findByWorkspaceId(workspaceId)
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
    console.log('Template creation body:', JSON.stringify(body, null, 2))
    
    if (!body.workspaceId || !body.name) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId y name son requeridos',
        },
        { status: 400 }
      )
    }
    
    const templateRepo = new TemplateRepository()
    
    // Check if template name already exists in workspace
    if (!templateRepo.isNameAvailable(body.workspaceId, body.name)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ya existe una plantilla con ese nombre en este workspace',
        },
        { status: 400 }
      )
    }
    
    // Create template data
    const templateData = {
      workspaceId: body.workspaceId,
      name: body.name,
      type: body.type || 'single',
      images: body.images ? body.images.map((img: any) => img.dataUrl || img.name) : [],
      socialNetworks: body.socialNetworks || [],
    }

    // Store the template in database
    console.log('Storing template in database:', templateData)
    const newTemplate = templateRepo.create(templateData)
    console.log('Template stored successfully')

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