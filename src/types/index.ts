// Core entity types
export interface User {
  id: string
  email: string
  agencyId: string
  role: 'admin' | 'member'
  createdAt: Date
}

export interface Agency {
  id: string
  name: string
  email: string
  credits: number
  plan: 'free' | 'pro' | 'enterprise'
  settings: AgencySettings
}

export interface AgencySettings {
  notifications: boolean
  timezone: string
  language: string
}

export interface Workspace {
  id: string
  agencyId: string
  name: string
  branding: WorkspaceBranding
  socialAccounts: SocialAccount[]
  createdAt: Date
}

export interface WorkspaceBranding {
  colors: {
    primary: string
    secondary: string
  }
  logo?: string
  slogan: string
  description: string
  whatsapp: string
}

export interface SocialAccount {
  id: string
  platform: SocialNetwork
  accountId: string
  accountName: string
  isConnected: boolean
  connectedAt?: Date
}

export type SocialNetwork = 'facebook' | 'instagram' | 'twitter' | 'linkedin'

export interface Campaign {
  id: string
  workspaceId: string
  name: string
  objective: string
  startDate: Date
  endDate: Date
  socialNetworks: SocialNetwork[]
  interval: number
  contentType: 'unified' | 'optimized'
  optimizationSettings?: OptimizationSettings
  resources: string[]
  templates: string[]
  prompt: string
  publications: Publication[]
  status: 'draft' | 'active' | 'completed' | 'paused'
  createdAt: Date
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

export interface Publication {
  id: string
  campaignId: string
  content: string
  imageUrl: string
  socialNetwork: SocialNetwork
  scheduledDate: Date
  status: 'scheduled' | 'published' | 'failed' | 'cancelled'
  templateId: string
  resourceId: string
  createdAt: Date
}

export interface Resource {
  id: string
  workspaceId: string
  name: string
  url: string
  type: 'image' | 'video'
  size: number
  createdAt: Date
}

export interface Template {
  id: string
  workspaceId: string
  name: string
  type: 'single' | 'carousel'
  images: string[]
  socialNetworks: SocialNetwork[]
  createdAt: Date
}

// UI State types
export interface ModalState {
  workspaceCreation: boolean
  resourceUpload: boolean
  templateUpload: boolean
  publicationDetail: boolean
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

export interface LoadingState {
  global: boolean
  campaigns: boolean
  resources: boolean
  templates: boolean
  calendar: boolean
}

export interface CalendarFilters {
  campaignId?: string
  socialNetwork?: SocialNetwork
  status?: Publication['status']
}

// Form types
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  agencyName: string
  email: string
  password: string
  confirmPassword: string
}

export interface WorkspaceFormData {
  name: string
  branding: WorkspaceBranding
}

export interface CampaignFormData {
  name: string
  objective: string
  startDate: Date
  endDate: Date
  socialNetworks: SocialNetwork[]
  interval: number
  contentType: 'unified' | 'optimized'
  optimizationSettings?: OptimizationSettings
  resources: string[]
  templates: string[]
  prompt: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Error types
export interface ApiError {
  message: string
  code: string
  details?: Record<string, string[]>
}
