import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email y contraseña son requeridos',
        },
        { status: 400 }
      )
    }

    // For now, just check if it's the expected credentials
    if (email === 'admin@agency.com' && password === 'password123') {
      const mockUser = {
        id: 'user-admin-001',
        email: 'admin@agency.com',
        agencyId: 'agency-demo-001',
        role: 'admin',
        createdAt: new Date(),
      }

      const token = `mock_jwt_token_${mockUser.id}_${Date.now()}`

      return NextResponse.json({
        success: true,
        message: 'Autenticación exitosa',
        data: {
          user: mockUser,
          token,
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Credenciales inválidas',
      },
      { status: 401 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
