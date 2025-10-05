import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { AuthService } from '@/lib/database/services'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    agencyId: string
    role: 'admin' | 'member'
  }
}

/**
 * Authentication middleware for API routes
 * Validates JWT tokens and extracts user information
 */
export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const headersList = headers()
      const authorization = headersList.get('authorization')

      if (!authorization || !authorization.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Token de autorización requerido', success: false },
          { status: 401 }
        )
      }

      const token = authorization.split(' ')[1]

      // Extract user ID from mock token (in production, use proper JWT verification)
      const tokenParts = token.split('_')
      if (
        tokenParts.length < 4 ||
        tokenParts[0] !== 'mock' ||
        tokenParts[1] !== 'jwt' ||
        tokenParts[2] !== 'token'
      ) {
        return NextResponse.json(
          { error: 'Token inválido', success: false },
          { status: 401 }
        )
      }

      const userId = tokenParts[3]

      // Get user from database
      const user = AuthService.getUserById(userId)

      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado', success: false },
          { status: 401 }
        )
      }

      // Add user to request
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = {
        id: user.id,
        email: user.email,
        agencyId: user.agencyId,
        role: user.role,
      }

      return handler(authenticatedReq)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Token inválido', success: false },
        { status: 401 }
      )
    }
  }
}

/**
 * Authorization middleware to check workspace access
 */
export function withWorkspaceAuth(
  workspaceId: string,
  agencyId: string
): boolean {
  // TODO: Implement proper workspace authorization
  // For now, return true for development
  return true
}

/**
 * Error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  if (error instanceof Error) {
    // Handle known error types
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 404 }
      )
    }

    if (error.message.includes('validation')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 400 }
      )
    }

    if (error.message.includes('unauthorized')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 403 }
      )
    }
  }

  return NextResponse.json(
    { error: 'Error interno del servidor', success: false },
    { status: 500 }
  )
}

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T,
  message: string = 'Operación exitosa',
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      data,
      message,
      success: true,
    },
    { status }
  )
}

/**
 * Paginated response helper
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  },
  message: string = 'Datos obtenidos exitosamente'
): NextResponse {
  return NextResponse.json({
    data,
    pagination,
    message,
    success: true,
  })
}
