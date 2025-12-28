import type { 
  GenerationProgress, 
  GenerationError,
  CreateGenerationProgressData,
  UpdateGenerationProgressData
} from '../../database/types'
import { DatabaseService } from '../../database/DatabaseService'

/**
 * Servicio especializado para tracking de progreso de generación de contenido
 * Maneja monitoreo en tiempo real, estimaciones y persistencia
 */
export class ProgressTrackingService {
  private databaseService: DatabaseService
  private progressCache = new Map<string, GenerationProgress>()
  private estimationCache = new Map<string, number>() // campaignId -> avgTimePerPublication

  constructor() {
    this.databaseService = new DatabaseService()
  }

  /**
   * Crea un nuevo registro de progreso para una campaña
   */
  async createProgress(campaignId: string, totalPublications: number): Promise<GenerationProgress> {
    console.log(`📊 Creating progress tracking for campaign ${campaignId} with ${totalPublications} publications`)

    const progressData: CreateGenerationProgressData = {
      campaignId,
      totalPublications,
      completedPublications: 0,
      currentPublicationId: undefined,
      currentAgent: undefined,
      currentStep: 'initializing',
      errors: [],
      startedAt: new Date(),
      completedAt: undefined,
      estimatedTimeRemaining: this.estimateInitialTime(totalPublications)
    }

    try {
      const progress = await this.databaseService.createGenerationProgress(progressData)
      
      // Cachear para acceso rápido
      this.progressCache.set(campaignId, progress)
      
      console.log(`✅ Progress tracking created: ${progress.id}`)
      return progress
      
    } catch (error) {
      console.error('❌ Error creating progress tracking:', error)
      throw new Error(`Failed to create progress tracking: ${error}`)
    }
  }

  /**
   * Actualiza el progreso con información de la publicación actual
   */
  async updateCurrentPublication(
    progressId: string, 
    publicationId: string, 
    agentType: string,
    step: string = 'processing'
  ): Promise<GenerationProgress> {
    console.log(`🔄 Updating current publication: ${publicationId} with agent ${agentType}`)

    const updates: UpdateGenerationProgressData = {
      currentPublicationId: publicationId,
      currentAgent: agentType,
      currentStep: step,
      estimatedTimeRemaining: await this.calculateRemainingTime(progressId)
    }

    return await this.updateProgress(progressId, updates)
  }

  /**
   * Incrementa el contador de publicaciones completadas
   */
  async incrementCompleted(progressId: string): Promise<GenerationProgress> {
    const currentProgress = await this.getProgressById(progressId)
    if (!currentProgress) {
      throw new Error(`Progress not found: ${progressId}`)
    }

    const newCompleted = currentProgress.completedPublications + 1
    console.log(`📈 Incrementing completed: ${newCompleted}/${currentProgress.totalPublications}`)

    // Actualizar estimación basada en progreso real
    await this.updateTimeEstimation(currentProgress.campaignId, currentProgress.startedAt, newCompleted)

    const updates: UpdateGenerationProgressData = {
      completedPublications: newCompleted,
      currentPublicationId: undefined,
      currentAgent: undefined,
      currentStep: newCompleted >= currentProgress.totalPublications ? 'completed' : 'processing',
      estimatedTimeRemaining: await this.calculateRemainingTime(progressId, newCompleted)
    }

    return await this.updateProgress(progressId, updates)
  }

  /**
   * Agrega un error al registro de progreso
   */
  async addError(progressId: string, error: GenerationError): Promise<void> {
    console.log(`❌ Adding error to progress ${progressId}: ${error.errorMessage}`)

    const currentProgress = await this.getProgressById(progressId)
    if (!currentProgress) {
      throw new Error(`Progress not found: ${progressId}`)
    }

    const updatedErrors = [...currentProgress.errors, error]

    await this.updateProgress(progressId, {
      errors: updatedErrors,
      currentStep: 'error_handling'
    })
  }

  /**
   * Marca el progreso como completado
   */
  async completeProgress(progressId: string): Promise<GenerationProgress> {
    console.log(`🎉 Completing progress: ${progressId}`)

    const updates: UpdateGenerationProgressData = {
      completedAt: new Date(),
      currentPublicationId: undefined,
      currentAgent: undefined,
      currentStep: 'completed',
      estimatedTimeRemaining: 0
    }

    const completedProgress = await this.updateProgress(progressId, updates)
    
    // Limpiar cache
    this.progressCache.delete(completedProgress.campaignId)
    
    return completedProgress
  }

  /**
   * Obtiene el progreso por ID de campaña
   */
  async getProgress(campaignId: string): Promise<GenerationProgress | null> {
    // Intentar desde cache primero
    const cached = this.progressCache.get(campaignId)
    if (cached) {
      return cached
    }

    try {
      const progress = await this.databaseService.getGenerationProgressByCampaign(campaignId)
      
      if (progress) {
        // Cachear para próximas consultas
        this.progressCache.set(campaignId, progress)
      }
      
      return progress
      
    } catch (error) {
      console.error('❌ Error getting progress:', error)
      return null
    }
  }

