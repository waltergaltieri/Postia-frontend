import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/database/services'
import { handleApiError, successResponse } from '../middleware'

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
        { error: 'Email y contraseña son requeridos', success: false },
        { status: 400 }
      )
    }

    // Authenticate user
    const user = AuthService.authenticate(email, password)

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', success: false },
        { status: 401 }
      )
    }

    // Generate mock JWT token (in production, use proper JWT)
    const token = `mock_jwt_token_${user.id}`

    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          agencyId: user.agencyId,
          role: user.role,
        },
        token,
      },
      'Inicio de sesión exitoso'
    )
  } catch (error) {
    return handleApiError(error)
  }
}