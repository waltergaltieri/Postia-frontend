import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../auth/middleware'
import { PublicationService } from '@/lib/database/services'
import { UpdatePublicationData } from '@/lib/database/types'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/publications/[id]
 * Get a specific publication by ID
 */
export const GET = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const publication = await PublicationService.getPublicationById(id)

      if (!publication) {
        throw new Error('Publicación no encontrada')
      }

      return successResponse(publication, 'Publicación obtenida exitosamente')
    } catch (error) {
      return handleApiError(error)
    }
  }
)

/**
 * PATCH /api/publications/[id]
 * Update a publication
 */
export const PATCH = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const body = await req.json()

      const updateData: UpdatePublicationData = {
        content: body.content,
        scheduledDate: body.scheduledDate
          ? new Date(body.scheduledDate)
          : undefined,
        status: body.status,
      }

      const updatedPublication = await PublicationService.updatePublication(
        id,
        updateData
      )

      return successResponse(
        updatedPublication,
        'Publicación actualizada exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)
