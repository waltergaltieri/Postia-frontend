'use client'

import React, { useState, useEffect } from 'react'
import { ContentDescription, SocialNetwork } from '@/lib/database/types'
import { Button, LoadingSpinner, Modal } from '@/components/common'
import { cn } from '@/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  HiRefresh,
  HiEye,
  HiCheck,
  HiX,
  HiArrowLeft,
  HiExclamationCircle,
  HiSparkles,
  HiCalendar,
  HiTag,
  HiClock
} from 'react-icons/hi'

interface DescriptionGeneratorProps {
  campaignId: string
  onBack?: () => void
  onConfirm?: (descriptions: ContentDescription[]) => void
  onCancel?: () => void
}

interface GenerationState {
  status: 'idle' | 'generating' | 'completed' | 'error'
  progress: number
  error?: string
}

const platformConfig = {
  instagram: {
    name: 'Instagram',
    color: 'bg-pink-100 text-pink-700 border-pink-200',
    icon: '📷'
  },
  linkedin: {
    name: 'LinkedIn',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '💼'
  },
  twitter: {
    name: 'Twitter/X',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: '🐦'
  },
  facebook: {
    name: 'Facebook',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '👥'
  }
}

const contentTypeConfig = {
  text_simple: {
    name: 'Texto Simple',
    icon: '📝',
    description: 'Solo texto'
  },
  text_image_simple: {
    name: 'Texto + Imagen',
    icon: '🖼️',
    description: 'Texto con imagen simple'
  },
  text_image_template: {
    name: 'Template',
    icon: '🎨',
    description: 'Diseño con template'
  },
  carousel: {
    name: 'Carrusel',
    icon: '📱',
    description: 'Múltiples imágenes'
  }
}

