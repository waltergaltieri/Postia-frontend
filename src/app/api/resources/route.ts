import { NextRequest, NextResponse } from 'next/server'
import { ResourceStorage } from './storage'

/**
 * GET /api/resources
 * Get resources for a workspace
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Resources API called')
    
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    console.log('Resource filters:', { workspaceId, type, search })

    // Get resources from storage
    let filteredResources = workspaceId 
      ? ResourceStorage.getByWorkspace(workspaceId)
      : ResourceStorage.getAll()

    // Filter by type if specified
    if (type && type !== 'all') {
      filteredResources = filteredResources.filter(r => r.type === type)
    }

    return NextResponse.json({
      success: true,
      message: 'Recursos obtenidos exitosamente',
      data: filteredResources,
    })
  } catch (error) {
    console.error('Resources API error:', error)
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
 * POST /api/resources
 * Upload new resources
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const workspaceId = formData.get('workspaceId') as string
    const files = formData.getAll('files') as File[]

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId es requerido',
        },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No se han proporcionado archivos',
        },
        { status: 400 }
      )
    }

    // Process each file and create resources
    const uploadedResources = []
    
    for (const file of files) {
      // Validate file type
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        continue // Skip unsupported files
      }

      // Create resource data
      const resourceId = `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Save file to disk
      const filePath = await ResourceStorage.saveFile(file, resourceId)
      
      const resource = {
        id: resourceId,
        workspaceId: workspaceId,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        originalName: file.name,
        filePath: filePath,
        url: filePath, // Direct path to file in public folder
        type: isImage ? 'image' : 'video' as 'image' | 'video',
        mimeType: file.type,
        sizeBytes: file.size,
        width: isImage ? 1080 : null,
        height: isImage ? 1080 : null,
        durationSeconds: isVideo ? 30 : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Store the resource metadata
      ResourceStorage.add(resource)
      uploadedResources.push(resource)
    }

    if (uploadedResources.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No se pudieron procesar los archivos. Solo se admiten imágenes y videos.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedResources.length} recurso(s) subido(s) exitosamente`,
      data: uploadedResources,
    }, { status: 201 })
  } catch (error) {
    console.error('Upload resource API error:', error)
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