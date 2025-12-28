import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { createContentGenerationOrchestrator } from '@/lib/ai/orchestrator/ContentGenerationOrchestrator'
import { CampaignService } from '@/lib/database/services'

/**
 * POST /api/campaigns/[id]/cancel-generation
 * Cancelar proceso de generación en progreso
 */
async function cancelGenerationHandler(req: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = req
    const { id: campaignId } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Verificar que la campaña existe
      const campaignService = new CampaignService()
      const campaign = campaignService.getCampaignDetails(campaignId, user.agencyId)
      if (!campaign) {
        throw new Error('Campaña no encontrada')
      }

      console.log(`🛑 Cancellation requested for campaign ${campaignId}`)

      // Crear orquestador para cancelar generación
      const orchestrator = createContentGenerationOrchestrator()

      // Verificar si hay una generación activa
      const isActive = orchestrator.isGenerationActive(campaignId)
      
      if (!isActive) {
        // No hay generación activa para cancelar
        return successResponse(
          {
            campaignId,
            cancelled: false,
            reason: 'No hay generación activa para cancelar',
            status: 'not_active'
          },
          'No hay generación activa para esta campaña'
        )
      }

      // Obtener progreso actual antes de cancelar
      const progressBefore = await orchestrator.getGenerationProgress(campaignId)

      // Cancelar la generación
      await orchestrator.cancelGeneration(campaignId)

      console.log(`✅ Generation cancelled for campaign ${campaignId}`)

      // Preparar respuesta con estadísticas de cancelación
      const response = {
        campaignId,
        cancelled: true,
        status: 'cancelled',
        cancellationTime: new Date().toISOString(),
        progressAtCancellation: progressBefore ? {
          total: progressBefore.totalPublications,
          completed: progressBefore.completedPublications,
          percentage: Math.round((progressBefore.completedPublications / progressBefore.totalPublications) * 100),
          errors: progressBefore.errors.length
        } : null,
        message: 'Generación cancelada exitosamente'
      }

      return successResponse(
        response,
        'Generación cancelada exitosamente'
      )

  } catch (error) {
    console.error('Error cancelling generation:', error)
    return handleApiError(error)
  }
}

export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    // Extract params from URL
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const campaignId = pathSegments[pathSegments.indexOf('campaigns') + 1]
    
    return cancelGenerationHandler(req, { params: { id: campaignId } })
  }
)