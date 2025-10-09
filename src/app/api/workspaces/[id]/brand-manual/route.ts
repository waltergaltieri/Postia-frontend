import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  successResponse,
  AuthenticatedRequest,
} from '../../../auth/middleware'
import { getBrandManualService } from '@/lib/database/services'
import { UpdateBrandManualData } from '@/lib/database/types'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/workspaces/[id]/brand-manual
 * Get brand manual for workspace (creates default if doesn't exist)
 */
export const GET = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id: workspaceId } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const brandManualService = getBrandManualService()

      const brandManual = brandManualService.getBrandManualForWorkspace(
        workspaceId,
        user.agencyId
      )

      return successResponse(
        brandManual,
        'Manual de marca obtenido exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)

/**
 * PUT /api/workspaces/[id]/brand-manual
 * Update brand manual for workspace
 */
export const PUT = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id: workspaceId } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const body = await req.json()

      // Validate required fields
      if (!body.brandVoice?.trim()) {
        throw new Error('El tono de voz de la marca es requerido')
      }

      if (!body.targetAudience?.trim()) {
        throw new Error('La audiencia objetivo es requerida')
      }

      const updateData: UpdateBrandManualData = {
        brandVoice: body.brandVoice,
        brandValues: body.brandValues || [],
        targetAudience: body.targetAudience,
        keyMessages: body.keyMessages || [],
        dosDonts: body.dosDonts || { dos: [], donts: [] },
        colorPalette: body.colorPalette || [],
        typography: body.typography
      }

      const brandManualService = getBrandManualService()

      const updatedBrandManual = brandManualService.updateBrandManualForWorkspace(
        workspaceId,
        updateData,
        user.agencyId
      )

      return successResponse(
        updatedBrandManual,
        'Manual de marca actualizado exitosamente'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)

/**
 * DELETE /api/workspaces/[id]/brand-manual
 * Reset brand manual to default values
 */
export const DELETE = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = req
      const { id: workspaceId } = params

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const brandManualService = getBrandManualService()

      const defaultBrandManual = brandManualService.resetToDefault(
        workspaceId,
        user.agencyId
      )

      return successResponse(
        defaultBrandManual,
        'Manual de marca restablecido a valores por defecto'
      )
    } catch (error) {
      return handleApiError(error)
    }
  }
)