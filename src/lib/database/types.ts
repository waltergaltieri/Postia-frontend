// Database entity types based on the design document

export type SocialNetwork = 'facebook' | 'instagram' | 'twitter' | 'linkedin'

export interface Agency {
  id: string
  name: string
  email: string
  credits: number
  plan: 'free' | 'pro' | 'enterprise'
  settings: {
    notifications: boolean
    timezone: string
    language: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  passwordHash: string
  agencyId: string
  role: 'admin' | 'member'
  createdAt: Date
  updatedAt: Date
}

export interface Workspace {
  id: string
  agencyId: string
  name: string
  branding: {
    primaryColor: string
    secondaryColor: string
    logo?: string
    slogan: string
    description: string
    whatsapp: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface SocialAccount {
  id: string
  workspaceId: string
  platform: SocialNetwork
  accountId: string
  accountName: string
  isConnected: boolean
  connectedAt?: Date
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Resource {
  id: string
  workspaceId: string
  name: string
  originalName: string
  filePath: string
  url: string
  type: 'image' | 'video'
  mimeType: string
  sizeBytes: number
  width?: number
  height?: number
  durationSeconds?: number
  createdAt: Date
  updatedAt: Date
}

export interface Template {
  id: string
  workspaceId: string
  name: string
  type: 'single' | 'carousel'
  images: string[]
  socialNetworks: SocialNetwork[]
  createdAt: Date
  updatedAt: Date
}

export interface Campaign {
  id: string
  workspaceId: string
  name: string
  objective: string
  startDate: Date
  endDate: Date
  socialNetworks: SocialNetwork[]
  intervalHours: number
  contentType: 'unified' | 'optimized'
  optimizationSettings?: OptimizationSettings
  prompt: string
  status: 'draft' | 'active' | 'completed' | 'paused'
  createdAt: Date
  updatedAt: Date

  // AI Content Generation fields
  shortPrompt?: string              // Objetivo corto de la campaña
  longPrompt?: string               // Descripción detallada para IA
  selectedResources?: string[]      // IDs de recursos seleccionados
  selectedTemplates?: string[]      // IDs de templates seleccionados
  platformDistribution?: {         // Distribución de contenido por plataforma
    instagram?: number
    linkedin?: number
    twitter?: number
    facebook?: number
  }
  publicationsPerDay?: number       // Publicaciones por día
  intervalDays?: number             // Intervalo entre publicaciones
  generationStatus?: 'configuring' | 'descriptions_generated' | 'content_generating' | 'completed'
}

export interface Publication {
  id: string
  campaignId: string
  templateId: string
  resourceId: string
  socialNetwork: SocialNetwork
  content: string
  imageUrl: string
  scheduledDate: Date
  status: 'scheduled' | 'published' | 'failed' | 'cancelled'
  publishedAt?: Date
  errorMessage?: string
  externalPostId?: string
  createdAt: Date
  updatedAt: Date

  // AI Content Generation fields
  contentDescriptionId?: string     // Referencia a la descripción
  generatedText?: string            // Texto generado por IA
  generatedImageUrl?: string        // URL de imagen generada
  generationMetadata?: {            // Metadatos del proceso de generación
    textPrompt?: string
    imagePrompt?: string
    templateUsed?: string
    resourcesUsed?: string[]
    generationTime?: Date
    retryCount?: number
  }
}

export interface OptimizationSettings {
  facebook?: {
    tone: string
    hashtags: boolean
  }
  instagram?: {
    tone: string
    hashtags: boolean
  }
  twitter?: {
    tone: string
    hashtags: boolean
  }
  linkedin?: {
    tone: string
    hashtags: boolean
  }
}

// New interfaces for AI Content Generation

export interface ContentDescription {
  id: string
  campaignId: string
  platform: SocialNetwork
  scheduledDate: Date
  contentType: 'text_simple' | 'text_image_simple' | 'text_image_template' | 'carousel'
  description: string              // Descripción generada por IA
  templateId?: string              // Si usa template
  resourceIds: string[]            // Recursos a usar
  status: 'pending' | 'approved' | 'regenerating' | 'generated'
  createdAt: Date
  updatedAt: Date
}

export interface BrandManual {
  id: string
  workspaceId: string
  brandVoice: string               // Tono de voz de la marca
  brandValues: string[]            // Valores de la marca
  targetAudience: string           // Audiencia objetivo
  keyMessages: string[]            // Mensajes clave
  dosDonts: {                      // Qué hacer y qué no hacer
    dos: string[]
    donts: string[]
  }
  colorPalette: string[]           // Paleta de colores
  typography?: string              // Tipografía preferida
  createdAt: Date
  updatedAt: Date
}

// Create/Update types (omit id, createdAt, updatedAt)
export type CreateAgencyData = Omit<Agency, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateAgencyData = Partial<
  Omit<Agency, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateUserData = Omit<User, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateUserData = Partial<
  Omit<User, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateWorkspaceData = Omit<
  Workspace,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateWorkspaceData = Partial<
  Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateSocialAccountData = Omit<
  SocialAccount,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateSocialAccountData = Partial<
  Omit<SocialAccount, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateResourceData = Omit<
  Resource,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateResourceData = Partial<
  Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateTemplateData = Omit<
  Template,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateTemplateData = Partial<
  Omit<Template, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateCampaignData = Omit<
  Campaign,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateCampaignData = Partial<
  Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreatePublicationData = Omit<
  Publication,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdatePublicationData = Partial<
  Omit<Publication, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateContentDescriptionData = Omit<
  ContentDescription,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateContentDescriptionData = Partial<
  Omit<ContentDescription, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateBrandManualData = Omit<
  BrandManual,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateBrandManualData = Partial<
  Omit<BrandManual, 'id' | 'createdAt' | 'updatedAt'>
>

// Query options
export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'
}

// Filter types
export interface AgencyFilters {
  plan?: 'free' | 'pro' | 'enterprise'
  email?: string
}

export interface UserFilters {
  agencyId?: string
  role?: 'admin' | 'member'
  email?: string
}

export interface WorkspaceFilters {
  agencyId?: string
  name?: string
}

export interface ResourceFilters {
  workspaceId?: string
  type?: 'image' | 'video'
  name?: string
}

export interface TemplateFilters {
  workspaceId?: string
  type?: 'single' | 'carousel'
  socialNetworks?: SocialNetwork[]
}

export interface CampaignFilters {
  workspaceId?: string
  status?: 'draft' | 'active' | 'completed' | 'paused'
  startDate?: Date
  endDate?: Date
}

export interface PublicationFilters {
  campaignId?: string
  socialNetwork?: SocialNetwork
  status?: 'scheduled' | 'published' | 'failed' | 'cancelled'
  scheduledDateFrom?: Date
  scheduledDateTo?: Date
}

export interface SocialAccountFilters {
  workspaceId?: string
  platform?: SocialNetwork
  isConnected?: boolean
}

export interface ContentDescriptionFilters {
  campaignId?: string
  platform?: SocialNetwork
  contentType?: 'text_simple' | 'text_image_simple' | 'text_image_template' | 'carousel'
  status?: 'pending' | 'approved' | 'regenerating' | 'generated'
  scheduledDateFrom?: Date
  scheduledDateTo?: Date
}

export interface BrandManualFilters {
  workspaceId?: string
}
