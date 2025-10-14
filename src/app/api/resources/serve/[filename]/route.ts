import { NextRequest, NextResponse } from 'next/server'
import { ResourceStorage } from '../../../storage'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/resources/serve/[filename]
 * Serve uploaded resource files or return placeholder
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename

    // Try to find the resource in storage
    const resource = ResourceStorage.getByFilename(filename)

    if (resource) {
      // Try to read the file from disk
      const fullPath = path.join(process.cwd(), 'public', resource.filePath)
      
      if (fs.existsSync(fullPath)) {
        const fileBuffer = fs.readFileSync(fullPath)
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': resource.mimeType,
            'Cache-Control': 'public, max-age=3600',
            'Content-Length': fileBuffer.length.toString(),
          },
        })
      }
    }

    // If no file found, return a placeholder
    const svgPlaceholder = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="35%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
          ${resource ? resource.name : 'Recurso'}
        </text>
        <text x="50%" y="50%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">
          ${resource ? resource.type.toUpperCase() : 'ARCHIVO'}
        </text>
        <text x="50%" y="65%" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">
          ${filename}
        </text>
        <rect x="50%" y="75%" width="80" height="20" rx="4" fill="#e5e7eb" transform="translate(-40, 0)"/>
        <text x="50%" y="87%" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">
          ${resource ? 'Archivo no encontrado' : 'No encontrado'}
        </text>
      </svg>
    `

    return new NextResponse(svgPlaceholder, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Serve resource error:', error)
    
    // Return a simple error placeholder
    const errorSvg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fef2f2"/>
        <text x="50%" y="50%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#dc2626">
          Error al cargar imagen
        </text>
      </svg>
    `

    return new NextResponse(errorSvg, {
      status: 200, // Return 200 to avoid broken image icons
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    })
  }
}