import { GenerationError, ErrorUtils } from '../types/errors'

export type NotificationType = 'success' | 'info' | 'warning' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  duration?: number
  actions?: NotificationAction[]
  context?: {
    publicationId?: string
    campaignId?: string
    agentType?: string
    error?: GenerationError
  }
  persistent?: boolean
  dismissed?: boolean
}

export interface NotificationAction {
  label: string
  action: 'retry' | 'cancel' | 'view-details' | 'contact-support' | 'custom'
  handler?: () => void | Promise<void>
  primary?: boolean
}

export interface NotificationConfig {
  enableToast: boolean
  enablePersistent: boolean
  defaultDuration: number
  maxNotifications: number
  groupSimilar: boolean
  enableSound: boolean
}

/**
 * Servicio de notificaciones para errores y eventos de generación de IA
 * Proporciona notificaciones amigables al usuario con opciones de acción
 */
export class NotificationService {
  private config: NotificationConfig
  private notifications: Notification[] = []
  private listeners: ((notification: Notification) => void)[] = []

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = {
      enableToast: config.enableToast ?? true,
      enablePersistent: config.enablePersistent ?? true,
      defaultDuration: config.defaultDuration ?? 5000,
      maxNotifications: config.maxNotifications ?? 50,
      groupSimilar: config.groupSimilar ?? true,
      enableSound: config.enableSound ?? false
    }
  }

  /**
   * Notifica error de generación con opciones de recuperación
   */
  notifyGenerationError(
    error: GenerationError,
    context: {
      publicationId?: string
      campaignId?: string
      agentType?: string
      retryHandler?: () => Promise<void>
      cancelHandler?: () => void
    }
  ): string {
    const userMessage = ErrorUtils.getUserFriendlyMessage(error)
    const actions: NotificationAction[] = []

    // Agregar acción de reintento si el error es retryable
    if (error.retryable && context.retryHandler) {
      actions.push({
        label: 'Reintentar',
        action: 'retry',
        handler: context.retryHandler,
        primary: true
      })
    }

    // Agregar acción de cancelar
    if (context.cancelHandler) {
      actions.push({
        label: 'Cancelar',
        action: 'cancel',
        handler: context.cancelHandler
      })
    }

    // Agregar acción de ver detalles para errores críticos
    if (ErrorUtils.isCriticalError(error)) {
      actions.push({
        label: 'Ver detalles',
        action: 'view-details',
        handler: () => this.showErrorDetails(error)
      })
    }

    // Agregar contacto de soporte para errores persistentes
    if (error.retryCount && error.retryCount > 2) {
      actions.push({
        label: 'Contactar soporte',
        action: 'contact-support',
        handler: () => this.contactSupport(error, context)
      })
    }

    return this.notify({
      type: 'error',
      title: this.getErrorTitle(error),
      message: userMessage,
      actions,
      context: {
        ...context,
        error
      },
      persistent: ErrorUtils.isCriticalError(error),
      duration: error.retryable ? this.config.defaultDuration : undefined
    })
  }

  /**
   * Notifica progreso de generación
   */
  notifyGenerationProgress(
    message: string,
    context: {
      publicationId?: string
      campaignId?: string
      agentType?: string
      progress?: number
      total?: number
    }
  ): string {
    const progressText = context.progress && context.total 
      ? ` (${context.progress}/${context.total})`
      : ''

    return this.notify({
      type: 'info',
      title: 'Generando contenido',
      message: `${message}${progressText}`,
      context,
      duration: 3000
    })
  }

  /**
   * Notifica éxito de generación
   */
  notifyGenerationSuccess(
    message: string,
    context: {
      publicationId?: string
      campaignId?: string
      agentType?: string
      viewHandler?: () => void
    }
  ): string {
    const actions: NotificationAction[] = []

    if (context.viewHandler) {
      actions.push({
        label: 'Ver resultado',
        action: 'custom',
        handler: context.viewHandler,
        primary: true
      })
    }

    return this.notify({
      type: 'success',
      title: 'Contenido generado',
      message,
      actions,
      context,
      duration: this.config.defaultDuration
    })
  }

  /**
   * Notifica advertencia durante generación
   */
  notifyGenerationWarning(
    message: string,
    context: {
      publicationId?: string
      campaignId?: string
      agentType?: string
      continueHandler?: () => Promise<void>
      cancelHandler?: () => void
    }
  ): string {
    const actions: NotificationAction[] = []

    if (context.continueHandler) {
      actions.push({
        label: 'Continuar',
        action: 'custom',
        handler: context.continueHandler,
        primary: true
      })
    }

    if (context.cancelHandler) {
      actions.push({
        label: 'Cancelar',
        action: 'cancel',
        handler: context.cancelHandler
      })
    }

    return this.notify({
      type: 'warning',
      title: 'Atención requerida',
      message,
      actions,
      context,
      persistent: true
    })
  }

  /**
   * Notifica información general
   */
  notifyInfo(
    title: string,
    message: string,
    context?: {
      publicationId?: string
      campaignId?: string
      agentType?: string
    }
  ): string {
    return this.notify({
      type: 'info',
      title,
      message,
      context,
      duration: this.config.defaultDuration
    })
  }

  /**
   * Método principal de notificación
   */
  private notify(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    // Verificar si se debe agrupar con notificación similar
    if (this.config.groupSimilar) {
      const similar = this.findSimilarNotification(notification)
      if (similar) {
        return this.updateNotification(similar.id, notification)
      }
    }

    const fullNotification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      duration: notification.duration ?? this.config.defaultDuration,
      ...notification
    }

    // Agregar a lista de notificaciones
    this.notifications.push(fullNotification)

    // Mantener límite de notificaciones
    if (this.notifications.length > this.config.maxNotifications) {
      this.notifications = this.notifications.slice(-this.config.maxNotifications)
    }

    // Notificar a listeners
    this.notifyListeners(fullNotification)

    // Auto-dismiss si no es persistente
    if (!fullNotification.persistent && fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.dismissNotification(fullNotification.id)
      }, fullNotification.duration)
    }

    return fullNotification.id
  }

  /**
   * Busca notificación similar para agrupar
   */
  private findSimilarNotification(notification: Omit<Notification, 'id' | 'timestamp'>): Notification | null {
    return this.notifications.find(n => 
      !n.dismissed &&
      n.type === notification.type &&
      n.title === notification.title &&
      n.context?.publicationId === notification.context?.publicationId &&
      n.context?.agentType === notification.context?.agentType
    ) || null
  }

  /**
   * Actualiza notificación existente
   */
  private updateNotification(id: string, updates: Partial<Notification>): string {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      Object.assign(notification, {
        ...updates,
        timestamp: new Date() // Actualizar timestamp
      })
      this.notifyListeners(notification)
    }
    return id
  }

  /**
   * Descarta notificación
   */
  dismissNotification(id: string): void {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.dismissed = true
      this.notifyListeners(notification)
    }
  }

  /**
   * Descarta todas las notificaciones
   */
  dismissAll(): void {
    this.notifications.forEach(n => {
      if (!n.dismissed) {
        n.dismissed = true
        this.notifyListeners(n)
      }
    })
  }

  /**
   * Descarta notificaciones por contexto
   */
  dismissByContext(context: {
    publicationId?: string
    campaignId?: string
    agentType?: string
  }): void {
    this.notifications
      .filter(n => 
        !n.dismissed &&
        (!context.publicationId || n.context?.publicationId === context.publicationId) &&
        (!context.campaignId || n.context?.campaignId === context.campaignId) &&
        (!context.agentType || n.context?.agentType === context.agentType)
      )
      .forEach(n => {
        n.dismissed = true
        this.notifyListeners(n)
      })
  }

  /**
   * Obtiene notificaciones activas
   */
  getActiveNotifications(): Notification[] {
    return this.notifications
      .filter(n => !n.dismissed)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Obtiene todas las notificaciones
   */
  getAllNotifications(): Notification[] {
    return [...this.notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Obtiene notificaciones por contexto
   */
  getNotificationsByContext(context: {
    publicationId?: string
    campaignId?: string
    agentType?: string
  }): Notification[] {
    return this.notifications
      .filter(n => 
        (!context.publicationId || n.context?.publicationId === context.publicationId) &&
        (!context.campaignId || n.context?.campaignId === context.campaignId) &&
        (!context.agentType || n.context?.agentType === context.agentType)
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Registra listener para notificaciones
   */
  addListener(listener: (notification: Notification) => void): () => void {
    this.listeners.push(listener)
    
    // Retornar función para remover listener
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notifica a todos los listeners
   */
  private notifyListeners(notification: Notification): void {
    this.listeners.forEach(listener => {
      try {
        listener(notification)
      } catch (error) {
        console.error('Error in notification listener:', error)
      }
    })
  }

  /**
   * Obtiene título apropiado para error
   */
  private getErrorTitle(error: GenerationError): string {
    const titles: Record<string, string> = {
      'GEMINI_API_FAILURE': 'Error en generación de texto',
      'NANO_BANANA_API_FAILURE': 'Error en generación de imagen',
      'NETWORK_ERROR': 'Error de conexión',
      'TIMEOUT_ERROR': 'Tiempo de espera agotado',
      'RATE_LIMIT_ERROR': 'Límite de uso alcanzado',
      'VALIDATION_ERROR': 'Error de validación',
      'RESOURCE_NOT_FOUND': 'Recurso no encontrado',
      'TEMPLATE_ERROR': 'Error en template',
      'CONTENT_TOO_LONG': 'Contenido demasiado largo',
      'INSUFFICIENT_CREDITS': 'Créditos insuficientes',
      'TEMPORARY_UNAVAILABLE': 'Servicio no disponible',
      'UNKNOWN_ERROR': 'Error inesperado'
    }

    return titles[error.type] || titles['UNKNOWN_ERROR']
  }

  /**
   * Muestra detalles del error
   */
  private showErrorDetails(error: GenerationError): void {
    // En implementación real, esto abriría un modal o página de detalles
    console.group('🔍 Detalles del Error')
    console.log('Tipo:', error.type)
    console.log('Mensaje:', error.message)
    console.log('Timestamp:', error.timestamp.toISOString())
    console.log('Retryable:', error.retryable)
    console.log('Contexto:', error.context)
    console.log('Reintentos:', error.retryCount || 0)
    console.groupEnd()
  }

  /**
   * Contacta soporte con información del error
   */
  private contactSupport(
    error: GenerationError, 
    context: {
      publicationId?: string
      campaignId?: string
      agentType?: string
    }
  ): void {
    // En implementación real, esto abriría un formulario de soporte o enviaría email
    const supportData = {
      errorType: error.type,
      errorMessage: error.message,
      timestamp: error.timestamp.toISOString(),
      context: {
        ...error.context,
        ...context
      },
      retryCount: error.retryCount,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    console.log('📧 Contactando soporte con datos:', supportData)
    
    // Simular apertura de formulario de soporte
    alert(`Se ha preparado un reporte de error para soporte técnico.\n\nTipo: ${error.type}\nMensaje: ${error.message}\n\nEn una implementación real, esto abriría un formulario de contacto.`)
  }

  /**
   * Limpia notificaciones antiguas
   */
  cleanup(olderThanHours: number = 24): number {
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours)

    const initialCount = this.notifications.length
    this.notifications = this.notifications.filter(n => 
      n.timestamp > cutoffTime || (!n.dismissed && n.persistent)
    )

    return initialCount - this.notifications.length
  }

  /**
   * Actualiza configuración
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Obtiene configuración actual
   */
  getConfig(): NotificationConfig {
    return { ...this.config }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats(): {
    totalNotifications: number
    activeNotifications: number
    notificationsByType: Record<NotificationType, number>
    averageResponseTime: number
    dismissalRate: number
  } {
    const total = this.notifications.length
    const active = this.getActiveNotifications().length
    const dismissed = this.notifications.filter(n => n.dismissed).length

    const byType: Record<NotificationType, number> = {
      success: 0,
      info: 0,
      warning: 0,
      error: 0
    }

    this.notifications.forEach(n => {
      byType[n.type]++
    })

    return {
      totalNotifications: total,
      activeNotifications: active,
      notificationsByType: byType,
      averageResponseTime: 0, // Calcular basado en tiempo entre notificación y acción
      dismissalRate: total > 0 ? (dismissed / total) * 100 : 0
    }
  }
}

/**
 * Instancia global del servicio de notificaciones
 */
export const notificationService = new NotificationService({
  enableToast: true,
  enablePersistent: true,
  defaultDuration: 5000,
  maxNotifications: 100,
  groupSimilar: true,
  enableSound: false
})

