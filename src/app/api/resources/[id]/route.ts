import { NextRequest, NextResponse } from 'next/server'
import { ResourceStorage } from '../storage'

/**
 * GET /api/resources/[id]
 * Get a specific resource by ID or filename
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id

    // Try to find by ID first, then by filename
    let resource = ResourceStorage.getById(identifier)
    if (!resource) {
      resource = ResourceStorage.getByFilename(identifier)
    }
    
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
 * Update a resource by ID or filename
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id
    const body = await req.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: 'El nombre es requerido',
        },
        { status: 400 }
      )
    }

    // Try to find by ID first, then by filename
    let resource = ResourceStorage.getById(identifier)
    if (!resource) {
      resource = ResourceStorage.getByFilename(identifier)
    }

    if (!resource) {
      return NextResponse.json(
        {
          success: false,
          message: 'Recurso no encontrado',
        },
        { status: 404 }
      )
    }

    const updatedResource = ResourceStorage.update(resource.id, { name })

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
 * Delete a resource by ID or filename
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id

    // Try to find by ID first, then by filename
    let resource = ResourceStorage.getById(identifier)
    if (!resource) {
      resource = ResourceStorage.getByFilename(identifier)
    }

    if (!resource) {
      return NextResponse.json(
        {
          success: false,
          message: 'Recurso no encontrado',
        },
        { status: 404 }
      )
    }

    const deleted = ResourceStorage.delete(resource.id)

    return NextResponse.json({
      success: true,
      message: 'Recurso eliminado exitosamente',
    })
  } catch (error) {
    console.error('Delete resource API error:', error)
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