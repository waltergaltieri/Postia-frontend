'use client'

import React, { useState, useEffect } from 'react'
import { 
  HiCheckCircle, 
  HiExclamationCircle, 
  HiInformationCircle,
  HiX,
  HiRefresh
} from 'react-icons/hi'
import { cn } from '@/utils'
import type { ProgressNotification } from '@/lib/services/GenerationProgressService'

interface GenerationNotificationsProps {
  notifications: ProgressNotification[]
  onRetry?: (publicationId: string) => void
  onDismiss?: (index: number) => void
  maxVisible?: number
}

export function GenerationNotifications({
  notifications,
  onRetry,
  onDismiss,
  maxVisible = 5
}: GenerationNotificationsProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<ProgressNotification[]>([])

  useEffect(() => {
    // Mostrar solo las notificaciones más recientes
    const recent = notifications.slice(-maxVisible)
    setVisibleNotifications(recent)
  }, [notifications, maxVisible])

  const getNotificationIcon = (type: ProgressNotification['type']) => {
    switch (type) {
      case 'success':
        return HiCheckCircle
      case 'error':
        return HiExclamationCircle
      case 'complete':
        return HiCheckCircle
      default:
        return HiInformationCircle
    }
  }

  const getNotificationStyles = (type: ProgressNotification['type']) => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-success-50 border-success-200',
          icon: 'text-success-600',
          text: 'text-success-900',
          subtext: 'text-success-700'
        }
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          text: 'text-red-900',
          subtext: 'text-red-700'
        }
      case 'complete':
        return {
          container: 'bg-primary-50 border-primary-200',
          icon: 'text-primary-600',
          text: 'text-primary-900',
          subtext: 'text-primary-700'
        }
      default:
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-900',
          subtext: 'text-blue-700'
        }
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (visibleNotifications.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-secondary-700 mb-2">
        Notificaciones de Progreso
      </h4>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {visibleNotifications.map((notification, index) => {
          const Icon = getNotificationIcon(notification.type)
          const styles = getNotificationStyles(notification.type)
          const actualIndex = notifications.length - visibleNotifications.length + index

          return (
            <div
              key={`${notification.timestamp.getTime()}-${index}`}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all duration-300",
                styles.container
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Icon className={cn("w-4 h-4", styles.icon)} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", styles.text)}>
                  {notification.message}
                </p>
                
                <div className="flex items-center justify-between mt-1">
                  <span className={cn("text-xs", styles.subtext)}>
                    {formatTime(notification.timestamp)}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {notification.type === 'error' && notification.publicationId && onRetry && (
                      <button
                        onClick={() => onRetry(notification.publicationId!)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                      >
                        <HiRefresh className="w-3 h-3" />
                        Reintentar
                      </button>
                    )}
                    
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(actualIndex)}
                        className={cn(
                          "text-xs hover:bg-opacity-20 p-1 rounded transition-colors",
                          styles.subtext
                        )}
                        title="Descartar notificación"
                      >
                        <HiX className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {notifications.length > maxVisible && (
        <div className="text-center">
          <span className="text-xs text-secondary-500">
            Mostrando {maxVisible} de {notifications.length} notificaciones
          </span>
        </div>
      )}
    </div>
  )
}