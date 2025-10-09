import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { getContentDescriptionService } from '@/lib/database/services'

interface RouteParams {
  params: { id: string }
}

/**
 * POST /api/campaigns/[id]/generate-descriptions
 * Generate content descriptions for a campaign using AI
 */
export const POST = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id: campaignId } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const contentDescriptionService = getContentDescriptionService()

      // Generate descriptions using AI
      const descriptions = await contentDescriptionService.generateDescriptionsForCampaign(
        campaignId,
        user.agencyId
      )

      return successResponse(
        {
          descriptions,
          count: descriptions.length
        },
        'Descripciones de contenido generadas exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)