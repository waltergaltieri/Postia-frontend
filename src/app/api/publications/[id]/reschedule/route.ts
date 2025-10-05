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
 * POST /api/publications/[id]/reschedule
 * Reschedule a publication to a new date
 */
export const POST = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const body = await req.json()
      const { scheduledDate } = body

      if (!scheduledDate) {
        throw new Error('scheduledDate es requerido')
      }

      const rescheduledPublication = await PublicationService.updatePublication(
        id,
        {
          scheduledDate: new Date(scheduledDate),
          status: 'scheduled', // Reset to scheduled if it was failed or cancelled
        }
      )

      return successResponse(
        rescheduledPublication,
        'Publicación reprogramada exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)
