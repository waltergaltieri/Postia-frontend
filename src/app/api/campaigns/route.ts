import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/campaigns
 * Get campaigns with filtering and pagination
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Campaigns API called')
    
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('Campaign filters:', { workspaceId, status, search, page, limit })

    // Return empty campaigns array - no mock data
    const filteredCampaigns: any[] = []

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex)

    return NextResponse.json({
      data: paginatedCampaigns,
      pagination: {
        page,
        limit,
        total: filteredCampaigns.length,
        totalPages: Math.ceil(filteredCampaigns.length / limit),
      },
      message: 'Campañas obtenidas exitosamente',
      success: true,
    })
  } catch (error) {
    console.error('Campaigns API error:', error)
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

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Create campaign API called')
    
    const body = await req.json()
    
    // Return mock created campaign
    const mockCampaign = {
      id: `campaign-${Date.now()}`,
      workspaceId: body.workspaceId,
      name: body.name,
      objective: body.objective,
      startDate: body.startDate,
      endDate: body.endDate,
      socialNetworks: body.socialNetworks || [],
      intervalHours: body.intervalHours || 24,
      contentType: body.contentType || 'unified',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      message: 'Campaña creada exitosamente',
      data: mockCampaign,
    }, { status: 201 })
  } catch (error) {
    console.error('Create campaign API error:', error)
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