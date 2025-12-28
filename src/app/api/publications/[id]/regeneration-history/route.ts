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
 * GET /api/publications/[id]/regeneration-history
 * Get regeneration history for a publication
 */
export const GET = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user?.agencyId) {
        throw new Error('Usuario no autenticado')
      }

      const publicationService = new PublicationService()

      // Get regeneration history with access validation
      const history = await publicationService.getRegenerationHistory(id, user.agencyId)

      return successResponse(
        history,
        'Historial de regeneración obtenido exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)