import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { createTextOnlyAgent } from '@/lib/ai/agents'
import type { ContentPlanItem, WorkspaceData } from '@/lib/ai/agents'

interface TextOnlyGenerationRequest {
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
}

/**
 * POST /api/ai/agents/text-only
 * Endpoint especializado para TextOnlyAgent
 */
export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const { user } = req

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Parsear el cuerpo de la petición
      const body: TextOnlyGenerationRequest = await req.json()
      const { contentPlan, workspace } = body

      // Validar datos requeridos
      if (!contentPlan) {
        throw new Error('Plan de contenido requerido')
      }

      if (!workspace) {
        throw new Error('Datos del workspace requeridos')
      }

      console.log(`🔤 Starting text-only generation for publication: ${contentPlan.title}`)

      // Crear y ejecutar agente de texto
      const agent = createTextOnlyAgent()
      
      const startTime = Date.now()
      const result = await agent.generate({
        contentPlan,
        workspace
      })
      const processingTime = Date.now() - startTime

      console.log(`✅ Text-only generation completed in ${processingTime}ms`)

      // Preparar respuesta
      const response = {
        success: true,
        agentType: 'text-only',
        publicationId: contentPlan.id,
        result: {
          text: result.text,
          metadata: {
            ...result.metadata,
            processingTimeMs: processingTime,
            agentUsed: 'text-only',
            generationTime: new Date().toISOString()
          }
        },
        processingStats: {
          processingTimeMs: processingTime,
          textLength: result.text.length,
          socialNetwork: contentPlan.socialNetwork,
          contentType: contentPlan.contentType
        }
      }

      return successResponse(
        response,
        'Contenido de texto generado exitosamente'
      )

    } catch (error) {
      console.error('Error in text-only agent:', error)
      return handleApiError(error)
    }
  }
)