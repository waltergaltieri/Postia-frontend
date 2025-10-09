import { NextRequest, NextResponse } from 'next/server'
import { WorkspaceService } from '@/lib/database/services'
import { UpdateWorkspaceData } from '@/lib/database/types'

export async function PATCH(req: NextRequest) {
  try {
    console.log('TEST ENDPOINT: Starting workspace update test...')
    
    // Parse the request body
    const body = await req.json()
    console.log('TEST ENDPOINT: Request body:', JSON.stringify(body, null, 2))
    
    // Create workspace service
    console.log('TEST ENDPOINT: Creating WorkspaceService...')
    const workspaceService = new WorkspaceService()
    console.log('TEST ENDPOINT: WorkspaceService created')
    
    // Prepare update data
    const updateData: UpdateWorkspaceData = {
      name: body.name,
      branding: body.branding,
    }
    console.log('TEST ENDPOINT: Update data:', JSON.stringify(updateData, null, 2))
    
    // Try to update workspace with the actual IDs
    const workspaceId = 'workspace-001'
    const agencyId = 'agency-001'
    
    console.log('TEST ENDPOINT: Calling updateWorkspace with:', { workspaceId, agencyId })
    
    const updatedWorkspace = workspaceService.updateWorkspace(
      workspaceId,
      updateData,
      agencyId
    )
    
    console.log('TEST ENDPOINT: Update successful:', updatedWorkspace?.id)
    
    return NextResponse.json({
      success: true,
      data: updatedWorkspace,
      message: 'Test workspace update successful'
    })
    
  } catch (error) {
    console.error('TEST ENDPOINT: Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test workspace update failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}