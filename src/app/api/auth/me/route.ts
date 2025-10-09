import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../middleware'

/**
 * GET /api/auth/me
 * Get current authenticated user information
 */
export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const { user } = req

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      return successResponse(
        user,
        'Información del usuario obtenida exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)