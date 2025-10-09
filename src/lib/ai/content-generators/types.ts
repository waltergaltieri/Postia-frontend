import { 
  ContentDescription, 
  BrandManual, 
  Publication, 
  Resource, 
  Template,
  SocialNetwork 
} from '../../database/types'

export interface ContentGenerationContext {
  description: ContentDescription
  brandManual: BrandManual
  resources?: Resource[]
  template?: Template
}

export interface ContentGenerationResult {
  success: boolean
  publication?: Partial<Publication>
  error?: string
  retryCount?: number
  generationTime?: number
}

export interface PlatformLimits {
  maxCharacters: number
  supportsHashtags: boolean
  supportsEmojis: boolean
  supportsLineBreaks: boolean
}

export interface ContentGenerator {
  generateContent(context: ContentGenerationContext): Promise<ContentGenerationResult>
  validateContent(content: string, platform: SocialNetwork): boolean
  getPlatformLimits(platform: SocialNetwork): PlatformLimits
}

export const PLATFORM_LIMITS: Record<SocialNetwork, PlatformLimits> = {
  instagram: {
    maxCharacters: 2200,
    supportsHashtags: true,
    supportsEmojis: true,
    supportsLineBreaks: true
  },
  linkedin: {
    maxCharacters: 3000,
    supportsHashtags: true,
    supportsEmojis: true,
    supportsLineBreaks: true
  },
  twitter: {
    maxCharacters: 280,
    supportsHashtags: true,
    supportsEmojis: true,
    supportsLineBreaks: true
  },
  facebook: {
    maxCharacters: 63206,
    supportsHashtags: true,
    supportsEmojis: true,
    supportsLineBreaks: true
  }
}