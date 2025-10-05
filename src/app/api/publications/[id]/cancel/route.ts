import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { PublicationService } from '@/lib/database/services'

interface RouteParams {
  params: { id: string }
}

/**
 * POST /api/publications/[id]/cancel
 * Cancel a scheduled publication
 */
export const POST = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const cancelledPublication = await PublicationService.updatePublication(
        id,
        {
          status: 'cancelled',
        }
      )

      return successResponse(
        cancelledPublication,
        'Publicación cancelada exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)
