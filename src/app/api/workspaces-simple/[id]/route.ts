import { NextRequest, NextResponse } from 'next/server'
import { WorkspaceRepository } from '@/lib/database/repositories/WorkspaceRepository'
import '@/lib/database/auto-init' // Auto-initialize database

/**
 * PATCH /api/workspaces-simple/[id]
 * Update an existing workspace (temporary solution)
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('Update workspace Simple API called')
    
    const body = await req.json()
    const workspaceId = params.id
    
    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID del workspace es requerido',
        },
        { status: 400 }
      )
    }

    const workspaceRepo = new WorkspaceRepository()
    
    console.log(`Updating workspace: ${workspaceId}`)
    console.log('Update data:', body)
    
    const updatedWorkspace = workspaceRepo.update(workspaceId, body)
    
    if (!updatedWorkspace) {
      return NextResponse.json(
        {
          success: false,
          message: 'Workspace no encontrado',
        },
        { status: 404 }
      )
    }

    console.log('Updated workspace:', updatedWorkspace)

    return NextResponse.json({
      success: true,
      message: 'Espacio de trabajo actualizado exitosamente',
      data: updatedWorkspace,
    })
  } catch (error) {
    console.error('Update workspace Simple API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}