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
 * POST /api/publications/[id]/publish
 * Publish a publication immediately
 */
export const POST = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Update publication status to published and set published timestamp
      const publishedPublication = await PublicationService.updatePublication(
        id,
        {
          status: 'published',
          scheduledDate: new Date(), // Set to now
        }
      )

      return successResponse(
        publishedPublication,
        'Publicación publicada exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)
