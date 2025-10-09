import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { getContentDescriptionService } from '@/lib/database/services'
import { ContentDescriptionFilters, QueryOptions } from '@/lib/database/types'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/campaigns/[id]/descriptions
 * Get content descriptions for a campaign
 */
export const GET = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id: campaignId } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const url = new URL(req.url)
      const searchParams = url.searchParams

      // Parse query parameters
      const options: QueryOptions = {
        limit: parseInt(searchParams.get('limit') || '50'),
        offset: parseInt(searchParams.get('offset') || '0'),
        orderBy: searchParams.get('orderBy') || 'scheduled_date',
        orderDirection: (searchParams.get('orderDirection') as 'ASC' | 'DESC') || 'ASC'
      }

      // Parse filters
      const filters: ContentDescriptionFilters = {
        campaignId
      }

      if (searchParams.get('platform')) {
        filters.platform = searchParams.get('platform') as any
      }

      if (searchParams.get('contentType')) {
        filters.contentType = searchParams.get('contentType') as any
      }

      if (searchParams.get('status')) {
        filters.status = searchParams.get('status') as any
      }

      if (searchParams.get('scheduledDateFrom')) {
        filters.scheduledDateFrom = new Date(searchParams.get('scheduledDateFrom')!)
      }

      if (searchParams.get('scheduledDateTo')) {
        filters.scheduledDateTo = new Date(searchParams.get('scheduledDateTo')!)
      }

      const contentDescriptionService = getContentDescriptionService()

      // Get descriptions
      const descriptions = contentDescriptionService.getDescriptionsWithFilters(
        filters,
        user.agencyId,
        options
      )

      // Get total count
      const totalCount = contentDescriptionService.countDescriptionsByCampaign(
        campaignId,
        user.agencyId
      )

      return successResponse(
        {
          descriptions,
          pagination: {
            total: totalCount,
            limit: options.limit,
            offset: options.offset,
            hasMore: (options.offset || 0) + descriptions.length < totalCount
          }
        },
        'Descripciones obtenidas exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)