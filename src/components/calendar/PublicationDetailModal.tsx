'use client'

import React, { useState } from 'react'
import { Modal, Button } from '@/components/common'
import { EventInput } from '@fullcalendar/core'
import {
  HiCalendar,
  HiClock,
  HiPhotograph,
  HiTemplate,
  HiRefresh,
  HiPlay,
  HiX,
  HiPencil,
} from 'react-icons/hi'
import { toast } from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PublicationDetailModalProps {
  isOpen: boolean
  onClose: () => void
  event: EventInput | null
  onEventUpdate?: (eventId: string, updates: Partial<EventInput>) => void
}

export function PublicationDetailModal({
  isOpen,
  onClose,
  event,
  onEventUpdate,
}: PublicationDetailModalProps) {
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [newDate, setNewDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (!event) return null

  const { extendedProps } = event
  const socialNetwork = extendedProps?.socialNetwork || 'unknown'
  const campaignName = extendedProps?.campaignName || 'Sin campaña'
  const content = extendedProps?.content || 'Sin contenido'
  const imageUrl = extendedProps?.imageUrl || '/api/placeholder/400/400'
  const status = extendedProps?.status || 'scheduled'

  const getSocialNetworkInfo = (network: string) => {
    switch (network) {
      case 'instagram':
        return { name: 'Instagram', icon: '📷', color: 'bg-purple-600' }
      case 'facebook':
        return { name: 'Facebook', icon: '📘', color: 'bg-blue-600' }
      case 'linkedin':
        return { name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' }
      case 'twitter':
        return { name: 'Twitter', icon: '🐦', color: 'bg-sky-500' }
      default:
        return { name: 'Red Social', icon: '📱', color: 'bg-gray-600' }
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { label: 'Programada', color: 'bg-blue-100 text-blue-800' }
      case 'published':
        return { label: 'Publicada', color: 'bg-green-100 text-green-800' }
      case 'failed':
        return { label: 'Fallida', color: 'bg-red-100 text-red-800' }
      case 'cancelled':
        return { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' }
      default:
        return { label: 'Desconocido', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const socialInfo = getSocialNetworkInfo(socialNetwork)
  const statusInfo = getStatusInfo(status)

  const handlePublishNow = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      toast.success('¡Publicación enviada exitosamente!')

      // Update event status
      if (onEventUpdate && event.id) {
        onEventUpdate(event.id, {
          ...event,
          extendedProps: {
            ...extendedProps,
            status: 'published',
          },
        })
      }

      onClose()
    } catch (error) {
      toast.error('Error al publicar. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setIsLoading(true)
    try {
      // Simulate AI regeneration
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Contenido regenerado con IA')

      // In a real app, this would update the content
      const newContent =
        'Nuevo contenido generado por IA con base en el prompt original. ¡Descubre las últimas tendencias! ✨'

      if (onEventUpdate && event.id) {
        onEventUpdate(event.id, {
          ...event,
          extendedProps: {
            ...extendedProps,
            content: newContent,
          },
        })
      }
    } catch (error) {
      toast.error('Error al regenerar contenido')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!newDate) {
      toast.error('Selecciona una nueva fecha')
      return
    }

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (onEventUpdate && event.id && newDate) {
        onEventUpdate(event.id, {
          ...event,
          start: newDate.toISOString(),
          end: new Date(newDate.getTime() + 30 * 60000).toISOString(), // Add 30 minutes
        })
      }

      toast.success('Publicación reprogramada exitosamente')
      setIsRescheduling(false)
      setNewDate(null)
      onClose()
    } catch (error) {
      toast.error('Error al reprogramar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800))

      if (onEventUpdate && event.id) {
        onEventUpdate(event.id, {
          ...event,
          extendedProps: {
            ...extendedProps,
            status: 'cancelled',
          },
        })
      }

      toast.success('Publicación cancelada')
      onClose()
    } catch (error) {
      toast.error('Error al cancelar publicación')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles de Publicación"
      size="lg"
    >
      <div className="p-6">
        {/* Header with social network and status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${socialInfo.color} flex items-center justify-center text-white text-lg`}
            >
              {socialInfo.icon}
            </div>
            <div>
              <h3 className="font-semibold text-secondary-900">
                {socialInfo.name}
              </h3>
              <p className="text-sm text-secondary-600">{campaignName}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Publication preview */}
        <div className="bg-secondary-50 rounded-lg p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <img
                src={imageUrl}
                alt="Vista previa"
                className="w-20 h-20 rounded-lg object-cover border border-secondary-200"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-secondary-900 mb-2">Contenido</h4>
              <p className="text-sm text-secondary-700 leading-relaxed">
                {content}
              </p>
            </div>
          </div>
        </div>

        {/* Schedule info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-secondary-200">
            <HiCalendar className="h-5 w-5 text-secondary-500" />
            <div>
              <p className="text-sm font-medium text-secondary-900">Fecha</p>
              <p className="text-sm text-secondary-600">
                {event.start
                  ? format(new Date(event.start.toString()), 'dd/MM/yyyy', {
                      locale: es,
                    })
                  : 'No definida'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-secondary-200">
            <HiClock className="h-5 w-5 text-secondary-500" />
            <div>
              <p className="text-sm font-medium text-secondary-900">Hora</p>
              <p className="text-sm text-secondary-600">
                {event.start
                  ? format(new Date(event.start.toString()), 'HH:mm', {
                      locale: es,
                    })
                  : 'No definida'}
              </p>
            </div>
          </div>
        </div>

        {/* Reschedule section */}
        {isRescheduling && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-3">
              Reprogramar Publicación
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Nueva fecha y hora
                </label>
                <DatePicker
                  selected={newDate}
                  onChange={date => setNewDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="dd/MM/yyyy HH:mm"
                  locale={es}
                  minDate={new Date()}
                  className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholderText="Selecciona fecha y hora"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleReschedule}
                  disabled={!newDate || isLoading}
                  loading={isLoading}
                  size="sm"
                >
                  Confirmar
                </Button>
                <Button
                  onClick={() => {
                    setIsRescheduling(false)
                    setNewDate(null)
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {status === 'scheduled' && (
            <>
              <Button
                onClick={handlePublishNow}
                loading={isLoading}
                icon={<HiPlay className="h-4 w-4" />}
                className="flex-1 sm:flex-none"
              >
                Publicar Ahora
              </Button>
              <Button
                onClick={handleRegenerate}
                variant="secondary"
                loading={isLoading}
                icon={<HiRefresh className="h-4 w-4" />}
                className="flex-1 sm:flex-none"
              >
                Regenerar
              </Button>
              <Button
                onClick={() => setIsRescheduling(!isRescheduling)}
                variant="secondary"
                icon={<HiPencil className="h-4 w-4" />}
                className="flex-1 sm:flex-none"
              >
                Reprogramar
              </Button>
              <Button
                onClick={handleCancel}
                variant="danger"
                loading={isLoading}
                icon={<HiX className="h-4 w-4" />}
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
            </>
          )}

          {status === 'published' && (
            <div className="w-full text-center py-4">
              <div className="inline-flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-sm font-medium">
                  Esta publicación ya fue enviada
                </span>
              </div>
            </div>
          )}

          {status === 'cancelled' && (
            <div className="w-full text-center py-4">
              <div className="inline-flex items-center gap-2 text-gray-600">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span className="text-sm font-medium">
                  Esta publicación fue cancelada
                </span>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="w-full">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  <span className="text-sm font-medium">
                    Error en la publicación
                  </span>
                </div>
                <p className="text-sm text-red-700">
                  La publicación falló. Puedes intentar publicar nuevamente o
                  reprogramarla.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handlePublishNow}
                  loading={isLoading}
                  icon={<HiPlay className="h-4 w-4" />}
                >
                  Reintentar
                </Button>
                <Button
                  onClick={() => setIsRescheduling(!isRescheduling)}
                  variant="secondary"
                  icon={<HiPencil className="h-4 w-4" />}
                >
                  Reprogramar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Technical details (collapsible) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-secondary-700 hover:text-secondary-900">
            Detalles técnicos
          </summary>
          <div className="mt-3 p-4 bg-secondary-50 rounded-lg text-sm text-secondary-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">ID de Template:</span>
                <br />
                {extendedProps?.templateId || 'N/A'}
              </div>
              <div>
                <span className="font-medium">ID de Recurso:</span>
                <br />
                {extendedProps?.resourceId || 'N/A'}
              </div>
            </div>
          </div>
        </details>
      </div>
    </Modal>
  )
}
