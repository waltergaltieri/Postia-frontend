import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../../../auth/middleware'
import { getContentDescriptionService } from '@/lib/database/services'

interface RouteParams {
  params: { 
    id: string
    descId: string 
  }
}

/**
 * PUT /api/campaigns/[id]/descriptions/[descId]/regenerate
 * Regenerate a specific content description using AI
 */
export const PUT = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { descId } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const contentDescriptionService = getContentDescriptionService()

      // Regenerate description using AI
      const regeneratedDescription = await contentDescriptionService.regenerateDescription(
        descId,
        user.agencyId
      )

      return successResponse(
        regeneratedDescription,
        'Descripción regenerada exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)