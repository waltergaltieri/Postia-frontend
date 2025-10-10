import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth-simple/me
 * Get current user information (temporary simple version)
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Auth Simple Me API called')
    
    // Return a mock user for now
    const mockUser = {
      id: 'user-1760035323771',
      email: 'admin-dcr96g@miagencia.com',
      agencyId: 'agency-1760035323771',
      role: 'admin'
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario obtenido exitosamente',
      data: mockUser,
    })
  } catch (error) {
    console.error('Auth Simple Me API error:', error)
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