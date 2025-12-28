'use client'

import React, { useState } from 'react'
import { Button } from '@/components/common'
import {
  HiCalendar,
  HiClock,
  HiRefresh,
  HiPlay,
  HiX,
  HiPencil,
  HiEye,
  HiSparkles,
} from 'react-icons/hi'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RegenerationModal } from '../calendar/RegenerationModal'

interface Publication {
  id: string
  campaignId: string
  campaignName: string
  socialNetwork: string
  content: string
  imageUrl?: string
  scheduledDate: string
  status: 'scheduled' | 'published' | 'failed' | 'cancelled'
  generatedText?: string
  generatedImageUrls?: string[]
  generationStatus: 'pending' | 'generating' | 'completed' | 'failed'
  generationMetadata?: {
    agentUsed: string
    processingTimeMs?: number
    retryCount?: number
    generationTime?: string
  }
}

interface PublicationListItemProps {
  publication: Publication
  onUpdate?: (publicationId: string, updates: Partial<Publication>) => void
  onDelete?: (publicationId: string) => void
}

export function PublicationListItem({
  publication,
  onUpdate,
  onDelete,
}: PublicationListItemProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showRegenerationModal, setShowRegenerationModal] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

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

  const getGenerationStatusInfo = (genStatus: string) => {
    switch (genStatus) {
      case 'pending':
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' }
      case 'generating':
        return { label: 'Generando', color: 'bg-blue-100 text-blue-800', icon: '🔄' }
      case 'completed':
        return { label: 'Generado', color: 'bg-green-100 text-green-800', icon: '✅' }
      case 'failed':
        return { label: 'Error', color: 'bg-red-100 text-red-800', icon: '❌' }
      default:
        return { label: 'Desconocido', color: 'bg-gray-100 text-gray-800', icon: '❓' }
    }
  }

  const handlePublishNow = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/publications/${publication.id}/publish`, {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('¡Publicación enviada exitosamente!')
        onUpdate?.(publication.id, { status: 'published' })
      } else {
        toast.error(data.message || 'Error al publicar')
      }
    } catch (error) {
      console.error('Error publishing:', error)
      toast.error('Error al publicar. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/publications/${publication.id}/cancel`, {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Publicación cancelada')
        onUpdate?.(publication.id, { status: 'cancelled' })
      } else {
        toast.error(data.message || 'Error al cancelar publicación')
      }
    } catch (error) {
      console.error('Error cancelling:', error)
      toast.error('Error al cancelar publicación')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEventUpdate = (eventId: string, updates: any) => {
    onUpdate?.(eventId, {
      content: updates.extendedProps?.content || updates.content,
      generatedText: updates.extendedProps?.generatedText,
      generatedImageUrls: updates.extendedProps?.generatedImageUrls,
      generationStatus: updates.extendedProps?.generationStatus,
      generationMetadata: updates.extendedProps?.generationMetadata,
    })
  }

  const socialInfo = getSocialNetworkInfo(publication.socialNetwork)
  const statusInfo = getStatusInfo(publication.status)
  const generationStatusInfo = getGenerationStatusInfo(publication.generationStatus)
  const canRegenerate = ['completed', 'failed'].includes(publication.generationStatus) && 
                       publication.status !== 'published'

  // Convert publication to event format for RegenerationModal
  const eventForModal = {
    id: publication.id,
    title: `${socialInfo.icon} ${publication.campaignName}`,
    start: publication.scheduledDate,
    extendedProps: {
      socialNetwork: publication.socialNetwork,
      campaignName: publication.campaignName,
      content: publication.content,
      imageUrl: publication.imageUrl,
      status: publication.status,
      generatedText: publication.generatedText,
      generatedImageUrls: publication.generatedImageUrls,
      generationStatus: publication.generationStatus,
      generationMetadata: publication.generationMetadata,
    },
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
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
              <p className="text-sm text-secondary-600">{publication.campaignName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${generationStatusInfo.color}`}
            >
              {generationStatusInfo.icon} {generationStatusInfo.label}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Content Preview */}
        <div className="mb-4">
          <div className="flex gap-4">
            {(publication.generatedImageUrls?.length || publication.imageUrl) && (
              <div className="flex-shrink-0">
                {publication.generatedImageUrls?.length ? (
                  <div className="space-y-1">
                    {publication.generatedImageUrls.slice(0, 2).map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Imagen generada ${index + 1}`}
                        className="w-16 h-16 rounded-lg object-cover border border-secondary-200"
                      />
                    ))}
                    {publication.generatedImageUrls.length > 2 && (
                      <div className="w-16 h-16 rounded-lg bg-secondary-200 border border-secondary-300 flex items-center justify-center text-xs text-secondary-600">
                        +{publication.generatedImageUrls.length - 2}
                      </div>
                    )}
                  </div>
                ) : (
                  <img
                    src={publication.imageUrl}
                    alt="Vista previa"
                    className="w-16 h-16 rounded-lg object-cover border border-secondary-200"
                  />
                )}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-secondary-900">Contenido</h4>
                {publication.generationStatus === 'completed' && publication.generatedText && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                    <HiSparkles className="h-3 w-3" />
                    IA
                  </span>
                )}
              </div>
              <p className="text-sm text-secondary-700 leading-relaxed line-clamp-3">
                {publication.generatedText || publication.content}
              </p>
            </div>
          </div>
        </div>

        {/* Schedule Info */}
        <div className="flex items-center gap-4 mb-4 text-sm text-secondary-600">
          <div className="flex items-center gap-2">
            <HiCalendar className="h-4 w-4" />
            <span>
              {format(new Date(publication.scheduledDate), 'dd/MM/yyyy', { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <HiClock className="h-4 w-4" />
            <span>
              {format(new Date(publication.scheduledDate), 'HH:mm', { locale: es })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="secondary"
              size="sm"
              icon={<HiEye className="h-4 w-4" />}
            >
              {showDetails ? 'Ocultar' : 'Ver'} Detalles
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {publication.status === 'scheduled' && (
              <>
                <Button
                  onClick={handlePublishNow}
                  loading={isLoading}
                  size="sm"
                  icon={<HiPlay className="h-4 w-4" />}
                >
                  Publicar
                </Button>
                {canRegenerate && (
                  <Button
                    onClick={() => setShowRegenerationModal(true)}
                    variant="secondary"
                    size="sm"
                    icon={<HiRefresh className="h-4 w-4" />}
                  >
                    Regenerar
                  </Button>
                )}
                <Button
                  onClick={handleCancel}
                  variant="danger"
                  size="sm"
                  icon={<HiX className="h-4 w-4" />}
                >
                  Cancelar
                </Button>
              </>
            )}

            {publication.status === 'failed' && (
              <>
                <Button
                  onClick={handlePublishNow}
                  loading={isLoading}
                  size="sm"
                  icon={<HiPlay className="h-4 w-4" />}
                >
                  Reintentar
                </Button>
                {canRegenerate && (
                  <Button
                    onClick={() => setShowRegenerationModal(true)}
                    variant="secondary"
                    size="sm"
                    icon={<HiRefresh className="h-4 w-4" />}
                  >
                    Regenerar
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-secondary-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-secondary-800">ID:</span>
                <p className="text-secondary-600 font-mono text-xs">{publication.id}</p>
              </div>
              <div>
                <span className="font-medium text-secondary-800">Campaña ID:</span>
                <p className="text-secondary-600 font-mono text-xs">{publication.campaignId}</p>
              </div>
            </div>

            {publication.generationMetadata && (
              <div className="mt-4 p-3 bg-secondary-50 rounded-lg">
                <h5 className="font-medium text-secondary-800 mb-2">Información de Generación IA</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-secondary-700">Agente:</span>
                    <p className="text-secondary-600">{publication.generationMetadata.agentUsed}</p>
                  </div>
                  {publication.generationMetadata.processingTimeMs && (
                    <div>
                      <span className="font-medium text-secondary-700">Tiempo:</span>
                      <p className="text-secondary-600">
                        {Math.round(publication.generationMetadata.processingTimeMs / 1000)}s
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-secondary-700">Reintentos:</span>
                    <p className="text-secondary-600">{publication.generationMetadata.retryCount || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Regeneration Modal */}
      <RegenerationModal
        isOpen={showRegenerationModal}
        onClose={() => setShowRegenerationModal(false)}
        event={eventForModal}
        onEventUpdate={handleEventUpdate}
      />
    </>
  )
}