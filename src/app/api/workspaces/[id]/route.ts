import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
  withWorkspaceAuth,
} from '../../auth/middleware'
import { WorkspaceService } from '@/lib/database/services'
import { UpdateWorkspaceData } from '@/lib/database/types'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/workspaces/[id]
 * Get a specific workspace by ID
 */
export const GET = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const workspace = await WorkspaceService.getWorkspaceById(id)

      if (!workspace) {
        throw new Error('Espacio de trabajo no encontrado')
      }

      // Check if user has access to this workspace
      if (!withWorkspaceAuth(workspace.id, user.agencyId)) {
        throw new Error('No autorizado para acceder a este espacio de trabajo')
      }

      return successResponse(
        workspace,
        'Espacio de trabajo obtenido exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)

/**
 * PATCH /api/workspaces/[id]
 * Update a workspace
 */
export const PATCH = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Check if workspace exists and user has access
      const existingWorkspace = await WorkspaceService.getWorkspaceById(id)
      if (!existingWorkspace) {
        throw new Error('Espacio de trabajo no encontrado')
      }

      if (!withWorkspaceAuth(existingWorkspace.id, user.agencyId)) {
        throw new Error('No autorizado para modificar este espacio de trabajo')
      }

      const body = await req.json()

      const updateData: UpdateWorkspaceData = {
        name: body.name,
        branding: body.branding,
      }

      const updatedWorkspace = await WorkspaceService.updateWorkspace(
        id,
        updateData
      )

      return successResponse(
        updatedWorkspace,
        'Espacio de trabajo actualizado exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)

/**
 * DELETE /api/workspaces/[id]
 * Delete a workspace
 */
export const DELETE = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Check if workspace exists and user has access
      const existingWorkspace = await WorkspaceService.getWorkspaceById(id)
      if (!existingWorkspace) {
        throw new Error('Espacio de trabajo no encontrado')
      }

      if (!withWorkspaceAuth(existingWorkspace.id, user.agencyId)) {
        throw new Error('No autorizado para eliminar este espacio de trabajo')
      }

      await WorkspaceService.deleteWorkspace(id)

      return successResponse(null, 'Espacio de trabajo eliminado exitosamente')
    } catch (error) {
      return handleApiError(error)
    }
  }
)
