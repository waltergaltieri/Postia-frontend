'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  HiSparkles, 
  HiX, 
  HiExclamationCircle,
  HiCheckCircle,
  HiClock,
  HiRefresh
} from 'react-icons/hi'

import { toast } from 'react-hot-toast'
import { GenerationProgressIndicator } from '@/components/campaigns/GenerationProgressIndicator'
import { GenerationNotifications } from './GenerationNotifications'
import { getGenerationProgressService, type ProgressNotification } from '@/lib/services/GenerationProgressService'
import type { ContentPlanItem, WorkspaceData, ResourceData, TemplateData } from '@/lib/ai/agents/types'

export interface GenerationProgress {
  id: string
  campaignId: string
  totalPublications: number
  completedPublications: number
  currentPublicationId?: string
  currentAgent?: 'text-only' | 'text-image' | 'text-template' | 'carousel'
  currentStep?: string
  errors: GenerationError[]
  startedAt: Date
  completedAt?: Date
  estimatedTimeRemaining?: number
}

export interface GenerationError {
  publicationId: string
  agentType: string
  errorMessage: string
  timestamp: Date
  retryCount: number
}

interface ContentGenerationLoadingScreenProps {
  campaignId: string
  contentPlan: ContentPlanItem[]
  workspaceId: string
  workspace: WorkspaceData | null
  resources: ResourceData[]
  templates: TemplateData[]
  onComplete: (campaignId: string) => void
  onCancel: () => void
  onError: (error: string) => void
}

