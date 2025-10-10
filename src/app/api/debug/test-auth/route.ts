import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/app/api/auth/middleware'
import { WorkspaceRepository } from '@/lib/database/repositories/WorkspaceRepository'

/**
 * GET /api/debug/test-auth
 * Test authentication and workspace retrieval
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    console.log('Debug test-auth called')
    
    const { user } = req
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'No user in request',
      }, { status: 401 })
    }
    
    console.log('User from middleware:', user)
    
    // Test workspace repository
    const workspaceRepo = new WorkspaceRepository()
    const workspaces = workspaceRepo.findByAgencyId(user.agencyId)
    
    console.log(`Found ${workspaces.length} workspaces for agency ${user.agencyId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Debug test successful',
      data: {
        user,
        workspaces,
        workspaceCount: workspaces.length
      }
    })
  } catch (error) {
    console.error('Debug test-auth error:', error)
    return NextResponse.json({
      success: false,
      message: 'Debug test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
})

/**
 * POST /api/debug/test-auth
 * Test workspace creation
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    console.log('Debug test-auth POST called')
    
    const body = await req.json()
    const { user } = req
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'No user in request',
      }, { status: 401 })
    }
    
    console.log('User from middleware:', user)
    console.log('Request body:', body)
    
    // Test workspace creation
    const workspaceRepo = new WorkspaceRepository()
    
    const workspaceData = {
      agencyId: user.agencyId,
      name: body.name || 'Debug Test Workspace ' + Date.now(),
      branding: {
        primaryColor: '#9333ea',
        secondaryColor: '#737373',
        logo: '',
        slogan: 'Debug test',
        description: 'Debug test workspace',
        whatsapp: '',
      },
    }
    
    console.log('Creating workspace with data:', workspaceData)
    const newWorkspace = workspaceRepo.create(workspaceData)
    console.log('Created workspace:', newWorkspace)
    
    return NextResponse.json({
      success: true,
      message: 'Debug workspace creation successful',
      data: {
        user,
        createdWorkspace: newWorkspace
      }
    })
  } catch (error) {
    console.error('Debug test-auth POST error:', error)
    return NextResponse.json({
      success: false,
      message: 'Debug workspace creation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
})