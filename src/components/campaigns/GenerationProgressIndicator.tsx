'use client'

import React from 'react'
import { 
  HiSparkles,
  HiPhotograph,
  HiViewGrid,
  HiCollection,
  HiCheckCircle,
  HiClock,
  HiExclamationCircle
} from 'react-icons/hi'
import { cn } from '@/utils'
import type { ContentPlanItem } from '@/lib/ai/agents/types'
import type { GenerationProgress } from './ContentGenerationLoadingScreen'

interface GenerationProgressIndicatorProps {
  progress: GenerationProgress
  contentPlan: ContentPlanItem[]
}

export function GenerationProgressIndicator({
  progress,
  contentPlan
}: GenerationProgressIndicatorProps) {
  
  const getAgentInfo = (agentType: GenerationProgress['currentAgent']) => {
    switch (agentType) {
      case 'text-only':
        return {
          name: 'Agente de Texto',
          icon: HiSparkles,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          description: 'Generando contenido de texto optimizado'
        }
      case 'text-image':
        return {
          name: 'Agente de Imagen',
          icon: HiPhotograph,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          description: 'Creando imagen y texto complementario'
        }
      case 'text-template':
        return {
          name: 'Agente de Diseño',
          icon: HiViewGrid,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          description: 'Aplicando plantilla y generando diseño'
        }
      case 'carousel':
        return {
          name: 'Agente de Carrusel',
          icon: HiCollection,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          description: 'Creando carrusel con múltiples imágenes'
        }
      default:
        return {
          name: 'Agente de IA',
          icon: HiSparkles,
          color: 'text-primary-600',
          bgColor: 'bg-primary-100',
          description: 'Procesando contenido'
        }
    }
  }

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'text-only':
        return { icon: HiSparkles, color: 'text-blue-600' }
      case 'text-with-image':
        return { icon: HiPhotograph, color: 'text-green-600' }
      case 'text-with-carousel':
        return { icon: HiCollection, color: 'text-orange-600' }
      default:
        return { icon: HiViewGrid, color: 'text-purple-600' }
    }
  }

  const getPublicationStatus = (publication: ContentPlanItem, index: number) => {
    if (index < progress.completedPublications) {
      return 'completed'
    } else if (publication.id === progress.currentPublicationId) {
      return 'processing'
    } else {
      return 'pending'
    }
  }

  const currentAgent = progress.currentAgent ? getAgentInfo(progress.currentAgent) : null

  return (
    <div className="space-y-6">
      {/* Estado Actual del Agente */}
      {currentAgent && progress.currentStep && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", currentAgent.bgColor)}>
              <currentAgent.icon className={cn("w-6 h-6", currentAgent.color)} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-secondary-900">
                  {currentAgent.name}
                </h3>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse" />
                  <span className="text-xs text-primary-600 font-medium">Activo</span>
                </div>
              </div>
              
              <p className="text-sm text-secondary-600 mb-2">
                {progress.currentStep}
              </p>
              
              {/* Barra de progreso del agente actual */}
              <div className="w-full bg-primary-200 rounded-full h-2 relative">
                <div className="bg-primary-600 h-2 rounded-full animate-pulse absolute top-0 left-0 w-3/5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Publicaciones */}
      <div>
        <h3 className="text-sm font-medium text-secondary-700 mb-3">
          Publicaciones ({progress.completedPublications || 0}/{progress.totalPublications || 0})
        </h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {contentPlan.map((publication, index) => {
            const status = getPublicationStatus(publication, index)
            const contentTypeInfo = getContentTypeIcon(publication.contentType)
            const hasError = progress.errors.some(error => error.publicationId === publication.id)
            
            return (
              <div
                key={publication.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all duration-300",
                  status === 'completed' && !hasError && "bg-success-50 border-success-200",
                  status === 'processing' && "bg-primary-50 border-primary-200 shadow-sm",
                  status === 'pending' && "bg-secondary-50 border-secondary-200",
                  hasError && "bg-red-50 border-red-200"
                )}
              >
                {/* Icono de Estado */}
                <div className="flex-shrink-0">
                  {hasError ? (
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <HiExclamationCircle className="w-4 h-4 text-red-600" />
                    </div>
                  ) : status === 'completed' ? (
                    <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
                      <HiCheckCircle className="w-4 h-4 text-success-600" />
                    </div>
                  ) : status === 'processing' ? (
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center">
                      <HiClock className="w-4 h-4 text-secondary-400" />
                    </div>
                  )}
                </div>

                {/* Información de la Publicación */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn(
                      "text-sm font-medium truncate",
                      status === 'completed' && !hasError && "text-success-900",
                      status === 'processing' && "text-primary-900",
                      status === 'pending' && "text-secondary-700",
                      hasError && "text-red-900"
                    )}>
                      {publication.title}
                    </h4>
                    
                    <div className="flex items-center gap-1">
                      <contentTypeInfo.icon className={cn("w-3 h-3", contentTypeInfo.color)} />
                      <span className="text-xs text-secondary-500 capitalize">
                        {publication.socialNetwork}
                      </span>
                    </div>
                  </div>
                  
                  <p className={cn(
                    "text-xs truncate",
                    status === 'completed' && !hasError && "text-success-700",
                    status === 'processing' && "text-primary-700",
                    status === 'pending' && "text-secondary-500",
                    hasError && "text-red-700"
                  )}>
                    {hasError 
                      ? progress.errors.find(error => error.publicationId === publication.id)?.errorMessage || 'Error desconocido'
                      : status === 'processing' 
                        ? progress.currentStep || 'Procesando...'
                        : status === 'completed'
                          ? 'Contenido generado exitosamente'
                          : publication.description
                    }
                  </p>
                </div>

                {/* Indicador de Número */}
                <div className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  status === 'completed' && !hasError && "bg-success-600 text-white",
                  status === 'processing' && "bg-primary-600 text-white",
                  status === 'pending' && "bg-secondary-300 text-secondary-600",
                  hasError && "bg-red-600 text-white"
                )}>
                  {index + 1}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-4 gap-3 pt-4 border-t border-secondary-200">
        <div className="text-center">
          <div className="text-lg font-semibold text-success-600">
            {progress.completedPublications || 0}
          </div>
          <div className="text-xs text-secondary-600">Completadas</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-primary-600">
            {progress.currentPublicationId ? 1 : 0}
          </div>
          <div className="text-xs text-secondary-600">En Proceso</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-secondary-600">
            {Math.max(0, (progress.totalPublications || 0) - (progress.completedPublications || 0) - (progress.currentPublicationId ? 1 : 0))}
          </div>
          <div className="text-xs text-secondary-600">Pendientes</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">
            {progress.errors?.length || 0}
          </div>
          <div className="text-xs text-secondary-600">Errores</div>
        </div>
      </div>
    </div>
  )
}