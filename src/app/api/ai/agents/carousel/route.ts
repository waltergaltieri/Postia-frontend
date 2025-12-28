import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { createCarouselAgent } from '@/lib/ai/agents'
import type { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from '@/lib/ai/agents'

interface CarouselGenerationRequest {
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
  resources: ResourceData[]
  template: TemplateData
}

/**
 * POST /api/ai/agents/carousel
 * Endpoint especializado para CarouselAgent
 */
export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const { user } = req

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Parsear el cuerpo de la petición
      const body: CarouselGenerationRequest = await req.json()
      const { contentPlan, workspace, resources, template } = body

      // Validar datos requeridos
      if (!contentPlan) {
        throw new Error('Plan de contenido requerido')
      }

      if (!workspace) {
        throw new Error('Datos del workspace requeridos')
      }

      if (!resources || !Array.isArray(resources)) {
        throw new Error('Recursos requeridos para generación de carrusel')
      }

      if (!template) {
        throw new Error('Template de carrusel requerido')
      }

      console.log(`🎠 Starting carousel generation for publication: ${contentPlan.title}`)
      console.log(`📁 Using ${resources.length} resources with carousel template: ${template.name}`)

      // Crear y ejecutar agente de carrusel
      const agent = createCarouselAgent()
      
      const startTime = Date.now()
      const result = await agent.generate({
        contentPlan,
        workspace,
        resources,
        template
      })
      const processingTime = Date.now() - startTime

      console.log(`✅ Carousel generation completed in ${processingTime}ms`)
      console.log(`🖼️ Generated ${result.imageUrls?.length || 0} carousel images`)

      // Preparar respuesta
      const response = {
        success: true,
        agentType: 'carousel',
        publicationId: contentPlan.id,
        result: {
          text: result.text,
          imageUrls: result.imageUrls || [],
          templateTexts: result.templateTexts || [],
          metadata: {
            ...result.metadata,
            processingTimeMs: processingTime,
            agentUsed: 'carousel',
            generationTime: new Date().toISOString(),
            resourcesUsed: resources.map(r => r.id),
            templateUsed: template.id
          }
        },
        processingStats: {
          processingTimeMs: processingTime,
          textLength: result.text.length,
          carouselImagesCount: result.imageUrls?.length || 0,
          templateTextsCount: Array.isArray(result.templateTexts) ? result.templateTexts.length : 0,
          resourcesCount: resources.length,
          templateId: template.id,
          templateName: template.name,
          socialNetwork: contentPlan.socialNetwork,
          contentType: contentPlan.contentType
        }
      }

      return successResponse(
        response,
        'Carrusel generado exitosamente'
      )

    } catch (error) {
      console.error('Error in carousel agent:', error)
      return handleApiError(error)
    }
  }
)