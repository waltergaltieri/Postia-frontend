import { NextRequest, NextResponse } from 'next/server'
import { CalendarService } from '@/lib/database/services/CalendarService'
import { withAuth, AuthenticatedRequest, handleApiError, successResponse } from '../auth/middleware'

/**
 * GET /api/calendar
 * Get calendar events/publications for a workspace with AI-generated content support
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req
    const { searchParams } = new URL(req.url)
    
    const workspaceId = searchParams.get('workspaceId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const campaignId = searchParams.get('campaignId')
    const generationStatus = searchParams.get('generationStatus')
    const socialNetwork = searchParams.get('socialNetwork')
    const status = searchParams.get('status')

    if (!user?.agencyId) {
      throw new Error('Usuario no autenticado')
    }

    if (!workspaceId) {
      throw new Error('workspaceId es requerido')
    }

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date()
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

    // Build filters for AI-generated content
    const filters: any = {}
    
    if (campaignId) {
      filters.campaignIds = [campaignId]
    }
    
    if (socialNetwork) {
      filters.socialNetworks = [socialNetwork]
    }
    
    if (status) {
      filters.statuses = [status]
    }

    // Get calendar data with AI content support
    const calendarData = await CalendarService.getCalendarRange(
      user.agencyId,
      start,
      end,
      filters
    )

    // Enhance publications with AI generation data
    const enhancedData = calendarData.map(day => ({
      ...day,
      publications: day.publications.map(pub => ({
        ...pub,
        // Add AI generation fields if they exist
        generatedText: (pub as any).generatedText,
        generatedImageUrls: (pub as any).generatedImageUrls,
        generationStatus: (pub as any).generationStatus || 'pending',
        generationMetadata: (pub as any).generationMetadata,
        // Add campaign generation status for grouping
        campaignGenerationStatus: (pub as any).campaignGenerationStatus
      }))
    }))

    // Filter by generation status if specified
    let filteredData = enhancedData
    if (generationStatus) {
      filteredData = enhancedData.map(day => ({
        ...day,
        publications: day.publications.filter(pub => 
          pub.generationStatus === generationStatus
        ),
        publicationCount: day.publications.filter(pub => 
          pub.generationStatus === generationStatus
        ).length
      })).filter(day => day.publicationCount > 0)
    }

    return successResponse(filteredData, 'Eventos del calendario obtenidos exitosamente')
  } catch (error) {
    return handleApiError(error)
  }
})