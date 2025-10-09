import { NextRequest, NextResponse } from 'next/server'
import { WorkspaceService } from '@/lib/database/services'
import { UpdateWorkspaceData } from '@/lib/database/types'

export async function PATCH(req: NextRequest) {
  try {
    console.log('DEBUG DIRECT: Starting workspace update test...')
    
    // Parse the request body
    const body = await req.json()
    console.log('DEBUG DIRECT: Request body:', JSON.stringify(body, null, 2))
    
    // Create workspace service
    console.log('DEBUG DIRECT: Creating WorkspaceService...')
    const workspaceService = new WorkspaceService()
    console.log('DEBUG DIRECT: WorkspaceService created')
    
    // Prepare update data
    const updateData: UpdateWorkspaceData = {
      name: body.name,
      branding: body.branding,
    }
    console.log('DEBUG DIRECT: Update data:', JSON.stringify(updateData, null, 2))
    
    // Try to update workspace with mock data
    const workspaceId = 'workspace-001'
    const agencyId = 'agency-001'
    
    console.log('DEBUG DIRECT: Calling updateWorkspace with:', { workspaceId, agencyId })
    
    const updatedWorkspace = workspaceService.updateWorkspace(
      workspaceId,
      updateData,
      agencyId
    )
    
    console.log('DEBUG DIRECT: Update successful:', updatedWorkspace?.id)
    
    return NextResponse.json({
      success: true,
      data: updatedWorkspace,
      message: 'Direct workspace update successful'
    })
    
  } catch (error) {
    console.error('DEBUG DIRECT: Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Direct workspace update failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}