export function DescriptionGenerator({
  campaignId,
  onBack,
  onConfirm,
  onCancel
}: DescriptionGeneratorProps) {
  const [descriptions, setDescriptions] = useState<ContentDescription[]>([])
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    progress: 0
  })
  const [selectedDescriptions, setSelectedDescriptions] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [showPreview, setShowPreview] = useState<ContentDescription | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  const itemsPerPage = 10
  const totalPages = Math.ceil(descriptions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDescriptions = descriptions.slice(startIndex, endIndex)

  // Generate initial descriptions
  useEffect(() => {
    generateDescriptions()
  }, [campaignId])

  const generateDescriptions = async () => {
    setGenerationState({ status: 'generating', progress: 0 })
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generate-descriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error generando descripciones')
      }

      const data = await response.json()
      setDescriptions(data.data.descriptions)
      setGenerationState({ status: 'completed', progress: 100 })
      
      // Select all descriptions by default
      const allIds = new Set<string>(data.data.descriptions.map((d: ContentDescription) => d.id))
      setSelectedDescriptions(allIds)

    } catch (error) {
      console.error('Error generating descriptions:', error)
      setGenerationState({
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }

  const regenerateDescription = async (descriptionId: string) => {
    setRegeneratingId(descriptionId)
    
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/descriptions/${descriptionId}/regenerate`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error regenerando descripción')
      }

      const data = await response.json()
      const updatedDescription = data.data

      // Update the description in the list
      setDescriptions(prev => 
        prev.map(desc => 
          desc.id === descriptionId ? updatedDescription : desc
        )
      )

    } catch (error) {
      console.error('Error regenerating description:', error)
      // TODO: Show error toast
    } finally {
      setRegeneratingId(null)
    }
  }

  const regenerateAll = async () => {
    await generateDescriptions()
  }

  const toggleDescriptionSelection = (descriptionId: string) => {
    setSelectedDescriptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(descriptionId)) {
        newSet.delete(descriptionId)
      } else {
        newSet.add(descriptionId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    const allIds = new Set<string>(descriptions.map(d => d.id))
    setSelectedDescriptions(allIds)
  }

  const selectNone = () => {
    setSelectedDescriptions(new Set<string>())
  }

  const handleConfirm = () => {
    const selectedDescriptionsList = descriptions.filter(d => 
      selectedDescriptions.has(d.id)
    )
    onConfirm?.(selectedDescriptionsList)
  }

  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: es })
  }

  if (generationState.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative">
          <LoadingSpinner size="lg" />
          <HiSparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary-600" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Generando descripciones de contenido
          </h3>
          <p className="text-gray-600">
            La IA está creando descripciones personalizadas para tu campaña...
          </p>
          <div className="w-64 bg-gray-200 rounded-full h-2" role="progressbar" aria-label="Progreso de generación">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${generationState.progress}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (generationState.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <HiExclamationCircle className="w-8 h-8 text-red-600" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Error generando descripciones
          </h3>
          <p className="text-gray-600 max-w-md">
            {generationState.error}
          </p>
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onBack}
            >
              <HiArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button
              onClick={generateDescriptions}
            >
              <HiRefresh className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Descripciones de Contenido
          </h2>
          <p className="text-gray-600 mt-1">
            Revisa y aprueba las descripciones generadas por IA
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={regenerateAll}
            disabled={generationState.status === 'generating'}
          >
            <HiRefresh className="w-4 h-4 mr-2" />
            Regenerar Todo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <HiSparkles className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-gray-600">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {descriptions.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <HiCheck className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Seleccionadas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {selectedDescriptions.size}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <HiCalendar className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Días</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {new Set(descriptions.map(d => formatDate(d.scheduledDate))).size}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <HiTag className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Plataformas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {new Set(descriptions.map(d => d.platform)).size}
          </p>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">
            Selección:
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
          >
            Todas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={selectNone}
          >
            Ninguna
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {selectedDescriptions.size} de {descriptions.length} seleccionadas
        </div>
      </div>

      {/* Descriptions List */}
      <div className="space-y-4">
        {currentDescriptions.map((description) => {
          const platform = platformConfig[description.platform]
          const contentType = contentTypeConfig[description.contentType]
          const isSelected = selectedDescriptions.has(description.id)
          const isRegenerating = regeneratingId === description.id

          return (
            <div
              key={description.id}
              className={cn(
                'bg-white border rounded-lg p-6 transition-all',
                isSelected 
                  ? 'border-primary-300 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-start space-x-4">
                {/* Selection Checkbox */}
                <div className="flex-shrink-0 pt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDescriptionSelection(description.id)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    aria-label={`Seleccionar descripción para ${platform.name}`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {/* Platform Badge */}
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                        platform.color
                      )}>
                        <span className="mr-1">{platform.icon}</span>
                        {platform.name}
                      </span>

                      {/* Content Type Badge */}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        <span className="mr-1">{contentType.icon}</span>
                        {contentType.name}
                      </span>

                      {/* Date */}
                      <div className="flex items-center text-sm text-gray-500">
                        <HiCalendar className="w-4 h-4 mr-1" />
                        {formatDate(description.scheduledDate)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(description)}
                      >
                        <HiEye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => regenerateDescription(description.id)}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <HiRefresh className="w-4 h-4 mr-1" />
                            Regenerar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      {description.description}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                    <span>Tipo: {contentType.description}</span>
                    {description.templateId && (
                      <span>• Template: {description.templateId}</span>
                    )}
                    {description.resourceIds.length > 0 && (
                      <span>• Recursos: {description.resourceIds.length}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {startIndex + 1}-{Math.min(endIndex, descriptions.length)} de {descriptions.length}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onBack}
        >
          <HiArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            <HiX className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedDescriptions.size === 0}
          >
            <HiCheck className="w-4 h-4 mr-2" />
            Confirmar ({selectedDescriptions.size})
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <Modal
          isOpen={true}
          onClose={() => setShowPreview(null)}
          title="Vista Previa de Descripción"
          size="lg"
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center space-x-3">
              <span className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
                platformConfig[showPreview.platform].color
              )}>
                <span className="mr-1">{platformConfig[showPreview.platform].icon}</span>
                {platformConfig[showPreview.platform].name}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
                <span className="mr-1">{contentTypeConfig[showPreview.contentType].icon}</span>
                {contentTypeConfig[showPreview.contentType].name}
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center text-sm text-gray-600">
              <HiCalendar className="w-4 h-4 mr-2" />
              Programado para: {formatDate(showPreview.scheduledDate)}
            </div>

            {/* Description */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Descripción:</h4>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {showPreview.description}
              </p>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Tipo de contenido:</span>
                <p className="text-gray-900">{contentTypeConfig[showPreview.contentType].description}</p>
              </div>
              {showPreview.templateId && (
                <div>
                  <span className="font-medium text-gray-600">Template:</span>
                  <p className="text-gray-900">{showPreview.templateId}</p>
                </div>
              )}
              {showPreview.resourceIds.length > 0 && (
                <div>
                  <span className="font-medium text-gray-600">Recursos:</span>
                  <p className="text-gray-900">{showPreview.resourceIds.length} recursos asignados</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowPreview(null)}
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  regenerateDescription(showPreview.id)
                  setShowPreview(null)
                }}
              >
                <HiRefresh className="w-4 h-4 mr-2" />
                Regenerar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}