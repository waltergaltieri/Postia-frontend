'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button } from '@/components/common'
import { EventInput } from '@fullcalendar/core'
import {
  HiRefresh,
  HiClock,
  HiEye,
  HiX,
  HiChevronDown,
  HiChevronUp,
  HiSparkles,
} from 'react-icons/hi'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RegenerationHistory {
  id: string
  previousContent: string
  previousImageUrls?: string[]
  newContent: string
  newImageUrls?: string[]
  customPrompt?: string
  reason: 'user_request' | 'error_recovery' | 'content_improvement'
  regeneratedAt: string
}

interface RegenerationModalProps {
  isOpen: boolean
  onClose: () => void
  event: EventInput | null
  onEventUpdate?: (eventId: string, updates: Partial<EventInput>) => void
}

export function RegenerationModal({
  isOpen,
  onClose,
  event,
  onEventUpdate,
}: RegenerationModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [reason, setReason] = useState<'user_request' | 'error_recovery' | 'content_improvement'>('user_request')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<RegenerationHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<RegenerationHistory | null>(null)

  useEffect(() => {
    if (isOpen && event?.id) {
      loadRegenerationHistory()
    }
  }, [isOpen, event?.id])

  const loadRegenerationHistory = async () => {
    if (!event?.id) return

    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/publications/${event.id}/regeneration-history`)
      const data = await response.json()
      
      if (data.success) {
        setHistory(data.data || [])
      }
    } catch (error) {
      console.error('Error loading regeneration history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleRegenerate = async () => {
    if (!event?.id) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/publications/${event.id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customPrompt: customPrompt.trim() || undefined,
          reason
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.data) {
        toast.success('Contenido regenerado exitosamente')
        
        // Update event with new content
        if (onEventUpdate && event.id) {
          onEventUpdate(event.id, {
            ...event,
            extendedProps: {
              ...event.extendedProps,
              content: data.data.publication.generatedText || data.data.publication.content,
              generatedText: data.data.publication.generatedText,
              generatedImageUrls: data.data.publication.generatedImageUrls,
              generationStatus: data.data.publication.generationStatus,
              generationMetadata: data.data.publication.generationMetadata,
            },
          })
        }

        // Reload history to show the new regeneration
        await loadRegenerationHistory()
        
        // Reset form
        setCustomPrompt('')
        setReason('user_request')
        
      } else {
        toast.error(data.message || 'Error al regenerar contenido')
      }
    } catch (error) {
      console.error('Error regenerating:', error)
      toast.error('Error al regenerar contenido')
    } finally {
      setIsLoading(false)
    }
  }

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'user_request':
        return 'Solicitud del usuario'
      case 'error_recovery':
        return 'Recuperación de error'
      case 'content_improvement':
        return 'Mejora de contenido'
      default:
        return 'Desconocido'
    }
  }

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'user_request':
        return 'bg-blue-100 text-blue-800'
      case 'error_recovery':
        return 'bg-red-100 text-red-800'
      case 'content_improvement':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!event) return null

  const { extendedProps } = event
  const generationStatus = extendedProps?.generationStatus || 'pending'
  const canRegenerate = ['completed', 'failed'].includes(generationStatus) && 
                       extendedProps?.status !== 'published'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Regenerar Contenido con IA"
      size="lg"
    >
      <div className="p-6">
        {/* Current content preview */}
        <div className="bg-secondary-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-secondary-900 mb-3 flex items-center gap-2">
            <HiSparkles className="h-5 w-5 text-primary-500" />
            Contenido Actual
          </h4>
          <div className="flex gap-4">
            {extendedProps?.generatedImageUrls?.length > 0 && (
              <div className="flex-shrink-0">
                <img
                  src={extendedProps.generatedImageUrls[0]}
                  alt="Imagen actual"
                  className="w-20 h-20 rounded-lg object-cover border border-secondary-200"
                />
                {extendedProps.generatedImageUrls.length > 1 && (
                  <div className="text-xs text-secondary-500 mt-1 text-center">
                    +{extendedProps.generatedImageUrls.length - 1} más
                  </div>
                )}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm text-secondary-700 leading-relaxed">
                {extendedProps?.generatedText || extendedProps?.content || 'Sin contenido'}
              </p>
            </div>
          </div>
        </div>

        {canRegenerate ? (
          <>
            {/* Regeneration form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Motivo de regeneración
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as any)}
                  className="w-full p-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="user_request">Solicitud del usuario</option>
                  <option value="content_improvement">Mejora de contenido</option>
                  <option value="error_recovery">Recuperación de error</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Prompt personalizado (opcional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe cómo quieres que sea el nuevo contenido..."
                  rows={3}
                  className="w-full p-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-secondary-500 mt-1">
                  Si no especificas un prompt, se usará la configuración original de la campaña
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                onClick={handleRegenerate}
                loading={isLoading}
                icon={<HiRefresh className="h-4 w-4" />}
                className="flex-1"
              >
                Regenerar Contenido
              </Button>
              <Button
                onClick={onClose}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <HiX className="h-5 w-5" />
              <span className="font-medium">No se puede regenerar</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              {extendedProps?.status === 'published' 
                ? 'Las publicaciones ya enviadas no se pueden regenerar.'
                : 'El contenido debe estar generado o haber fallado para poder regenerarse.'
              }
            </p>
          </div>
        )}

        {/* History section */}
        <div className="border-t border-secondary-200 pt-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-secondary-900 flex items-center gap-2">
              <HiClock className="h-5 w-5 text-secondary-500" />
              Historial de Regeneraciones ({history.length})
            </h4>
            {showHistory ? (
              <HiChevronUp className="h-5 w-5 text-secondary-500" />
            ) : (
              <HiChevronDown className="h-5 w-5 text-secondary-500" />
            )}
          </button>

          {showHistory && (
            <div className="mt-4">
              {loadingHistory ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-sm text-secondary-500 mt-2">Cargando historial...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-secondary-500">
                  <HiClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay regeneraciones anteriores</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-secondary-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(item.reason)}`}>
                            {getReasonLabel(item.reason)}
                          </span>
                          <span className="text-xs text-secondary-500">
                            {format(new Date(item.regeneratedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedHistoryItem(selectedHistoryItem?.id === item.id ? null : item)}
                          className="text-secondary-400 hover:text-secondary-600"
                        >
                          <HiEye className="h-4 w-4" />
                        </button>
                      </div>

                      {item.customPrompt && (
                        <div className="mb-2">
                          <p className="text-xs text-secondary-600 bg-secondary-50 p-2 rounded">
                            <strong>Prompt:</strong> {item.customPrompt}
                          </p>
                        </div>
                      )}

                      <div className="text-sm text-secondary-700">
                        <p className="truncate">
                          <strong>Nuevo:</strong> {item.newContent.substring(0, 100)}
                          {item.newContent.length > 100 && '...'}
                        </p>
                      </div>

                      {selectedHistoryItem?.id === item.id && (
                        <div className="mt-3 pt-3 border-t border-secondary-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h6 className="text-xs font-medium text-secondary-800 mb-2">Contenido Anterior</h6>
                              <p className="text-xs text-secondary-600 bg-red-50 p-2 rounded max-h-20 overflow-y-auto">
                                {item.previousContent}
                              </p>
                            </div>
                            <div>
                              <h6 className="text-xs font-medium text-secondary-800 mb-2">Contenido Nuevo</h6>
                              <p className="text-xs text-secondary-600 bg-green-50 p-2 rounded max-h-20 overflow-y-auto">
                                {item.newContent}
                              </p>
                            </div>
                          </div>

                          {(item.previousImageUrls?.length || item.newImageUrls?.length) && (
                            <div className="mt-3">
                              <h6 className="text-xs font-medium text-secondary-800 mb-2">Imágenes</h6>
                              <div className="flex gap-2">
                                {item.previousImageUrls?.map((url, index) => (
                                  <div key={`prev-${index}`} className="text-center">
                                    <img
                                      src={url}
                                      alt={`Anterior ${index + 1}`}
                                      className="w-12 h-12 rounded object-cover border-2 border-red-200"
                                    />
                                    <p className="text-xs text-red-600 mt-1">Anterior</p>
                                  </div>
                                ))}
                                {item.newImageUrls?.map((url, index) => (
                                  <div key={`new-${index}`} className="text-center">
                                    <img
                                      src={url}
                                      alt={`Nueva ${index + 1}`}
                                      className="w-12 h-12 rounded object-cover border-2 border-green-200"
                                    />
                                    <p className="text-xs text-green-600 mt-1">Nueva</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}