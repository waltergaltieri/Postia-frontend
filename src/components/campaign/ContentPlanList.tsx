'use client'

import React, { useState } from 'react'
import { ContentPlanItem } from '@/lib/ai/agents/types'
import { getCampaignPlannerService } from '@/lib/ai/services/CampaignPlannerService'

interface ContentPlanListProps {
  contentPlan: ContentPlanItem[]
  onRegenerateItem: (index: number) => void
  onRegenerateAll: () => void
  onBackToCampaign: () => void
  isLoading?: boolean
}

export function ContentPlanList({ 
  contentPlan, 
  onRegenerateItem, 
  onRegenerateAll, 
  onBackToCampaign,
  isLoading = false 
}: ContentPlanListProps) {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)

  const handleCopyToClipboard = async () => {
    try {
      const service = getCampaignPlannerService()
      await service.copyContentPlanToClipboard(contentPlan)
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 3000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const handleRegenerateItem = async (index: number) => {
    setRegeneratingIndex(index)
    try {
      await onRegenerateItem(index)
    } finally {
      setRegeneratingIndex(null)
    }
  }

  const getSocialNetworkIcon = (network: string) => {
    const icons: Record<string, string> = {
      'facebook': '📘',
      'instagram': '📷',
      'twitter': '🐦',
      'linkedin': '💼',
      'tiktok': '🎵',
      'youtube': '📺',
      'pinterest': '📌',
      'whatsapp': '💬'
    }
    return icons[network.toLowerCase()] || '📱'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'high': 'bg-red-100 text-red-800 border-red-200',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'low': 'bg-green-100 text-green-800 border-green-200'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getContentTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'post': '📝',
      'story': '📖',
      'reel': '🎬',
      'carousel': '🎠'
    }
    return icons[type] || '📄'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generando plan de contenido...</p>
        </div>
      </div>
    )
  }

  if (contentPlan.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay contenido planificado</h3>
        <p className="text-gray-500 mb-6">Genera un plan de contenido para tu campaña</p>
        <button
          onClick={onBackToCampaign}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Volver a configuración
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg border">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Plan de Contenido</h2>
          <p className="text-gray-600 mt-1">
            {contentPlan.length} publicaciones programadas
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onBackToCampaign}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Volver a configuración
          </button>
          
          <button
            onClick={onRegenerateAll}
            disabled={isLoading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
          >
            🔄 Regenerar todo
          </button>
          
          <button
            onClick={handleCopyToClipboard}
            className={`px-4 py-2 rounded-lg transition-colors ${
              copiedToClipboard 
                ? 'bg-green-600 text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copiedToClipboard ? '✅ Copiado' : '📋 PostIA'}
          </button>
        </div>
      </div>

      {/* Lista de contenido */}
      <div className="grid gap-4">
        {contentPlan.map((item, index) => (
          <div
            key={item.id}
            className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              {/* Información principal */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          {getSocialNetworkIcon(item.socialNetwork)}
                          {item.socialNetwork}
                        </span>
                        <span className="flex items-center gap-1">
                          {getContentTypeIcon(item.contentType)}
                          {item.contentType}
                        </span>
                        <span>📅 {formatDate(item.scheduledDate)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 leading-relaxed">
                  {item.description}
                </p>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notas adicionales */}
                {item.notes && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">📌 Notas:</span> {item.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex lg:flex-col gap-2">
                <button
                  onClick={() => handleRegenerateItem(index)}
                  disabled={regeneratingIndex === index}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {regeneratingIndex === index ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      Regenerando...
                    </>
                  ) : (
                    <>
                      🔄 Regenerar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estadísticas del plan */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Estadísticas del Plan</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Redes sociales */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Redes Sociales</h4>
            <div className="space-y-2">
              {Object.entries(
                contentPlan.reduce((acc, item) => {
                  acc[item.socialNetwork] = (acc[item.socialNetwork] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([network, count]) => (
                <div key={network} className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm">
                    {getSocialNetworkIcon(network)}
                    {network}
                  </span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tipos de contenido */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Tipos de Contenido</h4>
            <div className="space-y-2">
              {Object.entries(
                contentPlan.reduce((acc, item) => {
                  acc[item.contentType] = (acc[item.contentType] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm">
                    {getContentTypeIcon(type)}
                    {type}
                  </span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Prioridades */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Prioridades</h4>
            <div className="space-y-2">
              {Object.entries(
                contentPlan.reduce((acc, item) => {
                  acc[item.priority] = (acc[item.priority] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([priority, count]) => (
                <div key={priority} className="flex justify-between items-center">
                  <span className={`text-sm px-2 py-1 rounded ${getPriorityColor(priority)}`}>
                    {priority}
                  </span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}