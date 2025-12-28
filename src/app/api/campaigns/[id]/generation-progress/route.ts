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
 * GET /api/campaigns/[id]/generation-progress
 * Obtener estado actual de generación en tiempo real
 */
async function getProgressHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = req
    const resolvedParams = await params
    const { id: campaignId } = resolvedParams

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Verificar que la campaña existe (opcional para desarrollo)
      const campaignService = new CampaignService()
      try {
        const campaign = campaignService.getCampaignDetails(campaignId, user.agencyId)
        console.log('✅ Campaign found for progress check:', campaign?.name)
      } catch (error) {
        console.log('⚠️ Campaign not found in database, but continuing with progress check')
        // No fallar aquí, ya que la campaña puede estar siendo creada en paralelo
      }

      // Crear orquestador para obtener progreso
      const orchestrator = createContentGenerationOrchestrator()

      // Obtener progreso actual
      const progress = await orchestrator.getGenerationProgress(campaignId)

      if (!progress) {
        // No hay generación en progreso o completada
        return successResponse(
          {
            campaignId,
            status: 'not_started',
            progress: {
              total: 0,
              completed: 0,
              percentage: 0
            },
            currentPublication: null,
            currentAgent: null,
            currentStep: null,
            errors: [],
            estimatedTimeRemaining: null,
            isActive: false
          },
          'No hay generación en progreso'
        )
      }

      // Verificar si la generación está activa
      const isActive = orchestrator.isGenerationActive(campaignId)

      // Calcular porcentaje de progreso
      const percentage = progress.totalPublications > 0 
        ? Math.round((progress.completedPublications / progress.totalPublications) * 100)
        : 0

      // Determinar estado actual
      let status = 'in_progress'
      if (progress.completedAt) {
        status = progress.errors.length > 0 ? 'completed_with_errors' : 'completed'
      } else if (!isActive && progress.completedPublications === 0) {
        status = 'failed'
      }

      // Calcular tiempo estimado restante
      let estimatedTimeRemaining: number | null = null
      if (isActive && progress.completedPublications > 0) {
        const elapsedTime = Date.now() - progress.startedAt.getTime()
        const avgTimePerPublication = elapsedTime / progress.completedPublications
        const remainingPublications = progress.totalPublications - progress.completedPublications
        estimatedTimeRemaining = Math.round(avgTimePerPublication * remainingPublications / 1000) // en segundos
      }

      // Obtener información de la publicación actual
      let currentPublicationInfo = null
      if (progress.currentPublicationId && isActive) {
        currentPublicationInfo = {
          id: progress.currentPublicationId,
          step: progress.currentStep || 'processing'
        }
      }

      const response = {
        campaignId,
        status,
        progress: {
          total: progress.totalPublications,
          completed: progress.completedPublications,
          percentage
        },
        currentPublication: currentPublicationInfo,
        currentAgent: progress.currentAgent,
        currentStep: progress.currentStep,
        errors: progress.errors.map(error => ({
          publicationId: error.publicationId,
          agentType: error.agentType,
          message: error.errorMessage,
          timestamp: error.timestamp,
          retryCount: error.retryCount
        })),
        estimatedTimeRemaining,
        isActive,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        generationStats: {
          successfulPublications: progress.completedPublications - progress.errors.length,
          failedPublications: progress.errors.length,
          totalProcessingTime: progress.completedAt 
            ? progress.completedAt.getTime() - progress.startedAt.getTime()
            : Date.now() - progress.startedAt.getTime()
        }
      }

      return successResponse(
        response,
        'Progreso de generación obtenido exitosamente'
      )

  } catch (error) {
    console.error('Error getting generation progress:', error)
    return handleApiError(error)
  }
}

// Versión temporal sin auth para desarrollo
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('🚀 GET /api/campaigns/[id]/generation-progress called')
  
  const resolvedParams = await params
  console.log('📋 Campaign ID:', resolvedParams.id)
  
  try {
    // Mock user para desarrollo
    const mockUser = {
      id: 'user-admin-001',
      email: 'admin@agency.com',
      agencyId: 'agency-demo-001',
      role: 'admin' as const
    }

    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.user = mockUser

    console.log('🔄 Calling getProgressHandler...')
    return getProgressHandler(authenticatedReq, { params })
  } catch (error) {
    console.error('💥 Error in GET handler:', error)
    return handleApiError(error)
  }
}