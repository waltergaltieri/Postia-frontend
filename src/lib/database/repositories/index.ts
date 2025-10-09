// Repository exports
export { BaseRepository } from './BaseRepository'
export { AgencyRepository } from './AgencyRepository'
export { UserRepository } from './UserRepository'
export { WorkspaceRepository } from './WorkspaceRepository'
export { ResourceRepository } from './ResourceRepository'
export { TemplateRepository } from './TemplateRepository'
export { CampaignRepository } from './CampaignRepository'
export { PublicationRepository } from './PublicationRepository'
export { SocialAccountRepository } from './SocialAccountRepository'
export { ContentDescriptionRepository } from './ContentDescriptionRepository'
export { BrandManualRepository } from './BrandManualRepository'

// Repository instances for easy access
export const repositories = {
  agency: new AgencyRepository(),
  user: new UserRepository(),
  workspace: new WorkspaceRepository(),
  resource: new ResourceRepository(),
  template: new TemplateRepository(),
  campaign: new CampaignRepository(),
  publication: new PublicationRepository(),
  socialAccount: new SocialAccountRepository(),
  contentDescription: new ContentDescriptionRepository(),
  brandManual: new BrandManualRepository(),
} as const

// Type for repository collection
export type Repositories = typeof repositories
