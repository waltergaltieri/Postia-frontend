import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/me
 * Get current authenticated user information
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Auth me API called')
    
    const authHeader = req.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token de autorización requerido',
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    console.log('Token received:', token)

    // In a real application, you would validate the JWT token here
    // For now, we'll extract the user ID from the mock token
    const tokenParts = token.split('_')
    if (
      tokenParts.length < 4 ||
      tokenParts[0] !== 'mock' ||
      tokenParts[1] !== 'jwt' ||
      tokenParts[2] !== 'token'
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token inválido',
        },
        { status: 401 }
      )
    }

    const userId = tokenParts[3]
    console.log('User ID from token:', userId)

    // Return mock user data for now
    const mockUser = {
      id: userId,
      email: 'admin@agency.com',
      agencyId: 'agency-demo-001',
      role: 'admin',
      agency: {
        name: 'Demo Marketing Agency',
        plan: 'pro'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario obtenido exitosamente',
      data: mockUser,
    })
  } catch (error) {
    console.error('Auth verification error:', error)
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
