import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { PublicationService } from '@/lib/database/services'
import { ContentGenerationOrchestrator } from '@/lib/ai/orchestrator/ContentGenerationOrchestrator'

interface RouteParams {
  params: { id: string }
}

/**
 * POST /api/publications/[id]/regenerate
 * Regenerate publication content using AI agents with history tracking
 */
export const POST = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id } = params

      if (!user?.agencyId) {
        throw new Error('Usuario no autenticado')
      }

      const body = await req.json()
      const { customPrompt, reason = 'user_request' } = body

      const publicationService = new PublicationService()

      // Get publication with context for validation
      const publication = await publicationService.getPublicationWithContext(id, user.agencyId)
      if (!publication) {
        throw new Error('Publicación no encontrada')
      }

      // Validate publication can be regenerated
      if (publication.status === 'published') {
        throw new Error('No se puede regenerar una publicación ya publicada')
      }

      // Update generation status to generating
      await publicationService.updatePublicationStatus(id, 'generating', user.agencyId)

      // Create content plan item for regeneration
      const contentPlanItem = {
        id: publication.id,
        title: `Regeneración: ${publication.content.substring(0, 50)}...`,
        platform: publication.socialNetwork,
        socialNetwork: publication.socialNetwork,
        scheduledDate: publication.scheduledDate.toISOString(),
        contentType: publication.generationMetadata?.agentUsed || 'text-only',
        description: customPrompt || publication.generationMetadata?.textPrompt || 'Regenerar contenido',
        templateId: publication.templateId,
        resourceIds: publication.generationMetadata?.resourcesUsed || []
      }

      // Initialize orchestrator and regenerate
      const orchestrator = new ContentGenerationOrchestrator()
      
      try {
        await orchestrator.regeneratePublication({
          publicationId: id,
          contentPlan: contentPlanItem,
          workspace: {
            id: publication.workspace.id,
            name: publication.workspace.name,
            branding: publication.workspace.branding
          },
          resources: publication.campaign.resources || [],
          templates: publication.campaign.templates || []
        })

        // Get updated publication
        const updatedPublication = await publicationService.getPublicationById(id, user.agencyId)

        return successResponse(
          {
            publication: updatedPublication,
            regenerationHistory: await publicationService.getRegenerationHistory(id, user.agencyId)
          },
          'Publicación regenerada exitosamente'
        )
      } catch (regenerationError) {
        // Update status to failed on error
        await publicationService.updatePublicationStatus(id, 'failed', user.agencyId)
        
        throw regenerationError
      }
    } catch (error) {
      return handleApiError(error)
    }
  }
)
