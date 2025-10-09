import { BrandManualRepository } from '../repositories/BrandManualRepository'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'
import {
  BrandManual,
  CreateBrandManualData,
  UpdateBrandManualData,
  BrandManualFilters,
  QueryOptions
} from '../types'

/**
 * Business service for brand manual management
 */
export class BrandManualService {
  private brandManualRepo: BrandManualRepository
  private workspaceRepo: WorkspaceRepository

  constructor() {
    this.brandManualRepo = new BrandManualRepository()
    this.workspaceRepo = new WorkspaceRepository()
  }

  /**
   * Get brand manual for workspace (creates default if doesn't exist)
   */
  getBrandManualForWorkspace(workspaceId: string, agencyId: string): BrandManual {
    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a este workspace')
    }

    return this.brandManualRepo.getOrCreateDefault(workspaceId)
  }

  /**
   * Update brand manual for workspace
   */
  updateBrandManualForWorkspace(
    workspaceId: string,
    data: UpdateBrandManualData,
    agencyId: string
  ): BrandManual {
    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a este workspace')
    }

    return this.brandManualRepo.upsertByWorkspaceId(workspaceId, data)
  }

  /**
   * Create brand manual for workspace
   */
  createBrandManualForWorkspace(
    workspaceId: string,
    data: Omit<CreateBrandManualData, 'workspaceId'>,
    agencyId: string
  ): BrandManual {
    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a este workspace')
    }

    // Check if brand manual already exists
    const existing = this.brandManualRepo.findByWorkspaceId(workspaceId)
    if (existing) {
      throw new Error('Ya existe un manual de marca para este workspace')
    }

    return this.brandManualRepo.create({
      ...data,
      workspaceId
    })
  }

  /**
   * Get brand manual by ID
   */
  getBrandManualById(id: string, agencyId: string): BrandManual {
    const brandManual = this.brandManualRepo.findById(id)
    if (!brandManual) {
      throw new Error('Manual de marca no encontrado')
    }

    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(brandManual.workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a este manual de marca')
    }

    return brandManual
  }

  /**
   * Update brand manual by ID
   */
  updateBrandManual(
    id: string,
    data: UpdateBrandManualData,
    agencyId: string
  ): BrandManual {
    // Validate access
    this.getBrandManualById(id, agencyId)

    return this.brandManualRepo.update(id, data)
  }

  /**
   * Delete brand manual
   */
  deleteBrandManual(id: string, agencyId: string): boolean {
    // Validate access
    this.getBrandManualById(id, agencyId)

    return this.brandManualRepo.delete(id)
  }

  /**
   * Delete brand manual by workspace
   */
  deleteBrandManualByWorkspace(workspaceId: string, agencyId: string): boolean {
    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a este workspace')
    }

    return this.brandManualRepo.deleteByWorkspaceId(workspaceId)
  }

  /**
   * Get brand manuals with filters
   */
  getBrandManualsWithFilters(
    filters: BrandManualFilters,
    agencyId: string,
    options: QueryOptions = {}
  ): BrandManual[] {
    // If workspaceId is provided, validate access
    if (filters.workspaceId) {
      if (!this.workspaceRepo.validateAgencyOwnership(filters.workspaceId, agencyId)) {
        throw new Error('No tienes permisos para acceder a este workspace')
      }
    }

    return this.brandManualRepo.findWithFilters(filters, options)
  }

  /**
   * Reset brand manual to default values
   */
  resetToDefault(workspaceId: string, agencyId: string): BrandManual {
    // Validate workspace access
    if (!this.workspaceRepo.validateAgencyOwnership(workspaceId, agencyId)) {
      throw new Error('No tienes permisos para acceder a este workspace')
    }

    // Delete existing brand manual
    this.brandManualRepo.deleteByWorkspaceId(workspaceId)

    // Create new default brand manual
    return this.brandManualRepo.getOrCreateDefault(workspaceId)
  }

  /**
   * Validate brand manual completeness
   */
  validateBrandManual(brandManual: BrandManual): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!brandManual.brandVoice?.trim()) {
      errors.push('El tono de voz de la marca es requerido')
    }

    if (!brandManual.brandValues || brandManual.brandValues.length === 0) {
      errors.push('Los valores de la marca son requeridos')
    }

    if (!brandManual.targetAudience?.trim()) {
      errors.push('La audiencia objetivo es requerida')
    }

    if (!brandManual.keyMessages || brandManual.keyMessages.length === 0) {
      errors.push('Los mensajes clave son requeridos')
    }

    if (!brandManual.dosDonts || 
        !brandManual.dosDonts.dos || brandManual.dosDonts.dos.length === 0 ||
        !brandManual.dosDonts.donts || brandManual.dosDonts.donts.length === 0) {
      errors.push('Las guías de qué hacer y qué no hacer son requeridas')
    }

    if (!brandManual.colorPalette || brandManual.colorPalette.length === 0) {
      errors.push('La paleta de colores es requerida')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get brand manual summary for AI prompts
   */
  getBrandManualSummary(workspaceId: string, agencyId: string): string {
    const brandManual = this.getBrandManualForWorkspace(workspaceId, agencyId)

    return `
Tono de voz: ${brandManual.brandVoice}
Valores de marca: ${brandManual.brandValues.join(', ')}
Audiencia objetivo: ${brandManual.targetAudience}
Mensajes clave: ${brandManual.keyMessages.join(', ')}
Qué hacer: ${brandManual.dosDonts.dos.join(', ')}
Qué NO hacer: ${brandManual.dosDonts.donts.join(', ')}
Colores principales: ${brandManual.colorPalette.join(', ')}
${brandManual.typography ? `Tipografía: ${brandManual.typography}` : ''}
    `.trim()
  }
}

// Singleton instance
let brandManualServiceInstance: BrandManualService | null = null

export function getBrandManualService(): BrandManualService {
  if (!brandManualServiceInstance) {
    brandManualServiceInstance = new BrandManualService()
  }
  return brandManualServiceInstance
}