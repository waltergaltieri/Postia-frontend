import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { createContentGenerationOrchestrator } from '@/lib/ai/orchestrator/ContentGenerationOrchestrator'
import { CampaignService } from '@/lib/database/services'
import type { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from '@/lib/ai/agents'

interface GenerateContentRequest {
  contentPlan: ContentPlanItem[]
  workspace: WorkspaceData
  resources: ResourceData[]
  templates: TemplateData[]
}

/**
 * POST /api/campaigns/[id]/generate-content
 * Activar generación de contenido real después del paso 4
 */
async function generateContentHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('🎯 generateContentHandler called')
  
  try {
    const { user } = req
    const resolvedParams = await params
    const { id: campaignId } = resolvedParams
    
    console.log('📋 Params:', resolvedParams)
    console.log('🆔 Campaign ID:', campaignId)

    console.log('👤 User:', user)

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Verificar que la campaña existe (opcional para desarrollo)
      const campaignService = new CampaignService()
      try {
        const campaign = campaignService.getCampaignDetails(campaignId, user.agencyId)
        console.log('✅ Campaign found:', campaign?.name)
      } catch (error) {
        console.log('⚠️ Campaign not found in database, but continuing with generation process')
        // No fallar aquí, ya que la campaña puede estar siendo creada en paralelo
      }

      // Parsear el cuerpo de la petición
      const body: GenerateContentRequest = await req.json()
      const { contentPlan, workspace, resources, templates } = body

      // Validar datos requeridos
      if (!contentPlan || !Array.isArray(contentPlan) || contentPlan.length === 0) {
        throw new Error('Plan de contenido requerido')
      }

      if (!workspace) {
        throw new Error('Datos del workspace requeridos')
      }

      console.log(`🚀 Starting content generation for campaign ${campaignId}`)
      console.log(`📋 Content plan has ${contentPlan.length} publications`)

      // Crear orquestador de generación
      console.log('🔧 Creating content generation orchestrator...')
      try {
        const orchestrator = createContentGenerationOrchestrator()
        console.log('✅ Orchestrator created successfully')

        // Verificar si ya hay una generación activa
        if (orchestrator.isGenerationActive(campaignId)) {
          throw new Error('Ya hay una generación en progreso para esta campaña')
        }

        // Iniciar generación asíncrona (no esperar a que termine)
        orchestrator.generateCampaignContent({
          campaignId,
          contentPlan,
          workspace,
          resources: resources || [],
          templates: templates || []
        }).catch(error => {
          console.error(`💥 Error in background generation for campaign ${campaignId}:`, error)
        })
        
        console.log('🚀 Generation started successfully')
      } catch (orchestratorError) {
        console.error('💥 Error creating or using orchestrator:', orchestratorError)
        throw new Error(`Error en el orquestador: ${orchestratorError instanceof Error ? orchestratorError.message : 'Error desconocido'}`)
      }

      // Respuesta inmediata con ID de generación
      return successResponse(
        {
          generationId: `gen-${campaignId}-${Date.now()}`,
          campaignId,
          status: 'started',
          totalPublications: contentPlan.length,
          message: 'Generación de contenido iniciada'
        },
        'Generación de contenido iniciada exitosamente'
      )

  } catch (error) {
    console.error('Error starting content generation:', error)
    return handleApiError(error)
  }
}

// Versión temporal sin auth para desarrollo
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('🚀 POST /api/campaigns/[id]/generate-content called')
  
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

    console.log('🔄 Calling generateContentHandler...')
    return generateContentHandler(authenticatedReq, { params })
  } catch (error) {
    console.error('💥 Error in POST handler:', error)
    return handleApiError(error)
  }
}