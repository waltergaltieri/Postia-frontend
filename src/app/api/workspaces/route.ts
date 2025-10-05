import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/workspaces
 * Get all workspaces for the authenticated user's agency
 */
export async function GET(req: NextRequest) {
  try {

    
    // Return mock workspaces for now
    const mockWorkspaces = [
      {
        id: 'workspace-001',
        agencyId: 'agency-demo-001',
        name: 'Cliente Restaurante La Tradición',
        branding: {
          primaryColor: '#e11d48',
          secondaryColor: '#64748b',
          colors: {
            primary: '#e11d48',
            secondary: '#64748b',
          },
          logo: '/logos/restaurante.png',
          slogan: 'Sabores que conquistan corazones',
          description: 'Restaurante familiar con tradición de 30 años especializado en cocina mediterránea',
          whatsapp: '+52-555-0123',
        },
        createdAt: '2025-01-15T10:00:00.000Z',
        updatedAt: '2025-01-15T10:00:00.000Z',
      },
      {
        id: 'workspace-002',
        agencyId: 'agency-demo-001',
        name: 'Cliente Fitness Revolution',
        branding: {
          primaryColor: '#059669',
          secondaryColor: '#6b7280',
          colors: {
            primary: '#059669',
            secondary: '#6b7280',
          },
          logo: '/logos/fitness.png',
          slogan: 'Tu mejor versión te espera',
          description: 'Gimnasio moderno con entrenadores certificados y tecnología de vanguardia',
          whatsapp: '+52-555-0456',
        },
        createdAt: '2025-01-10T08:30:00.000Z',
        updatedAt: '2025-01-10T08:30:00.000Z',
      },
    ]

    return NextResponse.json({
      success: true,
      message: 'Espacios de trabajo obtenidos exitosamente',
      data: mockWorkspaces,
    })
  } catch (error) {
    console.error('Workspaces API error:', error)
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
 * POST /api/workspaces
 * Create a new workspace
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Create workspace API called')
    
    const body = await req.json()
    
    // Return mock created workspace
    const mockWorkspace = {
      id: `workspace-${Date.now()}`,
      agencyId: 'agency-demo-001',
      name: body.name,
      branding: {
        primaryColor: body.branding?.primaryColor || '#9333ea',
        secondaryColor: body.branding?.secondaryColor || '#737373',
        colors: {
          primary: body.branding?.primaryColor || '#9333ea',
          secondary: body.branding?.secondaryColor || '#737373',
        },
        logo: body.branding?.logo || '',
        slogan: body.branding?.slogan || '',
        description: body.branding?.description || '',
        whatsapp: body.branding?.whatsapp || '',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      message: 'Espacio de trabajo creado exitosamente',
      data: mockWorkspace,
    }, { status: 201 })
  } catch (error) {
    console.error('Create workspace API error:', error)
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