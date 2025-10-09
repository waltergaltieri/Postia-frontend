/**
 * Database Services - Business Logic Layer
 *
 * This module exports all business services that orchestrate repository operations
 * and implement complex business logic and validations.
 */

export { AgencyService } from './AgencyService'
export { AuthService } from './AuthService'
export { WorkspaceService } from './WorkspaceService'
export { CampaignService } from './CampaignService'
export { PublicationService } from './PublicationService'
export { DashboardService } from './DashboardService'
export { CalendarService } from './CalendarService'
export { CacheService, CacheInvalidation, cache } from './CacheService'
export {
  PerformanceMonitor,
  MonitorPerformance,
  performanceMonitor,
} from './PerformanceMonitor'
export { ContentDescriptionService, getContentDescriptionService } from './ContentDescriptionService'
export { BrandManualService, getBrandManualService } from './BrandManualService'

// Re-export types for convenience
export type {
  Agency,
  User,
  Workspace,
  Campaign,
  Publication,
  Resource,
  Template,
  SocialAccount,
  SocialNetwork,
  OptimizationSettings,
  ContentDescription,
  BrandManual,
  CreateAgencyData,
  UpdateAgencyData,
  CreateUserData,
  UpdateUserData,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  CreateCampaignData,
  UpdateCampaignData,
  CreatePublicationData,
  UpdatePublicationData,
  CreateResourceData,
  UpdateResourceData,
  CreateTemplateData,
  UpdateTemplateData,
  CreateSocialAccountData,
  UpdateSocialAccountData,
  CreateContentDescriptionData,
  UpdateContentDescriptionData,
  CreateBrandManualData,
  UpdateBrandManualData,
} from '../types'
