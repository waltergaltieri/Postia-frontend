import { NextRequest, NextResponse } from 'next/server'
import { ResourceRepository } from '@/lib/database/repositories/ResourceRepository'

/**
 * GET /api/resources/[id]
 * Get a specific resource by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resourceId = params.id
    const resourceRepo = new ResourceRepository()
    const resource = resourceRepo.findById(resourceId)
    
    if (!resource) {
      return NextResponse.json(
        {
          success: false,
          message: 'Recurso no encontrado',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Recurso obtenido exitosamente',
      data: resource,
    })
  } catch (error) {
    console.error('Get resource API error:', error)
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
 * PATCH /api/resources/[id]
 * Update a resource by ID
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resourceId = params.id
    const body = await req.json()
    const { name } = body

    console.log('PATCH resource - ID:', resourceId)
    console.log('PATCH resource - new name:', name)

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: 'El nombre es requerido',
        },
        { status: 400 }
      )
    }

    const resourceRepo = new ResourceRepository()
    
    // Check if resource exists
    if (!resourceRepo.exists(resourceId)) {
      console.log('Resource not found with ID:', resourceId)
      return NextResponse.json(
        {
          success: false,
          message: 'Recurso no encontrado',
        },
        { status: 404 }
      )
    }

    console.log('Updating resource:', resourceId, 'with name:', name)
    const updatedResource = resourceRepo.update(resourceId, { name })
    console.log('Update result:', updatedResource)

    if (!updatedResource) {
      return NextResponse.json(
        {
          success: false,
          message: 'Error al actualizar el recurso',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Recurso actualizado exitosamente',
      data: updatedResource,
    })
  } catch (error) {
    console.error('Update resource API error:', error)
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
 * DELETE /api/resources/[id]
 * Delete a resource by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resourceId = params.id
    const resourceRepo = new ResourceRepository()

    // Check if resource exists
    const resource = resourceRepo.findById(resourceId)
    if (!resource) {
      return NextResponse.json(
        {
          success: false,
          message: 'Recurso no encontrado',
        },
        { status: 404 }
      )
    }

    // Check if resource is in use
    if (resourceRepo.isResourceInUse(resourceId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'No se puede eliminar un recurso que está siendo utilizado en campañas o publicaciones',
        },
        { status: 400 }
      )
    }

    // Delete physical file
    try {
      const fs = require('fs')
      const path = require('path')
      const fullPath = path.join(process.cwd(), 'public', resource.filePath)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
      }
    } catch (error) {
      console.error('Error deleting physical file:', error)
      // Continue with database deletion even if file deletion fails
    }

    const deleted = resourceRepo.delete(resourceId)

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: 'Error al eliminar el recurso',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Recurso eliminado exitosamente',
    })
  } catch (error) {
    console.error('Delete resource API error:', error)
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