export function ContentGenerationLoadingScreen({
  campaignId,
  contentPlan,
  workspaceId,
  workspace,
  resources,
  templates,
  onComplete,
  onCancel,
  onError
}: ContentGenerationLoadingScreenProps) {
  const router = useRouter()
  const progressService = getGenerationProgressService()
  
  const [progress, setProgress] = useState<GenerationProgress>({
    id: `gen-${Date.now()}`,
    campaignId,
    totalPublications: contentPlan?.length || 0,
    completedPublications: 0,
    errors: [],
    startedAt: new Date(),
    estimatedTimeRemaining: 0
  })
  const [isGenerating, setIsGenerating] = useState(true)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [notifications, setNotifications] = useState<ProgressNotification[]>([])
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [finalSummary, setFinalSummary] = useState<{
    totalGenerated: number
    totalErrors: number
    duration: number
  } | null>(null)

  // Inicializar generación real llamando a la API
  useEffect(() => {
    const initializeGeneration = async () => {
      try {
        console.log('🚀 Initializing real content generation for campaign:', campaignId)
        
        // Llamar a la API para iniciar la generación real
        const response = await fetch(`/api/campaigns/${campaignId}/generate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contentPlan,
            workspace: workspace || {
              id: workspaceId,
              name: 'Current Workspace',
              branding: {
                primaryColor: '#3B82F6',
                secondaryColor: '#6B7280',
                logo: '',
                slogan: '',
                description: '',
                whatsapp: ''
              }
            },
            resources: resources || [],
            templates: templates || []
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log('✅ Generation started successfully:', result)
        
        const genId = result.data.generationId
        setGenerationId(genId)
        
        // Iniciar polling para obtener progreso
        const pollProgress = async () => {
          try {
            const progressResponse = await fetch(`/api/campaigns/${campaignId}/generation-progress`)
            if (progressResponse.ok) {
              const progressData = await progressResponse.json()
              const newProgress = progressData.data
              
              if (newProgress) {
                // Validar y normalizar los datos del progreso
                const normalizedProgress = {
                  ...newProgress,
                  totalPublications: newProgress.totalPublications || 0,
                  completedPublications: newProgress.completedPublications || 0,
                  errors: newProgress.errors || [],
                  estimatedTimeRemaining: newProgress.estimatedTimeRemaining || 0
                }
                setProgress(normalizedProgress)
                
                // Verificar si la generación está completa
                if (newProgress.completedAt || newProgress.completedPublications >= newProgress.totalPublications) {
                  setIsGenerating(false)
                  setIsCompleted(true)
                  
                  const duration = newProgress.completedAt 
                    ? new Date(newProgress.completedAt).getTime() - new Date(newProgress.startedAt).getTime()
                    : Date.now() - new Date(newProgress.startedAt).getTime()
                    
                  const summary = {
                    totalGenerated: newProgress.completedPublications,
                    totalErrors: newProgress.errors.length,
                    duration: Math.round(duration / 1000)
                  }
                  
                  setFinalSummary(summary)
                  
                  // Show completion notification
                  const successRate = summary.totalGenerated > 0 
                    ? Math.round(((summary.totalGenerated - summary.totalErrors) / summary.totalGenerated) * 100)
                    : 0
                  const completionMessage = summary.totalErrors === 0 
                    ? `🎉 ¡Generación completada! ${summary.totalGenerated} publicaciones creadas exitosamente`
                    : `⚠️ Generación completada con ${summary.totalErrors} errores. ${summary.totalGenerated - summary.totalErrors} publicaciones exitosas (${successRate}% éxito)`
                  
                  toast.success(completionMessage, { duration: 6000 })
                  
                  return // Stop polling
                }
              }
            }
          } catch (error) {
            console.error('Error polling progress:', error)
          }
          
          // Continue polling if generation is still active
          if (isGenerating) {
            setTimeout(pollProgress, 2000) // Poll every 2 seconds
          }
        }
        
        // Start polling
        setTimeout(pollProgress, 1000) // Start after 1 second
        
      } catch (error) {
        console.error('Error initializing generation:', error)
        onError('Error al inicializar la generación de contenido: ' + (error instanceof Error ? error.message : 'Error desconocido'))
      }
    }

    if (isGenerating && contentPlan.length > 0) {
      initializeGeneration()
    }
  }, [campaignId, contentPlan, workspaceId, isGenerating, onError])

  // Fallback: simular progreso si el servicio no está disponible
  useEffect(() => {
    if (!isGenerating || generationId) return

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev.completedPublications >= prev.totalPublications) {
          setIsGenerating(false)
          setIsCompleted(true)
          
          const duration = Date.now() - prev.startedAt.getTime()
          setFinalSummary({
            totalGenerated: prev.completedPublications,
            totalErrors: prev.errors.length,
            duration: Math.round(duration / 1000)
          })
          
          return prev
        }

        const nextIndex = prev.completedPublications
        const currentItem = contentPlan[nextIndex]
        
        // Simular diferentes agentes según el tipo de contenido
        let currentAgent: GenerationProgress['currentAgent']
        let currentStep: string
        
        switch (currentItem?.contentType) {
          case 'text-only':
            currentAgent = 'text-only'
            currentStep = 'Generando texto optimizado para redes sociales'
            break
          case 'text-with-image':
            currentAgent = 'text-image'
            currentStep = 'Generando imagen y texto complementario'
            break
          case 'text-with-carousel':
            currentAgent = 'carousel'
            currentStep = 'Creando carrusel con múltiples imágenes'
            break
          default:
            currentAgent = 'text-template'
            currentStep = 'Aplicando diseño y generando contenido'
        }

        const estimatedTimePerItem = 15000 // 15 segundos por item
        const remainingItems = prev.totalPublications - prev.completedPublications - 1
        const estimatedTimeRemaining = remainingItems * estimatedTimePerItem

        return {
          ...prev,
          completedPublications: prev.completedPublications + 1,
          currentPublicationId: currentItem?.id,
          currentAgent,
          currentStep,
          estimatedTimeRemaining
        }
      })
    }, 3000) // Simular 3 segundos por publicación

    return () => clearInterval(interval)
  }, [isGenerating, contentPlan, generationId])

  const handleCancel = async () => {
    if (showCancelConfirm) {
      try {
        // Call the cancel generation API
        const response = await fetch(`/api/campaigns/${campaignId}/cancel-generation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (response.ok) {
          console.log('✅ Generation cancelled successfully')
        } else {
          console.error('❌ Failed to cancel generation')
        }
      } catch (error) {
        console.error('Error canceling generation:', error)
      }
      
      setIsGenerating(false)
      toast.success('Generación cancelada')
      onCancel()
    } else {
      setShowCancelConfirm(true)
    }
  }

  const handleRetry = () => {
    setProgress(prev => ({
      ...prev,
      completedPublications: 0,
      currentPublicationId: undefined,
      currentAgent: undefined,
      currentStep: undefined,
      errors: [],
      startedAt: new Date()
    }))
    setIsGenerating(true)
    setIsCompleted(false)
    setFinalSummary(null)
    setShowCancelConfirm(false)
    setNotifications([])
    setGenerationId(null)
  }

  const handleRetryPublication = async (publicationId: string) => {
    // En el futuro, esto activará la regeneración de una publicación específica
    toast('Función de reintento individual próximamente disponible', { icon: 'ℹ️' })
  }

  const handleDismissNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index))
  }

  const handleComplete = () => {
    const successMessage = finalSummary 
      ? `¡Campaña generada exitosamente! ${finalSummary.totalGenerated} publicaciones creadas en ${formatTime(finalSummary.duration)}`
      : '¡Campaña generada exitosamente!'
    
    toast.success(successMessage, { duration: 5000 })
    onComplete(campaignId)
  }

  const handleViewCalendar = () => {
    toast.success('Redirigiendo al calendario con tu contenido generado')
    router.push(`/workspace/${workspaceId}/calendar`)
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    if (progress.totalPublications === 0) return 0
    return Math.round((progress.completedPublications / progress.totalPublications) * 100)
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-secondary-200 w-full max-w-2xl">
        {/* Header */}
        <div className="px-8 py-6 border-b border-secondary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <HiSparkles className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-secondary-900">
                  {isCompleted ? 'Generación Completada' : 'Generando Contenido con IA'}
                </h1>
                <p className="text-secondary-600 text-sm">
                  {isCompleted 
                    ? 'Tu campaña ha sido creada exitosamente'
                    : 'Creando contenido personalizado para tu campaña'
                  }
                </p>
              </div>
            </div>
            
            {!isCompleted && (
              <button
                onClick={handleCancel}
                className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
                title="Cancelar generación"
              >
                <HiX className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {isCompleted && finalSummary ? (
            /* Resumen Final */
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HiCheckCircle className="w-8 h-8 text-success-600" />
                </div>
                <h2 className="text-2xl font-semibold text-secondary-900 mb-2">
                  ¡Generación Completada!
                </h2>
                <p className="text-secondary-600">
                  Tu campaña ha sido creada con contenido personalizado
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary-50 rounded-xl">
                  <div className="text-2xl font-bold text-primary-600">
                    {finalSummary.totalGenerated}
                  </div>
                  <div className="text-sm text-primary-700">
                    Publicaciones Generadas
                  </div>
                </div>
                
                <div className="text-center p-4 bg-secondary-50 rounded-xl">
                  <div className="text-2xl font-bold text-secondary-600">
                    {formatTime(finalSummary.duration)}
                  </div>
                  <div className="text-sm text-secondary-700">
                    Tiempo Total
                  </div>
                </div>
                
                <div className="text-center p-4 bg-success-50 rounded-xl">
                  <div className="text-2xl font-bold text-success-600">
                    {finalSummary.totalGenerated > 0 
                      ? Math.round(((finalSummary.totalGenerated - finalSummary.totalErrors) / finalSummary.totalGenerated) * 100)
                      : 0
                    }%
                  </div>
                  <div className="text-sm text-success-700">
                    Tasa de Éxito
                  </div>
                </div>
              </div>

              {finalSummary.totalErrors > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <HiExclamationCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-900 mb-1">
                        Algunas publicaciones tuvieron errores
                      </h3>
                      <p className="text-yellow-700 text-sm">
                        {finalSummary.totalErrors} publicaciones no pudieron ser generadas. 
                        Puedes regenerarlas individualmente desde el calendario.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Progreso de Generación */
            <div className="space-y-6">
              {/* Barra de Progreso General */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-secondary-700">
                    Progreso General
                  </span>
                  <span className="text-sm text-secondary-600">
                    {progress.completedPublications} de {progress.totalPublications} publicaciones
                  </span>
                </div>
                
                <div className="w-full bg-secondary-200 rounded-full h-3 relative overflow-hidden">
                  <div 
                    className="bg-primary-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, getProgressPercentage()))}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center mt-2 text-xs text-secondary-500">
                  <span>{getProgressPercentage()}% completado</span>
                  {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
                    <span className="flex items-center gap-1">
                      <HiClock className="w-3 h-3" />
                      ~{formatTime(Math.round(progress.estimatedTimeRemaining / 1000))} restante
                    </span>
                  )}
                </div>
              </div>

              {/* Indicador de Progreso Detallado */}
              <GenerationProgressIndicator
                progress={progress}
                contentPlan={contentPlan}
              />

              {/* Notificaciones de Progreso */}
              {notifications.length > 0 && (
                <GenerationNotifications
                  notifications={notifications}
                  onRetry={handleRetryPublication}
                  onDismiss={handleDismissNotification}
                  maxVisible={3}
                />
              )}

              {/* Errores si los hay */}
              {progress.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <HiExclamationCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-red-900 mb-2">
                        Errores durante la generación ({progress.errors.length})
                      </h3>
                      <div className="space-y-2 mb-3">
                        {progress.errors.slice(-3).map((error, index) => (
                          <div key={index} className="text-sm text-red-700">
                            <span className="font-medium">
                              {contentPlan.find(item => item.id === error.publicationId)?.title || 'Publicación'}:
                            </span>
                            {' '}{error.errorMessage}
                          </div>
                        ))}
                        {progress.errors.length > 3 && (
                          <div className="text-sm text-red-600 font-medium">
                            ... y {progress.errors.length - 3} errores más
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                        >
                          <HiRefresh className="w-3 h-3" />
                          Reintentar Fallidas
                        </button>
                        <button
                          type="button"
                          onClick={() => toast('Las publicaciones fallidas se pueden regenerar individualmente desde el calendario', { icon: 'ℹ️', duration: 4000 })}
                          className="px-3 py-1 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors"
                        >
                          Más Info
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-secondary-200">
          {isCompleted ? (
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors flex items-center gap-2"
              >
                <HiRefresh className="w-4 h-4" />
                Regenerar Todo
              </button>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleViewCalendar}
                  className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-2"
                >
                  <HiClock className="w-4 h-4" />
                  Ver en Calendario
                </button>
                
                <button
                  type="button"
                  onClick={handleComplete}
                  className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Ver Campañas
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between">
              <div className="text-sm text-secondary-600">
                {isGenerating ? 'Generando contenido...' : 'Preparando generación...'}
              </div>
              
              <div className="flex gap-3">
                {showCancelConfirm ? (
                  <>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
                    >
                      Continuar
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Confirmar Cancelación
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCancel}
                    disabled={!isGenerating}
                    className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}