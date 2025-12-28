import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { createTextImageAgent } from '@/lib/ai/agents'
import type { ContentPlanItem, WorkspaceData, ResourceData } from '@/lib/ai/agents'

interface TextImageGenerationRequest {
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
  resources: ResourceData[]
}

/**
 * POST /api/ai/agents/text-image
 * Endpoint especializado para TextImageAgent
 */
export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const { user } = req

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Parsear el cuerpo de la petición
      const body: TextImageGenerationRequest = await req.json()
      const { contentPlan, workspace, resources } = body

      // Validar datos requeridos
      if (!contentPlan) {
        throw new Error('Plan de contenido requerido')
      }

      if (!workspace) {
        throw new Error('Datos del workspace requeridos')
      }

      if (!resources || !Array.isArray(resources)) {
        throw new Error('Recursos requeridos para generación de imagen')
      }

      console.log(`🖼️ Starting text-image generation for publication: ${contentPlan.title}`)
      console.log(`📁 Using ${resources.length} resources`)

      // Crear y ejecutar agente de texto + imagen
      const agent = createTextImageAgent()
      
      const startTime = Date.now()
      const result = await agent.generate({
        contentPlan,
        workspace,
        resources
      })
      const processingTime = Date.now() - startTime

      console.log(`✅ Text-image generation completed in ${processingTime}ms`)

      // Preparar respuesta
      const response = {
        success: true,
        agentType: 'text-image',
        publicationId: contentPlan.id,
        result: {
          text: result.text,
          imageUrl: result.imageUrl,
          metadata: {
            ...result.metadata,
            processingTimeMs: processingTime,
            agentUsed: 'text-image',
            generationTime: new Date().toISOString(),
            resourcesUsed: resources.map(r => r.id)
          }
        },
        processingStats: {
          processingTimeMs: processingTime,
          textLength: result.text.length,
          imageGenerated: !!result.imageUrl,
          resourcesCount: resources.length,
          socialNetwork: contentPlan.socialNetwork,
          contentType: contentPlan.contentType
        }
      }

      return successResponse(
        response,
        'Contenido de texto e imagen generado exitosamente'
      )

    } catch (error) {
      console.error('Error in text-image agent:', error)
      return handleApiError(error)
    }
  }
)