import type { GenerationProgress, GenerationError } from '@/components/campaigns/ContentGenerationLoadingScreen'

export interface ProgressNotification {
  type: 'progress' | 'success' | 'error' | 'complete'
  message: string
  publicationId?: string
  publicationTitle?: string
  timestamp: Date
}

export interface GenerationProgressService {
  startGeneration(campaignId: string): Promise<string> // Returns generation ID
  getProgress(generationId: string): Promise<GenerationProgress>
  cancelGeneration(generationId: string): Promise<boolean>
  subscribeToProgress(generationId: string, callback: (progress: GenerationProgress) => void): () => void
  subscribeToNotifications(generationId: string, callback: (notification: ProgressNotification) => void): () => void
}

class GenerationProgressServiceImpl implements GenerationProgressService {
  private progressCallbacks = new Map<string, ((progress: GenerationProgress) => void)[]>()
  private notificationCallbacks = new Map<string, ((notification: ProgressNotification) => void)[]>()
  private activeGenerations = new Map<string, GenerationProgress>()
  private pollingIntervals = new Map<string, NodeJS.Timeout>()

  async startGeneration(campaignId: string): Promise<string> {
    const generationId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    try {
      // En el futuro, esto será una llamada real a la API
      const response = await fetch(`/api/campaigns/${campaignId}/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ generationId })
      })

      if (!response.ok) {
        throw new Error('Failed to start generation')
      }

      const data = await response.json()
      return data.generationId || generationId
    } catch (error) {
      console.warn('API not available, using mock generation:', error)
      // Fallback para desarrollo - simular generación
      return generationId
    }
  }

  async getProgress(generationId: string): Promise<GenerationProgress> {
    try {
      // En el futuro, esto será una llamada real a la API
      const response = await fetch(`/api/generation/${generationId}/progress`)
      
      if (!response.ok) {
        throw new Error('Failed to get progress')
      }

      return await response.json()
    } catch (error) {
      console.warn('API not available, using mock progress:', error)
      // Fallback para desarrollo - retornar progreso mock
      return this.activeGenerations.get(generationId) || {
        id: generationId,
        campaignId: 'mock-campaign',
        totalPublications: 0,
        completedPublications: 0,
        errors: [],
        startedAt: new Date()
      }
    }
  }

  async cancelGeneration(generationId: string): Promise<boolean> {
    try {
      // En el futuro, esto será una llamada real a la API
      const response = await fetch(`/api/generation/${generationId}/cancel`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to cancel generation')
      }

      // Limpiar callbacks y polling
      this.cleanup(generationId)
      
      return true
    } catch (error) {
      console.warn('API not available, using mock cancellation:', error)
      // Fallback para desarrollo
      this.cleanup(generationId)
      return true
    }
  }

  subscribeToProgress(generationId: string, callback: (progress: GenerationProgress) => void): () => void {
    if (!this.progressCallbacks.has(generationId)) {
      this.progressCallbacks.set(generationId, [])
    }
    
    this.progressCallbacks.get(generationId)!.push(callback)
    
    // Iniciar polling si no existe
    if (!this.pollingIntervals.has(generationId)) {
      this.startPolling(generationId)
    }

    // Retornar función de cleanup
    return () => {
      const callbacks = this.progressCallbacks.get(generationId)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
        
        // Si no hay más callbacks, detener polling
        if (callbacks.length === 0) {
          this.stopPolling(generationId)
        }
      }
    }
  }

  subscribeToNotifications(generationId: string, callback: (notification: ProgressNotification) => void): () => void {
    if (!this.notificationCallbacks.has(generationId)) {
      this.notificationCallbacks.set(generationId, [])
    }
    
    this.notificationCallbacks.get(generationId)!.push(callback)

    // Retornar función de cleanup
    return () => {
      const callbacks = this.notificationCallbacks.get(generationId)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  private startPolling(generationId: string) {
    const interval = setInterval(async () => {
      try {
        const progress = await this.getProgress(generationId)
        
        // Actualizar progreso local
        const previousProgress = this.activeGenerations.get(generationId)
        this.activeGenerations.set(generationId, progress)
        
        // Notificar callbacks de progreso
        const progressCallbacks = this.progressCallbacks.get(generationId) || []
        progressCallbacks.forEach(callback => callback(progress))
        
        // Generar notificaciones basadas en cambios
        this.generateNotifications(generationId, previousProgress, progress)
        
        // Si la generación está completa, detener polling
        if (progress.completedAt || progress.completedPublications >= progress.totalPublications) {
          this.stopPolling(generationId)
        }
      } catch (error) {
        console.error('Error polling progress:', error)
        
        // Notificar error
        const notification: ProgressNotification = {
          type: 'error',
          message: 'Error al obtener progreso de generación',
          timestamp: new Date()
        }
        
        const notificationCallbacks = this.notificationCallbacks.get(generationId) || []
        notificationCallbacks.forEach(callback => callback(notification))
      }
    }, 2000) // Poll cada 2 segundos

    this.pollingIntervals.set(generationId, interval)
  }

  private stopPolling(generationId: string) {
    const interval = this.pollingIntervals.get(generationId)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(generationId)
    }
  }

  private generateNotifications(
    generationId: string, 
    previousProgress: GenerationProgress | undefined, 
    currentProgress: GenerationProgress
  ) {
    const notificationCallbacks = this.notificationCallbacks.get(generationId) || []
    
    if (notificationCallbacks.length === 0) return

    // Notificación de publicación completada
    if (previousProgress && currentProgress.completedPublications > previousProgress.completedPublications) {
      const notification: ProgressNotification = {
        type: 'success',
        message: `Publicación ${currentProgress.completedPublications} de ${currentProgress.totalPublications} completada`,
        timestamp: new Date()
      }
      
      notificationCallbacks.forEach(callback => callback(notification))
    }

    // Notificación de nuevos errores
    if (previousProgress && currentProgress.errors.length > previousProgress.errors.length) {
      const newErrors = currentProgress.errors.slice(previousProgress.errors.length)
      
      newErrors.forEach(error => {
        const notification: ProgressNotification = {
          type: 'error',
          message: `Error en publicación: ${error.errorMessage}`,
          publicationId: error.publicationId,
          timestamp: new Date()
        }
        
        notificationCallbacks.forEach(callback => callback(notification))
      })
    }

    // Notificación de generación completa
    if (currentProgress.completedAt && (!previousProgress || !previousProgress.completedAt)) {
      const notification: ProgressNotification = {
        type: 'complete',
        message: `¡Generación completada! ${currentProgress.completedPublications} publicaciones creadas`,
        timestamp: new Date()
      }
      
      notificationCallbacks.forEach(callback => callback(notification))
    }

    // Notificación de progreso general (cada 25%)
    const currentPercentage = Math.floor((currentProgress.completedPublications / currentProgress.totalPublications) * 4) * 25
    const previousPercentage = previousProgress 
      ? Math.floor((previousProgress.completedPublications / previousProgress.totalPublications) * 4) * 25 
      : 0

    if (currentPercentage > previousPercentage && currentPercentage < 100) {
      const notification: ProgressNotification = {
        type: 'progress',
        message: `${currentPercentage}% completado - ${currentProgress.completedPublications}/${currentProgress.totalPublications} publicaciones`,
        timestamp: new Date()
      }
      
      notificationCallbacks.forEach(callback => callback(notification))
    }
  }

  private cleanup(generationId: string) {
    this.stopPolling(generationId)
    this.progressCallbacks.delete(generationId)
    this.notificationCallbacks.delete(generationId)
    this.activeGenerations.delete(generationId)
  }

  // Método para limpiar todos los recursos al desmontar
  public cleanupAll() {
    this.pollingIntervals.forEach((interval) => clearInterval(interval))
    this.pollingIntervals.clear()
    this.progressCallbacks.clear()
    this.notificationCallbacks.clear()
    this.activeGenerations.clear()
  }
}

// Singleton instance
let progressServiceInstance: GenerationProgressServiceImpl | null = null

export function getGenerationProgressService(): GenerationProgressService {
  if (!progressServiceInstance) {
    progressServiceInstance = new GenerationProgressServiceImpl()
  }
  return progressServiceInstance
}

// Hook para limpiar el servicio al desmontar la aplicación
export function cleanupGenerationProgressService() {
  if (progressServiceInstance) {
    progressServiceInstance.cleanupAll()
    progressServiceInstance = null
  }
}