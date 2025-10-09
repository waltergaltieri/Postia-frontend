import { NextRequest, NextResponse } from 'next/server'
import { TemplateStorage } from '../storage'

/**
 * GET /api/templates/[id]
 * Get a specific template by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id
    const template = TemplateStorage.getById(templateId)

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          message: 'Plantilla no encontrada',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Plantilla obtenida exitosamente',
      data: template,
    })
  } catch (error) {
    console.error('Get template API error:', error)
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
 * PUT /api/templates/[id]
 * Update a template
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id
    const body = await req.json()

    const updatedTemplate = TemplateStorage.update(templateId, body)

    if (!updatedTemplate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Plantilla no encontrada',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Plantilla actualizada exitosamente',
      data: updatedTemplate,
    })
  } catch (error) {
    console.error('Update template API error:', error)
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
 * DELETE /api/templates/[id]
 * Delete a template
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id
    console.log('Attempting to delete template:', templateId)
    
    const deleted = TemplateStorage.delete(templateId)
    console.log('Delete result:', deleted)

    if (!deleted) {
      console.log('Template not found for deletion:', templateId)
      return NextResponse.json(
        {
          success: false,
          message: 'Plantilla no encontrada',
        },
        { status: 404 }
      )
    }

    console.log('Template deleted successfully:', templateId)
    return NextResponse.json({
      success: true,
      message: 'Plantilla eliminada exitosamente',
    })
  } catch (error) {
    console.error('Delete template API error:', error)
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