'use client'

import React, { useState, useEffect } from 'react'
import { ContentPlanList } from './ContentPlanList'
import { useCampaignPlanner } from '@/hooks/useCampaignPlanner'
import type { 
  CampaignData, 
  WorkspaceData, 
  ResourceData, 
  TemplateData 
} from '@/lib/ai/agents/types'

interface CampaignPlannerViewProps {
  campaign: CampaignData
  workspace: WorkspaceData
  resources?: ResourceData[]
  templates?: TemplateData[]
  onBackToCampaign: () => void
  autoGenerate?: boolean
}

export function CampaignPlannerView({
  campaign,
  workspace,
  resources = [],
  templates = [],
  onBackToCampaign,
  autoGenerate = false
}: CampaignPlannerViewProps) {
  const {
    contentPlan,
    isLoading,
    error,
    isRegenerating,
    generateContentPlan,
    regenerateContentPlan,
    regenerateContentItem,
    clearError
  } = useCampaignPlanner()

  const [hasGenerated, setHasGenerated] = useState(false)

  // Auto-generar al montar el componente si se especifica
  useEffect(() => {
    if (autoGenerate && !hasGenerated) {
      handleGenerateContentPlan()
      setHasGenerated(true)
    }
  }, [autoGenerate, hasGenerated])

  const handleGenerateContentPlan = async () => {
    await generateContentPlan({
      campaign,
      workspace,
      resources,
      templates
    })
  }

  const handleRegenerateAll = async () => {
    await regenerateContentPlan()
  }

  const handleRegenerateItem = async (index: number) => {
    await regenerateContentItem(index)
  }

  // Si hay error, mostrar pantalla de error
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al generar contenido</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={clearError}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleGenerateContentPlan}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Si no hay contenido y no está cargando, mostrar pantalla inicial
  if (contentPlan.length === 0 && !isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Generar Plan de Contenido
          </h3>
          <p className="text-gray-600 mb-6">
            Crea un plan detallado de contenido para tu campaña "{campaign.name}" 
            usando inteligencia artificial.
          </p>
          
          {/* Información de la campaña */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
            <h4 className="font-medium text-gray-900 mb-2">Configuración de la campaña:</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div>📅 {new Date(campaign.startDate).toLocaleDateString('es-ES')} - {new Date(campaign.endDate).toLocaleDateString('es-ES')}</div>
              <div>📱 {campaign.socialNetworks.join(', ')}</div>
              <div>⏰ Cada {campaign.intervalHours} horas</div>
              <div>🎯 {campaign.objective}</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={onBackToCampaign}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Volver a configuración
            </button>
            <button
              onClick={handleGenerateContentPlan}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generando...
                </>
              ) : (
                <>
                  ✨ Generar Plan de Contenido
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar lista de contenido
  return (
    <ContentPlanList
      contentPlan={contentPlan}
      onRegenerateItem={handleRegenerateItem}
      onRegenerateAll={handleRegenerateAll}
      onBackToCampaign={onBackToCampaign}
      isLoading={isLoading || isRegenerating}
    />
  )
}