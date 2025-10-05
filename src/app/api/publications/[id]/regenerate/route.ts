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
 * POST /api/publications/[id]/regenerate
 * Regenerate publication content using AI
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
      const { prompt } = body

      // TODO: Implement AI content regeneration
      // For now, we'll just update with a placeholder message
      const regeneratedContent = prompt
        ? `Contenido regenerado con nuevo prompt: ${prompt.substring(0, 100)}...`
        : 'Contenido regenerado con IA. Nueva versión optimizada para mejor engagement.'

      const regeneratedPublication = await PublicationService.updatePublication(
        id,
        {
          content: regeneratedContent,
          status: 'scheduled', // Reset to scheduled after regeneration
        }
      )

      return successResponse(
        regeneratedPublication,
        'Publicación regenerada exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)
