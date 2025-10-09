import { NextRequest, NextResponse } from 'next/server'
import { WorkspaceService } from '@/lib/database/services'
import { CreateWorkspaceData } from '@/lib/database/types'

export async function POST(req: NextRequest) {
  try {
    console.log('DEBUG CREATE: Starting workspace creation...')
    
    const body = await req.json()
    const { name, agencyId } = body
    
    console.log('DEBUG CREATE: Request data:', { name, agencyId })
    
    // Create workspace service
    const workspaceService = new WorkspaceService()
    
    // Prepare workspace data
    const workspaceData: CreateWorkspaceData = {
      agencyId: agencyId || 'agency-001', // Use provided or default agency
      name: name || 'Nuevo Espacio de Trabajo',
      branding: {
        primaryColor: '#9333ea',
        secondaryColor: '#737373',
        logo: '',
        slogan: '',
        description: '',
        whatsapp: ''
      }
    }
    
    console.log('DEBUG CREATE: Creating workspace with data:', JSON.stringify(workspaceData, null, 2))
    
    // Create the workspace
    const newWorkspace = workspaceService.createWorkspace(workspaceData, 'user-001')
    
    console.log('DEBUG CREATE: Workspace created successfully:', newWorkspace.id)
    
    return NextResponse.json({
      success: true,
      data: newWorkspace,
      message: 'Workspace created successfully'
    })
    
  } catch (error) {
    console.error('DEBUG CREATE: Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Workspace creation failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}