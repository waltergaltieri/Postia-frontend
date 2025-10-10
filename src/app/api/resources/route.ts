import { NextRequest, NextResponse } from 'next/server'
import { ResourceRepository } from '@/lib/database/repositories/ResourceRepository'

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

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId es requerido',
        },
        { status: 400 }
      )
    }

    const resourceRepo = new ResourceRepository()
    let filteredResources

    // Get resources from database
    if (search) {
      filteredResources = resourceRepo.searchByName(workspaceId, search)
    } else if (type && type !== 'all') {
      filteredResources = resourceRepo.findByType(workspaceId, type as 'image' | 'video')
    } else {
      filteredResources = resourceRepo.findByWorkspaceId(workspaceId)
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

    // Get custom names from form data
    const customNames: string[] = []
    let nameIndex = 0
    while (formData.has(`names[${nameIndex}]`)) {
      customNames.push(formData.get(`names[${nameIndex}]`) as string)
      nameIndex++
    }

    const resourceRepo = new ResourceRepository()
    const uploadedResources = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file type
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        continue // Skip unsupported files
      }

      // Save file to disk (using existing storage utility)
      const filePath = await saveFileToUploads(file)
      
      // Use custom name if provided, otherwise use filename without extension
      const customName = customNames[i]
      const resourceName = customName || file.name.replace(/\.[^/.]+$/, '')
      
      const resourceData = {
        workspaceId: workspaceId,
        name: resourceName,
        originalName: file.name,
        filePath: filePath,
        url: filePath, // Direct path to file in public folder
        type: isImage ? 'image' : 'video' as 'image' | 'video',
        mimeType: file.type,
        sizeBytes: file.size,
        width: isImage ? 1080 : undefined,
        height: isImage ? 1080 : undefined,
        durationSeconds: isVideo ? 30 : undefined,
      }

      // Store the resource in database
      const resource = resourceRepo.create(resourceData)
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

// Helper function to save file to uploads directory
async function saveFileToUploads(file: File): Promise<string> {
  const fs = require('fs')
  const path = require('path')
  
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
  
  const fileExtension = file.name.split('.').pop()
  const fileName = `resource-${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExtension}`
  const filePath = `/uploads/${fileName}`
  const fullPath = path.join(uploadsDir, fileName)
  
  // Convert file to buffer and save
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  fs.writeFileSync(fullPath, buffer)
  
  return filePath
}