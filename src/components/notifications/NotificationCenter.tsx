'use client'

import React, { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, RotateCcw, ExternalLink } from 'lucide-react'
import { notificationService, Notification, NotificationType } from '../../lib/ai/monitoring/NotificationService'

interface NotificationCenterProps {
  maxVisible?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  showPersistent?: boolean
}

export function NotificationCenter({ 
  maxVisible = 5, 
  position = 'top-right',
  showPersistent = true 
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Cargar notificaciones existentes
    setNotifications(notificationService.getActiveNotifications())

    // Suscribirse a nuevas notificaciones
    const unsubscribe = notificationService.addListener((notification) => {
      setNotifications(current => {
        const existing = current.find(n => n.id === notification.id)
        if (existing) {
          // Actualizar notificación existente
          return current.map(n => n.id === notification.id ? notification : n)
        } else if (!notification.dismissed) {
          // Agregar nueva notificación
          return [notification, ...current].slice(0, 50) // Limitar en UI
        } else {
          // Remover notificación descartada
          return current.filter(n => n.id !== notification.id)
        }
      })
    })

    return unsubscribe
  }, [])

  const handleDismiss = (id: string) => {
    notificationService.dismissNotification(id)
  }

  const handleDismissAll = () => {
    notificationService.dismissAll()
  }

  const handleAction = async (notification: Notification, actionIndex: number) => {
    const action = notification.actions?.[actionIndex]
    if (action?.handler) {
      try {
        await action.handler()
      } catch (error) {
        console.error('Error executing notification action:', error)
      }
    }
  }

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getBackgroundColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-right':
      default:
        return 'top-4 right-4'
    }
  }

  const visibleNotifications = notifications.slice(0, isExpanded ? notifications.length : maxVisible)
  const hiddenCount = Math.max(0, notifications.length - maxVisible)

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 w-96 max-w-sm space-y-2`}>
      {/* Header con contador y controles */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow-lg border p-3">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-gray-900">
              Notificaciones ({notifications.length})
            </div>
            {hiddenCount > 0 && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                +{hiddenCount} más
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {isExpanded && hiddenCount === 0 && (
              <button
                onClick={() => setIsExpanded(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Contraer
              </button>
            )}
            <button
              onClick={handleDismissAll}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Descartar todo
            </button>
          </div>
        </div>
      )}

      {/* Lista de notificaciones */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {visibleNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={handleDismiss}
            onAction={handleAction}
            getIcon={getIcon}
            getBackgroundColor={getBackgroundColor}
          />
        ))}
      </div>
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onDismiss: (id: string) => void
  onAction: (notification: Notification, actionIndex: number) => void
  getIcon: (type: NotificationType) => React.ReactNode
  getBackgroundColor: (type: NotificationType) => string
}

function NotificationItem({ 
  notification, 
  onDismiss, 
  onAction, 
  getIcon, 
  getBackgroundColor 
}: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-dismiss para notificaciones no persistentes
    if (!notification.persistent && notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismiss(notification.id), 300) // Delay para animación
      }, notification.duration)

      return () => clearTimeout(timer)
    }
  }, [notification, onDismiss])

  if (!isVisible) {
    return null
  }

  return (
    <div className={`
      ${getBackgroundColor(notification.type)}
      rounded-lg shadow-lg border p-4 transition-all duration-300 ease-in-out
      transform hover:scale-105
    `}>
      <div className="flex items-start space-x-3">
        {/* Icono */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon(notification.type)}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                {notification.message}
              </p>
              
              {/* Contexto adicional */}
              {notification.context && (
                <div className="text-xs text-gray-500 mb-2">
                  {notification.context.publicationId && (
                    <span className="mr-2">Pub: {notification.context.publicationId.slice(-8)}</span>
                  )}
                  {notification.context.agentType && (
                    <span className="mr-2">Agente: {notification.context.agentType}</span>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-400">
                {formatTimestamp(notification.timestamp)}
              </div>
            </div>

            {/* Botón de cerrar */}
            <button
              onClick={() => onDismiss(notification.id)}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Acciones */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex items-center space-x-2 mt-3">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => onAction(notification, index)}
                  className={`
                    inline-flex items-center px-3 py-1 text-xs font-medium rounded-md
                    transition-colors duration-200
                    ${action.primary 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                  `}
                >
                  {getActionIcon(action.action)}
                  <span className="ml-1">{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case 'retry':
      return <RotateCcw className="w-3 h-3" />
    case 'view-details':
      return <ExternalLink className="w-3 h-3" />
    default:
      return null
  }
}

function formatTimestamp(timestamp: Date): string {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  
  if (diff < 60000) { // Menos de 1 minuto
    return 'Ahora'
  } else if (diff < 3600000) { // Menos de 1 hora
    const minutes = Math.floor(diff / 60000)
    return `Hace ${minutes}m`
  } else if (diff < 86400000) { // Menos de 1 día
    const hours = Math.floor(diff / 3600000)
    return `Hace ${hours}h`
  } else {
    return timestamp.toLocaleDateString()
  }
}

export default NotificationCenter