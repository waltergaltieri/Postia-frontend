import { getDatabase } from '../connection'
import type { SocialNetwork } from '../types'

/**
 * Database validation utilities for ensuring data integrity and business rules
 */
export class DatabaseValidations {
  private static db = getDatabase

  /**
   * Validate that a workspace belongs to the specified agency
   */
  static validateWorkspaceAccess(
    workspaceId: string,
    agencyId: string
  ): boolean {
    const db = this.db()
    const result = db
      .prepare(
        `
      SELECT 1 FROM workspaces WHERE id = ? AND agency_id = ?
    `
      )
      .get(workspaceId, agencyId)

    return !!result
  }

  /**
   * Validate that a user belongs to the specified agency
   */
  static validateUserAccess(userId: string, agencyId: string): boolean {
    const db = this.db()
    const result = db
      .prepare(
        `
      SELECT 1 FROM users WHERE id = ? AND agency_id = ?
    `
      )
      .get(userId, agencyId)

    return !!result
  }

  /**
   * Validate that a resource belongs to the specified workspace
   */
  static validateResourceAccess(
    resourceId: string,
    workspaceId: string
  ): boolean {
    const db = this.db()
    const result = db
      .prepare(
        `
      SELECT 1 FROM resources WHERE id = ? AND workspace_id = ?
    `
      )
      .get(resourceId, workspaceId)

    return !!result
  }

  /**
   * Validate that a template belongs to the specified workspace
   */
  static validateTemplateAccess(
    templateId: string,
    workspaceId: string
  ): boolean {
    const db = this.db()
    const result = db
      .prepare(
        `
      SELECT 1 FROM templates WHERE id = ? AND workspace_id = ?
    `
      )
      .get(templateId, workspaceId)

    return !!result
  }

  /**
   * Validate that a campaign belongs to the specified workspace
   */
  static validateCampaignAccess(
    campaignId: string,
    workspaceId: string
  ): boolean {
    const db = this.db()
    const result = db
      .prepare(
        `
      SELECT 1 FROM campaigns WHERE id = ? AND workspace_id = ?
    `
      )
      .get(campaignId, workspaceId)

    return !!result
  }

  /**
   * Validate that a social account belongs to the specified workspace
   */
  static validateSocialAccountAccess(
    socialAccountId: string,
    workspaceId: string
  ): boolean {
    const db = this.db()
    const result = db
      .prepare(
        `
      SELECT 1 FROM social_accounts WHERE id = ? AND workspace_id = ?
    `
      )
      .get(socialAccountId, workspaceId)

    return !!result
  }

  /**
   * Check if a resource is being used in any active campaigns or scheduled publications
   */
  static validateResourceUsage(resourceId: string): {
    canDelete: boolean
    usage: string[]
  } {
    const db = this.db()
    const usage: string[] = []

    // Check active campaigns
    const activeCampaigns = db
      .prepare(
        `
      SELECT c.name FROM campaigns c
      JOIN campaign_resources cr ON c.id = cr.campaign_id
      WHERE cr.resource_id = ? AND c.status = 'active'
    `
      )
      .all(resourceId) as { name: string }[]

    if (activeCampaigns.length > 0) {
      usage.push(
        `Usado en ${activeCampaigns.length} campaña(s) activa(s): ${activeCampaigns.map(c => c.name).join(', ')}`
      )
    }

    // Check scheduled publications
    const scheduledPublications = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM publications 
      WHERE resource_id = ? AND status IN ('scheduled')
    `
      )
      .get(resourceId) as { count: number }

    if (scheduledPublications.count > 0) {
      usage.push(
        `Usado en ${scheduledPublications.count} publicación(es) programada(s)`
      )
    }

    return {
      canDelete: usage.length === 0,
      usage,
    }
  }

  /**
   * Check if a template is being used in any active campaigns or scheduled publications
   */
  static validateTemplateUsage(templateId: string): {
    canDelete: boolean
    usage: string[]
  } {
    const db = this.db()
    const usage: string[] = []

    // Check active campaigns
    const activeCampaigns = db
      .prepare(
        `
      SELECT c.name FROM campaigns c
      JOIN campaign_templates ct ON c.id = ct.campaign_id
      WHERE ct.template_id = ? AND c.status = 'active'
    `
      )
      .all(templateId) as { name: string }[]

    if (activeCampaigns.length > 0) {
      usage.push(
        `Usado en ${activeCampaigns.length} campaña(s) activa(s): ${activeCampaigns.map(c => c.name).join(', ')}`
      )
    }

    // Check scheduled publications
    const scheduledPublications = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM publications 
      WHERE template_id = ? AND status IN ('scheduled')
    `
      )
      .get(templateId) as { count: number }

