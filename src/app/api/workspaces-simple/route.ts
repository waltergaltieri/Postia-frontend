import { NextRequest, NextResponse } from 'next/server'
import { WorkspaceRepository } from '@/lib/database/repositories/WorkspaceRepository'
import '@/lib/database/auto-init' // Auto-initialize database

/**
 * GET /api/workspaces-simple
 * Get all workspaces for a specific agency (temporary solution)
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Workspaces Simple API called')
    
    const { searchParams } = new URL(req.url)
    const agencyId = searchParams.get('agencyId') || 'agency-1760035323771' // Default to known agency
    
    const workspaceRepo = new WorkspaceRepository()
    
    console.log(`Getting workspaces for agency: ${agencyId}`)
    const workspaces = workspaceRepo.findByAgencyId(agencyId)

    return NextResponse.json({
      success: true,
      message: 'Espacios de trabajo obtenidos exitosamente',
      data: workspaces,
    })
  } catch (error) {
    console.error('Workspaces Simple API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workspaces-simple
 * Create a new workspace (temporary solution)
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Create workspace Simple API called')
    
    const body = await req.json()
    
    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          message: 'El nombre del workspace es requerido',
        },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const agencyId = searchParams.get('agencyId') || 'agency-1760035323771' // Default to known agency
    
    const workspaceRepo = new WorkspaceRepository()
    
    const workspaceData = {
      agencyId: agencyId,
      name: body.name,
      branding: {
        primaryColor: body.branding?.primaryColor || '#9333ea',
        secondaryColor: body.branding?.secondaryColor || '#737373',
        logo: body.branding?.logo || '',
        slogan: body.branding?.slogan || '',
        description: body.branding?.description || '',
        whatsapp: body.branding?.whatsapp || '',
      },
    }

    console.log(`Creating workspace for agency: ${agencyId}`)
    console.log('Workspace data:', workspaceData)
    
    const newWorkspace = workspaceRepo.create(workspaceData)
    console.log('Created workspace:', newWorkspace)

    return NextResponse.json({
      success: true,
      message: 'Espacio de trabajo creado exitosamente',
      data: newWorkspace,
    }, { status: 201 })
  } catch (error) {
    console.error('Create workspace Simple API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}