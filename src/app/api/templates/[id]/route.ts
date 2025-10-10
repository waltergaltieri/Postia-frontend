import { NextRequest, NextResponse } from 'next/server'
import { TemplateRepository } from '@/lib/database/repositories/TemplateRepository'

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
    const templateRepo = new TemplateRepository()
    const template = templateRepo.findById(templateId)

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
 * PATCH /api/templates/[id]
 * Update a template
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id
    const body = await req.json()
    
    const templateRepo = new TemplateRepository()
    
    // Check if template exists
    if (!templateRepo.exists(templateId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Plantilla no encontrada',
        },
        { status: 404 }
      )
    }
    
    // Check name availability if name is being updated
    if (body.name) {
      const template = templateRepo.findById(templateId)
      if (template && !templateRepo.isNameAvailable(template.workspaceId, body.name, templateId)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Ya existe una plantilla con ese nombre en este workspace',
          },
          { status: 400 }
        )
      }
    }

    const updatedTemplate = templateRepo.update(templateId, body)

    if (!updatedTemplate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Error al actualizar la plantilla',
        },
        { status: 500 }
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
    
    const templateRepo = new TemplateRepository()
    
    // Check if template exists
    if (!templateRepo.exists(templateId)) {
      console.log('Template not found for deletion:', templateId)
      return NextResponse.json(
        {
          success: false,
          message: 'Plantilla no encontrada',
        },
        { status: 404 }
      )
    }
    
    // Check if template is in use
    if (templateRepo.isTemplateInUse(templateId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'No se puede eliminar una plantilla que está siendo utilizada en campañas o publicaciones',
        },
        { status: 400 }
      )
    }
    
    const deleted = templateRepo.delete(templateId)
    console.log('Delete result:', deleted)

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: 'Error al eliminar la plantilla',
        },
        { status: 500 }
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
        message: error instanceof Error ? error.message : 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}