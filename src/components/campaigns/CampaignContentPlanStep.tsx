'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { 
  HiSparkles, 
  HiRefresh, 
  HiClipboardCopy, 
  HiExclamationCircle,
  HiCheckCircle,
  HiClock,
  HiHashtag,
  HiPhotograph,
  HiViewGrid
} from 'react-icons/hi'
import { cn } from '@/utils'
import type { 
  CampaignData, 
  WorkspaceData, 
  ResourceData, 
  TemplateData,
  ContentPlanItem 
} from '@/lib/ai/agents/types'
import { getCampaignPlannerService } from '@/lib/ai/services/CampaignPlannerService'

interface CampaignContentPlanStepProps {
  campaign: CampaignData
  workspace: WorkspaceData
  resources: ResourceData[]
  templates: TemplateData[]
  onNext: (contentPlan: ContentPlanItem[]) => void
  onBack: () => void
}

export function CampaignContentPlanStep({
  campaign,
  workspace,
  resources,
  templates,
  onNext,
  onBack
}: CampaignContentPlanStepProps) {
  const [contentPlan, setContentPlan] = useState<ContentPlanItem[]>([])
  const [isGenerating, setIsGenerating] = useState(true) // Empezar generando inmediatamente
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  const service = getCampaignPlannerService()

  // Auto-generar INMEDIATAMENTE al montar el componente
  useEffect(() => {
    console.log('Component mounted, generating content plan immediately...')
    handleGenerateContentPlan()
  }, []) // Solo ejecutar una vez al montar

  const handleGenerateContentPlan = async () => {
    console.log('Starting content plan generation...')
    console.log('Campaign data:', campaign)
    console.log('Workspace data:', workspace)
    
    setIsGenerating(true)
    setError(null)

    try {
      console.log('🔥 CALLING service.generateContentPlan...')
      console.log('🔥 Service instance:', service)
      console.log('🔥 Service method exists:', typeof service.generateContentPlan)
      
      const plan = await service.generateContentPlan({
        campaign,
        workspace,
        resources,
        templates
      })
      
      console.log('🔥 RECEIVED plan from service:', plan)
      console.log('🔥 Plan length:', plan?.length)
      
      setContentPlan(plan)
      setHasGenerated(true)
      
      if (plan && plan.length > 0) {
        console.log('✅ SUCCESS: Plan generated with', plan.length, 'items')
        toast.success(`Plan de contenido generado: ${plan.length} publicaciones`)
      } else {
        console.error('❌ PROBLEM: Plan is empty or null')
        console.error('Plan value:', plan)
        console.error('Plan type:', typeof plan)
      }
    } catch (err) {
      console.error('💥 ERROR in handleGenerateContentPlan:', err)
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack')
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al generar el plan de contenido')
    } finally {
      console.log('🏁 FINALLY: Setting isGenerating to false')
      setIsGenerating(false)
    }
  }

  const handleRegenerateAll = async () => {
    setIsRegenerating(true)
    setError(null)

    try {
      const plan = await service.regenerateContentPlan({
        campaign,
        workspace,
        resources,
        templates,
        previousPlan: contentPlan
      })
      
      setContentPlan(plan)
      toast.success('Plan de contenido regenerado completamente')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al regenerar el plan de contenido')
    } finally {
      setIsRegenerating(false)
    }
  }



  const handleRegenerateItem = async (index: number) => {
    setRegeneratingIndex(index)
    setError(null)

    try {
      const newItem = await service.regenerateContentItem({
        campaign,
        workspace,
        resources,
        templates,
        itemIndex: index,
        previousPlan: contentPlan
      })
      
      const newPlan = [...contentPlan]
      newPlan[index] = newItem
      setContentPlan(newPlan)
      
      toast.success('Elemento regenerado exitosamente')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al regenerar el elemento')
    } finally {
      setRegeneratingIndex(null)
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      await service.copyContentPlanToClipboard(contentPlan)
      setCopiedToClipboard(true)
      toast.success('Plan copiado al portapapeles')
      setTimeout(() => setCopiedToClipboard(false), 3000)
    } catch (err) {
      toast.error('Error al copiar al portapapeles')
    }
  }

  const getSocialNetworkIcon = (network: string) => {
    const icons: Record<string, string> = {
      'facebook': '📘',
      'instagram': '📷',
      'twitter': '🐦',
      'linkedin': '💼',
      'tiktok': '🎵',
      'youtube': '📺'
    }
    return icons[network.toLowerCase()] || '📱'
  }

  const getContentTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'text-only': '📝',
      'text-with-image': '🖼️',
      'text-with-carousel': '🎠'
    }
    return icons[type] || '📄'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'high': 'bg-red-100 text-red-800 border-red-200',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'low': 'bg-green-100 text-green-800 border-green-200'
    }
    return colors[priority] || 'bg-secondary-100 text-secondary-800 border-secondary-200'
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

  // Calcular estadísticas del plan
  const stats = contentPlan.length > 0 ? service.calculatePlanStatistics(contentPlan) : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-secondary-900 mb-2 flex items-center gap-2">
          <HiSparkles className="w-6 h-6 text-primary-600" />
          Plan de Contenido Generado
        </h2>
        <p className="text-secondary-600">
          Revisa y personaliza el plan de contenido generado por IA para tu campaña "{campaign.name}".
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <HiExclamationCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-red-900 font-medium mb-1">Error al generar contenido</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State - Solo mostrar si realmente está generando Y no hay contenido */}
      {isGenerating && contentPlan.length === 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <div>
              <h3 className="text-primary-900 font-medium">Generando plan de contenido...</h3>
              <p className="text-primary-700 text-sm">
                La IA está analizando tu campaña y creando contenido personalizado
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Plan - Mostrar siempre que haya contenido */}
      {contentPlan.length > 0 && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-secondary-50 border border-secondary-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <HiCheckCircle className="w-5 h-5 text-success-600" />
              <div>
                <h3 className="font-medium text-secondary-900">
                  {contentPlan.length} publicaciones programadas
                </h3>
                <p className="text-sm text-secondary-600">
                  {stats && `${stats.averagePostsPerDay} publicaciones por día en promedio`}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRegenerateAll}
                disabled={isRegenerating}
                className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <HiRefresh className={cn("w-4 h-4", isRegenerating && "animate-spin")} />
                {isRegenerating ? 'Regenerando...' : 'Regenerar Todo'}
              </button>
              
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                  copiedToClipboard
                    ? "bg-success-600 text-white"
                    : "bg-primary-600 text-white hover:bg-primary-700"
                )}
              >
                <HiClipboardCopy className="w-4 h-4" />
                {copiedToClipboard ? 'Copiado!' : 'PostIA'}
              </button>
            </div>
          </div>

          {/* Content Items */}
          <div className="space-y-4">
            {contentPlan.map((item, index) => (
              <div
                key={item.id}
                className="bg-white border border-secondary-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Main Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-secondary-400">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-secondary-900 mb-1">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-secondary-600">
                            <span className="flex items-center gap-1">
                              {getSocialNetworkIcon(item.socialNetwork)}
                              {item.socialNetwork}
                            </span>
                            <span className="flex items-center gap-1">
                              {getContentTypeIcon(item.contentType)}
                              {item.contentType}
                            </span>
                            <span className="flex items-center gap-1">
                              <HiClock className="w-4 h-4" />
                              {formatDate(item.scheduledDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full border",
                        getPriorityColor(item.priority)
                      )}>
                        {item.priority}
                      </span>
                    </div>

                    <p className="text-secondary-700 mb-4 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full border border-primary-200 flex items-center gap-1"
                          >
                            <HiHashtag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Resources and Templates */}
                    <div className="flex flex-wrap gap-4 text-sm text-secondary-600 mb-3">
                      {item.resourceIds && item.resourceIds.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {item.resourceIds.map((resourceId, resourceIndex) => {
                            const resource = resources.find(r => r.id === resourceId)
                            return (
                              <span key={resourceIndex} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded" title={resource ? `${resource.name} (${resource.type})` : 'Recurso no encontrado'}>
                                <HiPhotograph className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">
                                  {resource ? resource.name : `Recurso ${resourceIndex + 1}`}
                                </span>
                                {resource && (
                                  <span className="text-xs text-blue-500 ml-1">
                                    ({resource.type})
                                  </span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                          <HiPhotograph className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Sin recursos</span>
                        </span>
                      )}
                      
                      {item.templateId ? (
                        <span className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded" title={`${templates.find(t => t.id === item.templateId)?.name || 'Template'} (${templates.find(t => t.id === item.templateId)?.type || 'unknown'})`}>
                          <HiViewGrid className="w-4 h-4 text-purple-600" />
                          <span className="font-medium">
                            {templates.find(t => t.id === item.templateId)?.name || 'Template asignado'}
                          </span>
                          {templates.find(t => t.id === item.templateId) && (
                            <span className="text-xs text-purple-500 ml-1">
                              ({templates.find(t => t.id === item.templateId)?.type})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                          <HiViewGrid className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Diseño libre</span>
                        </span>
                      )}
                    </div>

                    {/* Notes */}
                    {item.notes && (
                      <div className="mt-4 bg-secondary-50 p-3 rounded-lg">
                        <p className="text-sm text-secondary-600">
                          <span className="font-medium">📌 Notas:</span> {item.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleRegenerateItem(index)}
                      disabled={regeneratingIndex === index}
                      className="px-3 py-2 text-sm bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      <HiRefresh className={cn(
                        "w-4 h-4",
                        regeneratingIndex === index && "animate-spin"
                      )} />
                      {regeneratingIndex === index ? 'Regenerando...' : 'Regenerar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Statistics */}
          {stats && (
            <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                📊 Estadísticas del Plan
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Social Networks */}
                <div>
                  <h4 className="font-medium text-secondary-700 mb-3">Redes Sociales</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.postsByNetwork).map(([network, count]) => (
                      <div key={network} className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-sm">
                          {getSocialNetworkIcon(network)}
                          {network}
                        </span>
                        <span className="text-sm font-medium bg-white px-2 py-1 rounded">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Types */}
                <div>
                  <h4 className="font-medium text-secondary-700 mb-3">Tipos de Contenido</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.postsByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-sm">
                          {getContentTypeIcon(type)}
                          {type}
                        </span>
                        <span className="text-sm font-medium bg-white px-2 py-1 rounded">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Priorities */}
                <div>
                  <h4 className="font-medium text-secondary-700 mb-3">Prioridades</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.postsByPriority).map(([priority, count]) => (
                      <div key={priority} className="flex justify-between items-center">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded font-medium",
                          getPriorityColor(priority)
                        )}>
                          {priority}
                        </span>
                        <span className="text-sm font-medium bg-white px-2 py-1 rounded">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Si no hay contenido y no está generando, mostrar mensaje simple */}
      {contentPlan.length === 0 && !isGenerating && !error && (
        <div className="text-center py-12 bg-secondary-50 border border-secondary-200 rounded-xl">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            No se pudo generar contenido
          </h3>
          <p className="text-secondary-600 mb-6">
            Verifica la configuración de tu campaña e intenta nuevamente
          </p>
          
          {/* Debug info solo en desarrollo */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-4 bg-white rounded-lg text-left text-sm max-w-md mx-auto">
              <h4 className="font-medium mb-2">Debug Info:</h4>
              <p>Campaign: {campaign?.name || 'No name'}</p>
              <p>Start Date: {campaign?.startDate || 'No start date'}</p>
              <p>End Date: {campaign?.endDate || 'No end date'}</p>
              <p>Interval: {campaign?.intervalHours || 'No interval'} hours</p>
              <p>Social Networks: {campaign?.socialNetworks?.join(', ') || 'None'}</p>
              <p>Has Generated: {hasGenerated ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between pt-6 border-t border-secondary-200">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
        >
          Atrás
        </button>
        
        <button
          type="button"
          onClick={() => onNext(contentPlan)}
          disabled={contentPlan.length === 0 || isGenerating}
          className={cn(
            'px-6 py-2 text-sm font-medium rounded-lg transition-colors',
            contentPlan.length > 0 && !isGenerating
              ? 'text-white bg-primary-600 hover:bg-primary-700'
              : 'text-secondary-400 bg-secondary-100 cursor-not-allowed'
          )}
        >
          Crear Campaña
        </button>
      </div>
    </div>
  )
}