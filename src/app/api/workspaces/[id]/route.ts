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

      const workspaceService = new WorkspaceService()
      const workspaceDetails = workspaceService.getWorkspaceDetails(id, user.agencyId)
      const workspace = workspaceDetails.workspace

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
      console.log('PATCH /api/workspaces/[id] - Starting request')
      const { user } = req
      const { id } = params

      console.log('User:', user?.id, 'AgencyId:', user?.agencyId, 'WorkspaceId:', id)

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      console.log('Creating WorkspaceService instance...')
      const workspaceService = new WorkspaceService()
      console.log('WorkspaceService created successfully')
      
      console.log('Parsing request body...')
      const body = await req.json()
      console.log('Request body:', JSON.stringify(body, null, 2))

      const updateData: UpdateWorkspaceData = {
        name: body.name,
        branding: body.branding,
      }

      console.log('Update data:', JSON.stringify(updateData, null, 2))
      console.log('Calling updateWorkspace...')
      
      const updatedWorkspace = workspaceService.updateWorkspace(
        id,
        updateData,
        user.agencyId
      )

      console.log('Workspace updated successfully:', updatedWorkspace?.id)

      return successResponse(
        updatedWorkspace,
        'Espacio de trabajo actualizado exitosamente'
      )
    } catch (error) {
      console.error('PATCH /api/workspaces/[id] - Error:', error)
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

      const workspaceService = new WorkspaceService()
      
      workspaceService.deleteWorkspace(id, user.agencyId)

      return successResponse(null, 'Espacio de trabajo eliminado exitosamente')
    } catch (error) {
      return handleApiError(error)
    }
  }
)
