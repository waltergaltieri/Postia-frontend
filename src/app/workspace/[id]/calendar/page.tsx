'use client'

import { WorkspaceLayout } from '@/layouts'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import { EventClickArg, EventInput } from '@fullcalendar/core'
import { HiCalendar, HiFilter, HiRefresh } from 'react-icons/hi'
import { Button } from '@/components/common'
import { PublicationDetailModal, CalendarFilters, CalendarFilterOptions } from '@/components/calendar'
import { toast } from 'react-hot-toast'
import '@/styles/calendar.css'

// No mock data - using real API data

export default function CalendarPage() {
  const params = useParams()
  const workspaceId = params.id as string
  const { currentWorkspace, switchWorkspace, workspaces } = useWorkspace()
  const [selectedEvent, setSelectedEvent] = useState<EventInput | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [calendarView, setCalendarView] = useState('dayGridMonth')
  const [events, setEvents] = useState<EventInput[]>([])
  const [isCalendarLoading, setIsCalendarLoading] = useState(true)
  const [filters, setFilters] = useState<CalendarFilterOptions>({})
  const calendarRef = useRef<FullCalendar>(null)

  // Ensure we have the correct workspace selected
  useEffect(() => {
    if (
      workspaceId &&
      (!currentWorkspace || currentWorkspace.id !== workspaceId)
    ) {
      const workspace = workspaces.find(w => w.id === workspaceId)
      if (workspace) {
        switchWorkspace(workspaceId)
      }
    }
  }, [workspaceId, currentWorkspace, switchWorkspace, workspaces])

  // Load calendar events from API
  useEffect(() => {
    const loadCalendarEvents = async () => {
      if (!currentWorkspace) return

      setIsCalendarLoading(true)
      try {
        // Build query parameters with filters
        const queryParams = new URLSearchParams({
          workspaceId: currentWorkspace.id
        })
        
        if (filters.socialNetworks?.length) {
          queryParams.append('socialNetwork', filters.socialNetworks.join(','))
        }
        if (filters.generationStatus?.length) {
          queryParams.append('generationStatus', filters.generationStatus.join(','))
        }
        if (filters.status?.length) {
          queryParams.append('status', filters.status.join(','))
        }
        if (filters.campaignId) {
          queryParams.append('campaignId', filters.campaignId)
        }

        const response = await fetch(`/api/calendar?${queryParams.toString()}`)
        const data = await response.json()

        if (data.success && data.data) {
          // Transform API data to FullCalendar events
          const calendarEvents: EventInput[] = data.data.flatMap((day: any) => 
            day.publications.map((publication: any) => ({
              id: publication.id,
              title: `${getSocialNetworkIcon(publication.socialNetwork)} ${publication.campaignName || 'Publicación'}`,
              start: publication.scheduledDate,
              end: new Date(new Date(publication.scheduledDate).getTime() + 30 * 60000).toISOString(),
              backgroundColor: getSocialNetworkColor(publication.socialNetwork),
              borderColor: getSocialNetworkColor(publication.socialNetwork),
              className: `fc-event-${publication.socialNetwork} ${publication.generationStatus === 'completed' ? 'fc-event-ai-generated' : ''}`,
              extendedProps: {
                socialNetwork: publication.socialNetwork,
                campaignName: publication.campaignName,
                content: publication.content,
                imageUrl: publication.imageUrl || '/api/placeholder/400/400',
                status: publication.status,
                templateId: publication.templateId,
                resourceId: publication.resourceId,
                // AI Generation fields
                generatedText: publication.generatedText,
                generatedImageUrls: publication.generatedImageUrls,
                generationStatus: publication.generationStatus,
                generationMetadata: publication.generationMetadata,
                campaignGenerationStatus: publication.campaignGenerationStatus,
              },
            }))
          )

          setEvents(calendarEvents)
        } else {
          setEvents([])
        }
      } catch (error) {
        console.error('Error loading calendar events:', error)
        toast.error('Error al cargar eventos del calendario')
        setEvents([])
      } finally {
        setIsCalendarLoading(false)
      }
    }

    loadCalendarEvents()
  }, [currentWorkspace, filters])

  const getSocialNetworkColor = (network: string) => {
    switch (network) {
      case 'instagram':
        return '#e1306c'
      case 'facebook':
        return '#1877f2'
      case 'linkedin':
        return '#0a66c2'
      case 'twitter':
        return '#1da1f2'
      default:
        return '#6b7280'
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">
            Cargando espacio de trabajo...
          </p>
        </div>
      </div>
    )
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start?.toISOString(),
      end: event.end?.toISOString(),
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      extendedProps: event.extendedProps,
    })
    setIsModalOpen(true)
  }

  const handleEventUpdate = (eventId: string, updates: Partial<EventInput>) => {
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId ? { ...event, ...updates } : event
      )
    )
  }

  const handleRefresh = async () => {
    if (!currentWorkspace) return

    setIsCalendarLoading(true)
    try {
      const response = await fetch(`/api/calendar?workspaceId=${currentWorkspace.id}`)
      const data = await response.json()

      if (data.success && data.data) {
        const calendarEvents: EventInput[] = data.data.flatMap((day: any) => 
          day.publications.map((publication: any) => ({
            id: publication.id,
            title: `${getSocialNetworkIcon(publication.socialNetwork)} ${publication.campaignName || 'Publicación'}`,
            start: publication.scheduledDate,
            end: new Date(new Date(publication.scheduledDate).getTime() + 30 * 60000).toISOString(),
            backgroundColor: getSocialNetworkColor(publication.socialNetwork),
            borderColor: getSocialNetworkColor(publication.socialNetwork),
            className: `fc-event-${publication.socialNetwork} ${publication.generationStatus === 'completed' ? 'fc-event-ai-generated' : ''}`,
            extendedProps: {
              socialNetwork: publication.socialNetwork,
              campaignName: publication.campaignName,
              content: publication.content,
              imageUrl: publication.imageUrl || '/api/placeholder/400/400',
              status: publication.status,
              templateId: publication.templateId,
              resourceId: publication.resourceId,
              // AI Generation fields
              generatedText: publication.generatedText,
              generatedImageUrls: publication.generatedImageUrls,
              generationStatus: publication.generationStatus,
              generationMetadata: publication.generationMetadata,
              campaignGenerationStatus: publication.campaignGenerationStatus,
            },
          }))
        )

        setEvents(calendarEvents)
        toast.success('Calendario actualizado')
      } else {
        setEvents([])
        toast.success('Calendario actualizado - Sin eventos')
      }
    } catch (error) {
      console.error('Error refreshing calendar:', error)
      toast.error('Error al actualizar el calendario')
    } finally {
      setIsCalendarLoading(false)
    }
  }

  const handleViewChange = (view: string) => {
    setIsCalendarLoading(true)
    setCalendarView(view)
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      calendarApi.changeView(view)
      // Simulate loading time for better UX
      setTimeout(() => setIsCalendarLoading(false), 300)
    } else {
      setIsCalendarLoading(false)
    }
  }

  const getSocialNetworkIcon = (network: string) => {
    switch (network) {
      case 'instagram':
        return '📷'
      case 'facebook':
        return '📘'
      case 'linkedin':
        return '💼'
      case 'twitter':
        return '🐦'
      default:
        return '📱'
    }
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId}>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-secondary-900 flex items-center gap-3">
                  <HiCalendar className="h-8 w-8 text-primary-600" />
                  Calendario de Publicaciones
                </h1>
                <p className="text-secondary-600 mt-2">
                  Gestiona y programa tus publicaciones en redes sociales
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleRefresh}
                  variant="secondary"
                  size="sm"
                  icon={<HiRefresh className="h-4 w-4" />}
                >
                  Actualizar
                </Button>
                <CalendarFilters
                  currentFilters={filters}
                  onFiltersChange={setFilters}
                />
              </div>
            </div>
          </div>

          {/* Calendar Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-secondary-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <HiCalendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">
                    Publicaciones Programadas
                  </p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {events.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-secondary-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-green-600 text-lg">📅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">
                    Esta Semana
                  </p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {(() => {
                      const now = new Date()
                      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
                      const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6))
                      return events.filter(event => {
                        const eventDate = new Date(event.start as string)
                        return eventDate >= weekStart && eventDate <= weekEnd
                      }).length
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-secondary-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-purple-600 text-lg">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">
                    Campañas Activas
                  </p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {new Set(events.map(event => event.extendedProps?.campaignName).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-secondary-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <span className="text-orange-600 text-lg">🎯</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">
                    Redes Conectadas
                  </p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {new Set(events.map(event => event.extendedProps?.socialNetwork).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Container */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-secondary-900">
                Vista de Calendario
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleViewChange('dayGridMonth')}
                  variant={
                    calendarView === 'dayGridMonth' ? 'primary' : 'secondary'
                  }
                  size="sm"
                  disabled={isCalendarLoading}
                >
                  Mes
                </Button>
                <Button
                  onClick={() => handleViewChange('timeGridWeek')}
                  variant={
                    calendarView === 'timeGridWeek' ? 'primary' : 'secondary'
                  }
                  size="sm"
                  disabled={isCalendarLoading}
                >
                  Semana
                </Button>
                <Button
                  onClick={() => handleViewChange('timeGridDay')}
                  variant={
                    calendarView === 'timeGridDay' ? 'primary' : 'secondary'
                  }
                  size="sm"
                  disabled={isCalendarLoading}
                >
                  Día
                </Button>
              </div>
            </div>

            <div className={`calendar-container relative ${isCalendarLoading ? 'opacity-60 pointer-events-none' : ''}`}>
              {isCalendarLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    <span className="text-sm text-secondary-600">Cargando calendario...</span>
                  </div>
                </div>
              )}
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin]}
                initialView={calendarView}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: '',
                }}
                events={events}
                eventClick={handleEventClick}
                height="auto"
                locale="es"
                firstDay={1} // Monday
                eventDisplay="block"
                dayMaxEvents={3}
                moreLinkClick="popover"
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }}
                slotLabelFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }}
                eventClassNames="cursor-pointer"
                dayCellClassNames="hover:bg-secondary-50 transition-colors"
                viewClassNames="modern-calendar"
              />

              {/* Empty state when no events */}
              {!isCalendarLoading && events.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
                  <div className="text-center py-12">
                    <div className="mx-auto h-12 w-12 text-secondary-400 mb-4">
                      <HiCalendar className="h-12 w-12" />
                    </div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-2">
                      No hay publicaciones programadas
                    </h3>
                    <p className="text-secondary-600 mb-4">
                      Crea una campaña para empezar a programar publicaciones en tu calendario
                    </p>
                    <Button
                      onClick={() => window.location.href = `/workspace/${workspaceId}/campaigns`}
                      variant="primary"
                    >
                      Crear Campaña
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Leyenda de Redes Sociales
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded instagram-gradient"></div>
                <span className="text-sm text-secondary-700">📷 Instagram</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-[#1877f2]"></div>
                <span className="text-sm text-secondary-700">📘 Facebook</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-[#0a66c2]"></div>
                <span className="text-sm text-secondary-700">💼 LinkedIn</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-[#1da1f2]"></div>
                <span className="text-sm text-secondary-700">🐦 Twitter</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Publication Detail Modal */}
      <PublicationDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedEvent(null)
        }}
        event={selectedEvent}
        onEventUpdate={handleEventUpdate}
      />
    </WorkspaceLayout>
  )
}
