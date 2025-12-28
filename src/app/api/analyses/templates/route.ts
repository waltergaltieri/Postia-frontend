import { NextRequest, NextResponse } from 'next/server'
import { TemplateAnalysisRepository } from '@/lib/database/repositories/TemplateAnalysisRepository'

/**
 * GET /api/analyses/templates
 * Get cached analyses for multiple templates
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const templateIds = searchParams.get('templateIds')?.split(',') || []
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId es requerido',
        },
        { status: 400 }
      )
    }

    if (templateIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay plantillas para analizar',
        data: {},
      })
    }

    console.log('🔍 Looking up cached analyses for templates:', templateIds)

    const analysisRepo = new TemplateAnalysisRepository()
    const cachedAnalyses = analysisRepo.findByTemplateIds(templateIds)

    console.log(`📊 Found ${Object.keys(cachedAnalyses).length}/${templateIds.length} cached template analyses`)

    return NextResponse.json({
      success: true,
      message: 'Análisis de plantillas obtenidos exitosamente',
      data: cachedAnalyses,
    })
  } catch (error) {
    console.error('Error fetching template analyses:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}