import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/calendar
 * Get calendar events/publications for a workspace
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Calendar API called')
    
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('Calendar filters:', { workspaceId, startDate, endDate })

    // Return empty publications array - no mock data
    const filteredPublications: any[] = []

    return NextResponse.json({
      success: true,
      message: 'Eventos del calendario obtenidos exitosamente',
      data: filteredPublications,
    })
  } catch (error) {
    console.error('Calendar API error:', error)
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