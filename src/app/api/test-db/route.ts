import { NextRequest, NextResponse } from 'next/server'
import { WorkspaceRepository } from '@/lib/database/repositories/WorkspaceRepository'

/**
 * GET /api/test-db
 * Test database connection and workspace creation
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Testing database connection...')
    
    const workspaceRepo = new WorkspaceRepository()
    
    // Test creating a workspace
    const testWorkspace = {
      agencyId: 'agency-demo-001',
      name: 'Test Workspace ' + Date.now(),
      branding: {
        primaryColor: '#9333ea',
        secondaryColor: '#737373',
        logo: '',
        slogan: 'Test slogan',
        description: 'Test description',
        whatsapp: '',
      },
    }

    console.log('Creating test workspace:', testWorkspace)
    const newWorkspace = workspaceRepo.create(testWorkspace)
    console.log('Created workspace:', newWorkspace)

    // Test listing workspaces
    const workspaces = workspaceRepo.findByAgencyId('agency-demo-001')
    console.log('Found workspaces:', workspaces.length)

    return NextResponse.json({
      success: true,
      message: 'Database test successful',
      data: {
        createdWorkspace: newWorkspace,
        totalWorkspaces: workspaces.length,
        allWorkspaces: workspaces
      },
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Database test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/test-db
 * Test workspace creation with custom data
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Testing workspace creation with POST...')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const workspaceRepo = new WorkspaceRepository()
    
    const workspaceData = {
      agencyId: 'agency-demo-001',
      name: body.name || 'Test Workspace ' + Date.now(),
      branding: {
        primaryColor: body.branding?.primaryColor || '#9333ea',
        secondaryColor: body.branding?.secondaryColor || '#737373',
        logo: body.branding?.logo || '',
        slogan: body.branding?.slogan || '',
        description: body.branding?.description || '',
        whatsapp: body.branding?.whatsapp || '',
      },
    }

    console.log('Creating workspace with data:', workspaceData)
    const newWorkspace = workspaceRepo.create(workspaceData)
    console.log('Successfully created workspace:', newWorkspace)

    return NextResponse.json({
      success: true,
      message: 'Workspace created successfully',
      data: newWorkspace,
    }, { status: 201 })
  } catch (error) {
    console.error('Workspace creation error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Workspace creation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}