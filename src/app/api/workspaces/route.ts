import { NextRequest, NextResponse } from 'next/server'
import { WorkspaceRepository } from '@/lib/database/repositories/WorkspaceRepository'
import { withAuth, AuthenticatedRequest } from '@/app/api/auth/middleware'
import '@/lib/database/auto-init' // Auto-initialize database

/**
 * GET /api/workspaces
 * Get all workspaces for the authenticated user's agency
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    console.log('Workspaces API called')
    
    const { user } = req
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Usuario no autenticado',
        },
        { status: 401 }
      )
    }
    
    const workspaceRepo = new WorkspaceRepository()
    
    // Use the authenticated user's agency ID
    console.log(`Getting workspaces for agency: ${user.agencyId}`)
    const workspaces = workspaceRepo.findByAgencyId(user.agencyId)

    return NextResponse.json({
      success: true,
      message: 'Espacios de trabajo obtenidos exitosamente',
      data: workspaces,
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
})

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    console.log('Create workspace API called')
    
    const body = await req.json()
    const { user } = req
    
    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          message: 'El nombre del workspace es requerido',
        },
        { status: 400 }
      )
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Usuario no autenticado',
        },
        { status: 401 }
      )
    }
    
    const workspaceRepo = new WorkspaceRepository()
    
    // Use the authenticated user's agency ID
    const workspaceData = {
      agencyId: user.agencyId,
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

    console.log(`Creating workspace for agency: ${user.agencyId}`)
    const newWorkspace = workspaceRepo.create(workspaceData)

    return NextResponse.json({
      success: true,
      message: 'Espacio de trabajo creado exitosamente',
      data: newWorkspace,
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
})