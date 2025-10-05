import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../auth/middleware'
import { CampaignService } from '@/lib/database/services'
import { UpdateCampaignData } from '@/lib/database/types'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/campaigns/[id]
 * Get a specific campaign by ID
 */
export const GET = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const campaign = await CampaignService.getCampaignById(id)

      if (!campaign) {
        throw new Error('Campaña no encontrada')
      }

      return successResponse(campaign, 'Campaña obtenida exitosamente')
    } catch (error) {
      return handleApiError(error)
    }
  }
)

/**
 * PATCH /api/campaigns/[id]
 * Update a campaign
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

      const updateData: UpdateCampaignData = {
        name: body.name,
        objective: body.objective,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        socialNetworks: body.socialNetworks,
        intervalHours: body.intervalHours,
        contentType: body.contentType,
        optimizationSettings: body.optimizationSettings,
        prompt: body.prompt,
        status: body.status,
      }

      const updatedCampaign = await CampaignService.updateCampaign(
        id,
        updateData
      )

      return successResponse(
        updatedCampaign,
        'Campaña actualizada exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)

/**
 * DELETE /api/campaigns/[id]
 * Delete a campaign
 */
export const DELETE = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      await CampaignService.deleteCampaign(id)

      return successResponse(null, 'Campaña eliminada exitosamente')
    } catch (error) {
      return handleApiError(error)
    }
  }
)