  /**
   * Obtiene el progreso por ID de progreso
   */
  async getProgressById(progressId: string): Promise<GenerationProgress | null> {
    try {
      return await this.databaseService.getGenerationProgress(progressId)
    } catch (error) {
      console.error('❌ Error getting progress by ID:', error)
      return null
    }
  }

  /**
   * Actualiza el progreso con datos parciales
   */
  private async updateProgress(
    progressId: string, 
    updates: UpdateGenerationProgressData
  ): Promise<GenerationProgress> {
    try {
      const updatedProgress = await this.databaseService.updateGenerationProgress(progressId, updates)
      
      // Actualizar cache
      this.progressCache.set(updatedProgress.campaignId, updatedProgress)
      
      return updatedProgress
      
    } catch (error) {
      console.error('❌ Error updating progress:', error)
      throw new Error(`Failed to update progress: ${error}`)
    }
  }

  /**
   * Calcula el tiempo restante estimado
   */
  private async calculateRemainingTime(
    progressId: string, 
    completedOverride?: number
  ): Promise<number> {
    const progress = await this.getProgressById(progressId)
    if (!progress) return 0

    const completed = completedOverride ?? progress.completedPublications
    const remaining = progress.totalPublications - completed

    if (remaining <= 0) return 0

    // Obtener estimación promedio por publicación
    const avgTimePerPublication = this.estimationCache.get(progress.campaignId) || this.getDefaultTimePerPublication()

    return remaining * avgTimePerPublication
  }

  /**
   * Actualiza la estimación de tiempo basada en progreso real
   */
  private async updateTimeEstimation(
    campaignId: string, 
    startedAt: Date, 
    completedPublications: number
  ): Promise<void> {
    if (completedPublications === 0) return

    const elapsedMs = Date.now() - startedAt.getTime()
    const avgTimePerPublication = elapsedMs / completedPublications

    // Actualizar cache de estimación
    this.estimationCache.set(campaignId, avgTimePerPublication)

    console.log(`⏱️ Updated time estimation for ${campaignId}: ${Math.round(avgTimePerPublication / 1000)}s per publication`)
  }

  /**
   * Estima el tiempo inicial total
   */
  private estimateInitialTime(totalPublications: number): number {
    const baseTimePerPublication = this.getDefaultTimePerPublication()
    return totalPublications * baseTimePerPublication
  }

  /**
   * Obtiene el tiempo por defecto por publicación (en ms)
   */
  private getDefaultTimePerPublication(): number {
    // Estimaciones base por tipo de contenido (promedio)
    return 15000 // 15 segundos por publicación (promedio)
  }

  /**
   * Obtiene estadísticas del progreso
   */
  async getProgressStats(campaignId: string): Promise<{
    percentage: number
    completedCount: number
    totalCount: number
    errorCount: number
    estimatedTimeRemaining: number
    elapsedTime: number
    averageTimePerPublication: number
  } | null> {
    const progress = await this.getProgress(campaignId)
    if (!progress) return null

    const percentage = progress.totalPublications > 0 
      ? Math.round((progress.completedPublications / progress.totalPublications) * 100)
      : 0

    const elapsedTime = progress.completedAt 
      ? progress.completedAt.getTime() - progress.startedAt.getTime()
      : Date.now() - progress.startedAt.getTime()

    const averageTimePerPublication = progress.completedPublications > 0
      ? elapsedTime / progress.completedPublications
      : this.getDefaultTimePerPublication()

    return {
      percentage,
      completedCount: progress.completedPublications,
      totalCount: progress.totalPublications,
      errorCount: progress.errors.length,
      estimatedTimeRemaining: progress.estimatedTimeRemaining || 0,
      elapsedTime,
      averageTimePerPublication
    }
  }

  /**
   * Limpia el cache de progreso
   */
  clearCache(campaignId?: string): void {
    if (campaignId) {
      this.progressCache.delete(campaignId)
      this.estimationCache.delete(campaignId)
    } else {
      this.progressCache.clear()
      this.estimationCache.clear()
    }
  }

  /**
   * Obtiene todas las generaciones activas
   */
  getActiveGenerations(): string[] {
    return Array.from(this.progressCache.keys())
  }

  /**
   * Verifica si una generación está activa
   */
  async isGenerationActive(campaignId: string): Promise<boolean> {
    const progress = await this.getProgress(campaignId)
    return progress !== null && !progress.completedAt
  }

  /**
   * Obtiene métricas del servicio
   */
  getServiceMetrics(): {
    cachedProgresses: number
    cachedEstimations: number
    averageEstimationAccuracy: number
  } {
    return {
      cachedProgresses: this.progressCache.size,
      cachedEstimations: this.estimationCache.size,
      averageEstimationAccuracy: 0.85 // Placeholder - se podría calcular basado en datos históricos
    }
  }
}

/**
 * Factory function para crear instancia del servicio
 */
export function createProgressTrackingService(): ProgressTrackingService {
  try {
    return new ProgressTrackingService()
  } catch (error) {
    console.error('❌ Error creating ProgressTrackingService:', error)
    throw error
  }
}