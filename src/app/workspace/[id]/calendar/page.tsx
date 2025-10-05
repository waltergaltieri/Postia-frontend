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
import { PublicationDetailModal } from '@/components/calendar'
import { toast } from 'react-hot-toast'
import '@/styles/calendar.css'

// Mock data for publications
const mockPublications: EventInput[] = [
  {
    id: '1',
    title: '📷 Campaña Verano - Instagram',
    start: new Date(2025, 9, 15, 10, 0).toISOString(), // October 15, 2025, 10:00 AM
    end: new Date(2025, 9, 15, 10, 30).toISOString(),
    backgroundColor: '#e1306c',
    borderColor: '#e1306c',
    className: 'fc-event-instagram',
    extendedProps: {
      socialNetwork: 'instagram',
      campaignName: 'Campaña Verano 2025',
      content:
        'Descubre nuestra nueva colección de verano. ¡Colores vibrantes y diseños únicos te esperan! 🌞',
      imageUrl: '/api/placeholder/400/400',
      status: 'scheduled',
      templateId: 'template-1',
      resourceId: 'resource-1',
    },
  },
  {
    id: '2',
    title: '📘 Promoción Especial - Facebook',
    start: new Date(2025, 9, 16, 14, 0).toISOString(), // October 16, 2025, 2:00 PM
    end: new Date(2025, 9, 16, 14, 30).toISOString(),
    backgroundColor: '#1877f2',
    borderColor: '#1877f2',
    className: 'fc-event-facebook',
    extendedProps: {
      socialNetwork: 'facebook',
      campaignName: 'Promoción Especial',
      content:
        '¡Oferta especial por tiempo limitado! 50% de descuento en productos seleccionados.',
      imageUrl: '/api/placeholder/400/400',
      status: 'scheduled',
      templateId: 'template-2',
      resourceId: 'resource-2',
    },
  },
  {
    id: '3',
    title: '💼 Contenido Corporativo - LinkedIn',
    start: new Date(2025, 9, 17, 9, 0).toISOString(), // October 17, 2025, 9:00 AM
    end: new Date(2025, 9, 17, 9, 30).toISOString(),
    backgroundColor: '#0a66c2',
    borderColor: '#0a66c2',
    className: 'fc-event-linkedin',
    extendedProps: {
      socialNetwork: 'linkedin',
      campaignName: 'Contenido Corporativo',
      content:
        'Innovación y excelencia: los pilares de nuestro crecimiento empresarial.',
      imageUrl: '/api/placeholder/400/400',
      status: 'scheduled',
      templateId: 'template-3',
      resourceId: 'resource-3',
    },
  },
  {
    id: '4',
    title: '🐦 Engagement Diario - Twitter',
    start: new Date(2025, 9, 18, 16, 0).toISOString(), // October 18, 2025, 4:00 PM
    end: new Date(2025, 9, 18, 16, 30).toISOString(),
    backgroundColor: '#1da1f2',
    borderColor: '#1da1f2',
    className: 'fc-event-twitter',
    extendedProps: {
      socialNetwork: 'twitter',
      campaignName: 'Engagement Diario',
      content:
        '¿Cuál es tu estrategia favorita para aumentar el engagement? Comparte tus tips 👇',
      imageUrl: '/api/placeholder/400/400',
      status: 'scheduled',
      templateId: 'template-4',
      resourceId: 'resource-4',
    },
  },
  {
    id: '5',
    title: '📷 Stories Diarias - Instagram',
    start: new Date(2025, 9, 20, 12, 0).toISOString(), // October 20, 2025, 12:00 PM
    end: new Date(2025, 9, 20, 12, 30).toISOString(),
    backgroundColor: '#e1306c',
    borderColor: '#e1306c',
    className: 'fc-event-instagram',
    extendedProps: {
      socialNetwork: 'instagram',
      campaignName: 'Stories Diarias',
      content: 'Contenido detrás de cámaras y momentos especiales 📸',
      imageUrl: '/api/placeholder/400/400',
      status: 'scheduled',
      templateId: 'template-5',
      resourceId: 'resource-5',
    },
  },
  {
    id: '6',
    title: '💼 Networking Event - LinkedIn',
    start: new Date(2025, 9, 22, 15, 0).toISOString(), // October 22, 2025, 3:00 PM
    end: new Date(2025, 9, 22, 15, 30).toISOString(),
    backgroundColor: '#0a66c2',
    borderColor: '#0a66c2',
    className: 'fc-event-linkedin',
    extendedProps: {
      socialNetwork: 'linkedin',
      campaignName: 'Networking Professional',
      content: 'Únete a nuestro evento de networking empresarial 🤝',
      imageUrl: '/api/placeholder/400/400',
      status: 'scheduled',
      templateId: 'template-6',
      resourceId: 'resource-6',
    },
  },
]

export default function CalendarPage() {
  const params = useParams()
  const workspaceId = params.id as string
  const { currentWorkspace, switchWorkspace, workspaces } = useWorkspace()
  const [selectedEvent, setSelectedEvent] = useState<EventInput | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [calendarView, setCalendarView] = useState('dayGridMonth')
  const [events, setEvents] = useState<EventInput[]>(mockPublications)
  const [isCalendarLoading, setIsCalendarLoading] = useState(false)
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

  const handleRefresh = () => {
    setIsCalendarLoading(true)
    // In a real app, this would fetch fresh data from the API
    setTimeout(() => {
      setIsCalendarLoading(false)
      toast.success('Calendario actualizado')
    }, 1000)
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
                <Button
                  onClick={() =>
                    toast('Filtros disponibles próximamente', { icon: 'ℹ️' })
                  }
                  variant="secondary"
                  size="sm"
                  icon={<HiFilter className="h-4 w-4" />}
                >
                  Filtros
                </Button>
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
                  <p className="text-2xl font-bold text-secondary-900">4</p>
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
                  <p className="text-2xl font-bold text-secondary-900">3</p>
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
                  <p className="text-2xl font-bold text-secondary-900">4</p>
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
