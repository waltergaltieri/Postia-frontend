import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { createTextTemplateAgent } from '@/lib/ai/agents'
import type { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from '@/lib/ai/agents'

interface TextTemplateGenerationRequest {
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
  resources: ResourceData[]
  template: TemplateData
}

/**
 * POST /api/ai/agents/text-template
 * Endpoint especializado para TextTemplateAgent
 */
export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const { user } = req

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Parsear el cuerpo de la petición
      const body: TextTemplateGenerationRequest = await req.json()
      const { contentPlan, workspace, resources, template } = body

      // Validar datos requeridos
      if (!contentPlan) {
        throw new Error('Plan de contenido requerido')
      }

      if (!workspace) {
        throw new Error('Datos del workspace requeridos')
      }

      if (!resources || !Array.isArray(resources)) {
        throw new Error('Recursos requeridos para generación con template')
      }

      if (!template) {
        throw new Error('Template requerido para generación con diseño')
      }

      console.log(`🎨 Starting text-template generation for publication: ${contentPlan.title}`)
      console.log(`📁 Using ${resources.length} resources with template: ${template.name}`)

      // Crear y ejecutar agente de texto + template
      const agent = createTextTemplateAgent()
      
      const startTime = Date.now()
      const result = await agent.generate({
        contentPlan,
        workspace,
        resources,
        template
      })
      const processingTime = Date.now() - startTime

      console.log(`✅ Text-template generation completed in ${processingTime}ms`)

      // Preparar respuesta
      const response = {
        success: true,
        agentType: 'text-template',
        publicationId: contentPlan.id,
        result: {
          text: result.text,
          imageUrl: result.imageUrl,
          templateTexts: result.templateTexts || {},
          metadata: {
            ...result.metadata,
            processingTimeMs: processingTime,
            agentUsed: 'text-template',
            generationTime: new Date().toISOString(),
            resourcesUsed: resources.map(r => r.id),
            templateUsed: template.id
          }
        },
        processingStats: {
          processingTimeMs: processingTime,
          textLength: result.text.length,
          imageGenerated: !!result.imageUrl,
          templateTextsCount: Object.keys(result.templateTexts || {}).length,
          resourcesCount: resources.length,
          templateId: template.id,
          templateName: template.name,
          socialNetwork: contentPlan.socialNetwork,
          contentType: contentPlan.contentType
        }
      }

      return successResponse(
        response,
        'Contenido con template generado exitosamente'
      )

    } catch (error) {
      console.error('Error in text-template agent:', error)
      return handleApiError(error)
    }
  }
)