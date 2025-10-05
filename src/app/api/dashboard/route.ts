import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/dashboard
 * Get dashboard statistics for a workspace
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Dashboard API called')
    
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    console.log('Dashboard filters:', { workspaceId })

    // Return empty dashboard data - no mock data
    const dashboardData = {
      metrics: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        scheduledPublications: 0,
        publishedThisMonth: 0,
        totalResources: 0,
        totalTemplates: 0,
      },
      recentActivity: [],
      upcomingPublications: [],
      performanceData: {
        labels: [],
        datasets: [
          {
            label: 'Publicaciones',
            data: [],
            borderColor: '#9333ea',
            backgroundColor: 'rgba(147, 51, 234, 0.1)',
          },
        ],
      },
    }

    return NextResponse.json({
      success: true,
      message: 'Datos del dashboard obtenidos exitosamente',
      data: dashboardData,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
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