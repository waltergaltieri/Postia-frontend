'use client'

import { useState, useEffect } from 'react'
import { notificationService, type Notification } from './NotificationService'

/**
 * Hook para React components
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const unsubscribe = notificationService.addListener((notification) => {
      setNotifications(current => {
        const existing = current.find(n => n.id === notification.id)
        if (existing) {
          return current.map(n => n.id === notification.id ? notification : n)
        } else {
          return [notification, ...current].slice(0, 50) // Limitar en UI
        }
      })
    })

    return unsubscribe
  }, [])

  const dismissNotification = (id: string) => {
    notificationService.dismiss(id)
  }

  const clearAll = () => {
    notificationService.clearAll()
  }

  return {
    notifications,
    dismissNotification,
    clearAll
  }
}