    if (scheduledPublications.count > 0) {
      usage.push(
        `Usado en ${scheduledPublications.count} publicación(es) programada(s)`
      )
    }

    return {
      canDelete: usage.length === 0,
      usage,
    }
  }

  /**
   * Validate campaign dates are logical and in the future
   */
  static validateCampaignDates(
    startDate: Date,
    endDate: Date
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const now = new Date()

    if (startDate >= endDate) {
      errors.push('La fecha de inicio debe ser anterior a la fecha de fin')
    }

    if (startDate < now) {
      errors.push('La fecha de inicio debe ser en el futuro')
    }

    const maxDuration = 365 // días
    const durationDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (durationDays > maxDuration) {
      errors.push(
        `La duración de la campaña no puede exceder ${maxDuration} días`
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate campaign interval hours
   */
  static validateCampaignInterval(intervalHours: number): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (intervalHours < 1) {
      errors.push('El intervalo debe ser de al menos 1 hora')
    }

    if (intervalHours > 168) {
      // 7 días
      errors.push('El intervalo no puede ser mayor a 168 horas (7 días)')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate social networks configuration
   */
  static validateSocialNetworks(socialNetworks: SocialNetwork[]): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const validNetworks: SocialNetwork[] = [
      'facebook',
      'instagram',
      'twitter',
      'linkedin',
    ]

    if (socialNetworks.length === 0) {
      errors.push('Debe seleccionar al menos una red social')
    }

    const invalidNetworks = socialNetworks.filter(
      network => !validNetworks.includes(network)
    )
    if (invalidNetworks.length > 0) {
      errors.push(`Redes sociales inválidas: ${invalidNetworks.join(', ')}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate workspace has active social accounts for the specified networks
   */
  static validateWorkspaceSocialAccounts(
    workspaceId: string,
    socialNetworks: SocialNetwork[]
  ): { isValid: boolean; errors: string[] } {
    const db = this.db()
    const errors: string[] = []

    for (const network of socialNetworks) {
      const account = db
        .prepare(
          `
        SELECT 1 FROM social_accounts 
        WHERE workspace_id = ? AND platform = ? AND is_connected = 1
      `
        )
        .get(workspaceId, network)

      if (!account) {
        errors.push(`No hay cuenta conectada para ${network}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate workspace can be deleted (no active campaigns)
   */
  static validateWorkspaceDeletion(workspaceId: string): {
    canDelete: boolean
    errors: string[]
  } {
    const db = this.db()
    const errors: string[] = []

    // Check for active campaigns
    const activeCampaigns = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM campaigns 
      WHERE workspace_id = ? AND status = 'active'
    `
      )
      .get(workspaceId) as { count: number }

    if (activeCampaigns.count > 0) {
      errors.push(
        `No se puede eliminar el workspace. Tiene ${activeCampaigns.count} campaña(s) activa(s)`
      )
    }

    // Check for scheduled publications
    const scheduledPublications = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE c.workspace_id = ? AND p.status = 'scheduled'
    `
      )
      .get(workspaceId) as { count: number }

    if (scheduledPublications.count > 0) {
      errors.push(
        `No se puede eliminar el workspace. Tiene ${scheduledPublications.count} publicación(es) programada(s)`
      )
    }

    return {
      canDelete: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate agency can be deleted (no active workspaces with campaigns)
   */
  static validateAgencyDeletion(agencyId: string): {
    canDelete: boolean
    errors: string[]
  } {
    const db = this.db()
    const errors: string[] = []

    // Check for active campaigns across all workspaces
    const activeCampaigns = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM campaigns c
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE w.agency_id = ? AND c.status = 'active'
    `
      )
      .get(agencyId) as { count: number }

    if (activeCampaigns.count > 0) {
      errors.push(
        `No se puede eliminar la agencia. Tiene ${activeCampaigns.count} campaña(s) activa(s)`
      )
    }

    return {
      canDelete: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate file upload constraints
   */
  static validateFileUpload(file: {
    size: number
    type: string
    name: string
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // File size limits (in bytes)
    const maxImageSize = 10 * 1024 * 1024 // 10MB
    const maxVideoSize = 100 * 1024 * 1024 // 100MB

    // Allowed MIME types
    const allowedImageTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ]
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mov']

    if (file.type.startsWith('image/')) {
      if (file.size > maxImageSize) {
        errors.push(
          `El archivo de imagen es demasiado grande. Máximo ${maxImageSize / (1024 * 1024)}MB`
        )
      }
      if (!allowedImageTypes.includes(file.type)) {
        errors.push(
          `Tipo de imagen no permitido. Tipos permitidos: ${allowedImageTypes.join(', ')}`
        )
      }
    } else if (file.type.startsWith('video/')) {
      if (file.size > maxVideoSize) {
        errors.push(
          `El archivo de video es demasiado grande. Máximo ${maxVideoSize / (1024 * 1024)}MB`
        )
      }
      if (!allowedVideoTypes.includes(file.type)) {
        errors.push(
          `Tipo de video no permitido. Tipos permitidos: ${allowedVideoTypes.join(', ')}`
        )
      }
    } else {
      errors.push('Solo se permiten archivos de imagen o video')
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push(
        'El nombre del archivo es demasiado largo (máximo 255 caracteres)'
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate branding configuration
   */
  static validateBranding(branding: {
    primaryColor?: string
    secondaryColor?: string
    logo?: string
    slogan?: string
    description?: string
    whatsapp?: string
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Color validation (hex format)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

    if (branding.primaryColor && !hexColorRegex.test(branding.primaryColor)) {
      errors.push(
        'El color primario debe estar en formato hexadecimal (#RRGGBB)'
      )
    }

    if (
      branding.secondaryColor &&
      !hexColorRegex.test(branding.secondaryColor)
    ) {
      errors.push(
        'El color secundario debe estar en formato hexadecimal (#RRGGBB)'
      )
    }

    // URL validation for logo
    if (branding.logo) {
      try {
        new URL(branding.logo)
      } catch {
        errors.push('La URL del logo no es válida')
      }
    }

    // Text length validations
    if (branding.slogan && branding.slogan.length > 100) {
      errors.push('El slogan no puede exceder 100 caracteres')
    }

    if (branding.description && branding.description.length > 500) {
      errors.push('La descripción no puede exceder 500 caracteres')
    }

    // WhatsApp validation (phone number format)
    if (branding.whatsapp) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/
      if (!phoneRegex.test(branding.whatsapp.replace(/\s/g, ''))) {
        errors.push(
          'El número de WhatsApp debe ser un número de teléfono válido'
        )
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate publication scheduling constraints
   */
  static validatePublicationScheduling(
    scheduledDate: Date,
    socialNetwork: SocialNetwork
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const now = new Date()

    // Must be in the future
    if (scheduledDate <= now) {
      errors.push('La fecha de publicación debe ser en el futuro')
    }

    // Not too far in the future (1 year max)
    const maxFutureDate = new Date()
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1)

    if (scheduledDate > maxFutureDate) {
      errors.push(
        'La fecha de publicación no puede ser más de 1 año en el futuro'
      )
    }

    // Platform-specific constraints
    const platformConstraints = {
      facebook: { minMinutes: 10, maxDays: 75 },
      instagram: { minMinutes: 10, maxDays: 75 },
      twitter: { minMinutes: 1, maxDays: 365 },
      linkedin: { minMinutes: 10, maxDays: 90 },
    }

    const constraint = platformConstraints[socialNetwork]
    const minutesFromNow =
      (scheduledDate.getTime() - now.getTime()) / (1000 * 60)
    const daysFromNow = minutesFromNow / (60 * 24)

    if (minutesFromNow < constraint.minMinutes) {
      errors.push(
        `Para ${socialNetwork}, la publicación debe programarse al menos ${constraint.minMinutes} minutos en el futuro`
      )
    }

    if (daysFromNow > constraint.maxDays) {
      errors.push(
        `Para ${socialNetwork}, la publicación no puede programarse más de ${constraint.maxDays} días en el futuro`
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}
