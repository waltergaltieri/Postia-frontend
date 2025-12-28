import { NextRequest, NextResponse } from 'next/server'
import { ResourceAnalysisRepository } from '@/lib/database/repositories/ResourceAnalysisRepository'

/**
 * GET /api/analyses/resources
 * Get cached analyses for multiple resources
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const resourceIds = searchParams.get('resourceIds')?.split(',') || []
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

    if (resourceIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay recursos para analizar',
        data: {},
      })
    }

    console.log('🔍 Looking up cached analyses for resources:', resourceIds)

    const analysisRepo = new ResourceAnalysisRepository()
    const cachedAnalyses = analysisRepo.findByResourceIds(resourceIds)

    console.log(`📊 Found ${Object.keys(cachedAnalyses).length}/${resourceIds.length} cached resource analyses`)

    return NextResponse.json({
      success: true,
      message: 'Análisis de recursos obtenidos exitosamente',
      data: cachedAnalyses,
    })
  } catch (error) {
    console.error('Error fetching resource analyses:', error)
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