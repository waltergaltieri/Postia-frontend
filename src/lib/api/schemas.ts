import { z } from 'zod'

// Base schemas
export const SocialNetworkSchema = z.enum([
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
])

export const CampaignStatusSchema = z.enum([
  'draft',
  'active',
  'completed',
  'paused',
])

export const PublicationStatusSchema = z.enum([
  'scheduled',
  'published',
  'failed',
  'cancelled',
])

export const ResourceTypeSchema = z.enum(['image', 'video'])

export const TemplateTypeSchema = z.enum(['single', 'carousel'])

export const UserRoleSchema = z.enum(['admin', 'member'])

export const AgencyPlanSchema = z.enum(['free', 'pro', 'enterprise'])

// Workspace schemas
export const WorkspaceBrandingSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color debe ser un hex válido'),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color debe ser un hex válido'),
  logo: z.string().url().optional().or(z.literal('')),
  slogan: z.string().max(100, 'Slogan no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'Descripción no puede exceder 500 caracteres'),
  whatsapp: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Número de WhatsApp inválido')
    .optional()
    .or(z.literal('')),
})

export const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Nombre es requerido')
    .max(100, 'Nombre no puede exceder 100 caracteres'),
  branding: WorkspaceBrandingSchema.optional(),
})

export const UpdateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Nombre es requerido')
    .max(100, 'Nombre no puede exceder 100 caracteres')
    .optional(),
  branding: WorkspaceBrandingSchema.optional(),
})

// Campaign schemas
export const OptimizationSettingsSchema = z.object({
  facebook: z
    .object({
      tone: z.string(),
      hashtags: z.boolean(),
    })
    .optional(),
  instagram: z
    .object({
      tone: z.string(),
      hashtags: z.boolean(),
    })
    .optional(),
  twitter: z
    .object({
      tone: z.string(),
      hashtags: z.boolean(),
    })
    .optional(),
  linkedin: z
    .object({
      tone: z.string(),
      hashtags: z.boolean(),
    })
    .optional(),
})

export const CreateCampaignSchema = z.object({
  workspaceId: z.string().uuid('ID de workspace inválido'),
  name: z
    .string()
    .min(1, 'Nombre es requerido')
    .max(200, 'Nombre no puede exceder 200 caracteres'),
  objective: z
    .string()
    .min(1, 'Objetivo es requerido')
    .max(1000, 'Objetivo no puede exceder 1000 caracteres'),
  startDate: z.string().datetime('Fecha de inicio inválida'),
  endDate: z.string().datetime('Fecha de fin inválida'),
  socialNetworks: z
    .array(SocialNetworkSchema)
    .min(1, 'Al menos una red social es requerida'),
  intervalHours: z
    .number()
    .int()
    .min(1, 'Intervalo debe ser al menos 1 hora')
    .max(168, 'Intervalo no puede exceder 168 horas')
    .default(24),
  contentType: z.enum(['unified', 'optimized']).default('unified'),
  optimizationSettings: OptimizationSettingsSchema.optional(),
  prompt: z
    .string()
    .min(1, 'Prompt es requerido')
    .max(2000, 'Prompt no puede exceder 2000 caracteres'),
  resourceIds: z.array(z.string().uuid()).optional().default([]),
  templateIds: z.array(z.string().uuid()).optional().default([]),
})

export const UpdateCampaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Nombre es requerido')
    .max(200, 'Nombre no puede exceder 200 caracteres')
    .optional(),
  objective: z
    .string()
    .min(1, 'Objetivo es requerido')
    .max(1000, 'Objetivo no puede exceder 1000 caracteres')
    .optional(),
  startDate: z.string().datetime('Fecha de inicio inválida').optional(),
  endDate: z.string().datetime('Fecha de fin inválida').optional(),
  socialNetworks: z
    .array(SocialNetworkSchema)
    .min(1, 'Al menos una red social es requerida')
    .optional(),
  intervalHours: z
    .number()
    .int()
    .min(1, 'Intervalo debe ser al menos 1 hora')
    .max(168, 'Intervalo no puede exceder 168 horas')
    .optional(),
  contentType: z.enum(['unified', 'optimized']).optional(),
  optimizationSettings: OptimizationSettingsSchema.optional(),
  prompt: z
    .string()
    .min(1, 'Prompt es requerido')
    .max(2000, 'Prompt no puede exceder 2000 caracteres')
    .optional(),
  status: CampaignStatusSchema.optional(),
})

// Resource schemas
export const UpdateResourceSchema = z.object({
  name: z
    .string()
    .min(1, 'Nombre es requerido')
    .max(200, 'Nombre no puede exceder 200 caracteres'),
})

// Template schemas
export const CreateTemplateSchema = z.object({
  workspaceId: z.string().uuid('ID de workspace inválido'),
  name: z
    .string()
    .min(1, 'Nombre es requerido')
    .max(200, 'Nombre no puede exceder 200 caracteres'),
  type: TemplateTypeSchema.default('single'),
  socialNetworks: z
    .array(SocialNetworkSchema)
    .min(1, 'Al menos una red social es requerida'),
  images: z.array(z.string().url()).min(1, 'Al menos una imagen es requerida'),
})

export const UpdateTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Nombre es requerido')
    .max(200, 'Nombre no puede exceder 200 caracteres')
    .optional(),
  type: TemplateTypeSchema.optional(),
  socialNetworks: z
    .array(SocialNetworkSchema)
    .min(1, 'Al menos una red social es requerida')
    .optional(),
  images: z
    .array(z.string().url())
    .min(1, 'Al menos una imagen es requerida')
    .optional(),
})

// Publication schemas
export const UpdatePublicationSchema = z.object({
  content: z
    .string()
    .min(1, 'Contenido es requerido')
    .max(2000, 'Contenido no puede exceder 2000 caracteres')
    .optional(),
  scheduledDate: z.string().datetime('Fecha programada inválida').optional(),
  status: PublicationStatusSchema.optional(),
})

export const ReschedulePublicationSchema = z.object({
  scheduledDate: z.string().datetime('Fecha programada inválida'),
})

export const RegeneratePublicationSchema = z.object({
  prompt: z
    .string()
    .max(2000, 'Prompt no puede exceder 2000 caracteres')
    .optional(),
})

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const GetCampaignsQuerySchema = PaginationSchema.extend({
  workspaceId: z.string().uuid('ID de workspace inválido'),
  status: CampaignStatusSchema.optional(),
  search: z.string().optional(),
})

export const GetResourcesQuerySchema = PaginationSchema.extend({
  workspaceId: z.string().uuid('ID de workspace inválido'),
  search: z.string().optional(),
  type: ResourceTypeSchema.optional(),
})

export const GetTemplatesQuerySchema = PaginationSchema.extend({
  workspaceId: z.string().uuid('ID de workspace inválido'),
  search: z.string().optional(),
  type: TemplateTypeSchema.optional(),
  socialNetwork: SocialNetworkSchema.optional(),
})

export const GetCalendarQuerySchema = z.object({
  workspaceId: z.string().uuid('ID de workspace inválido'),
  startDate: z.string().datetime('Fecha de inicio inválida'),
  endDate: z.string().datetime('Fecha de fin inválida'),
  socialNetwork: SocialNetworkSchema.optional(),
  campaignId: z.string().uuid().optional(),
})

// Response schemas
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    message: z.string(),
    success: z.boolean(),
  })

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
    message: z.string(),
    success: z.boolean(),
  })

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  success: z.literal(false),
})

// Type exports
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceSchema>
export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceSchema>
export type CreateCampaignRequest = z.infer<typeof CreateCampaignSchema>
export type UpdateCampaignRequest = z.infer<typeof UpdateCampaignSchema>
export type UpdateResourceRequest = z.infer<typeof UpdateResourceSchema>
export type CreateTemplateRequest = z.infer<typeof CreateTemplateSchema>
export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateSchema>
export type UpdatePublicationRequest = z.infer<typeof UpdatePublicationSchema>
export type ReschedulePublicationRequest = z.infer<
  typeof ReschedulePublicationSchema
>
export type RegeneratePublicationRequest = z.infer<
  typeof RegeneratePublicationSchema
>
export type GetCampaignsQuery = z.infer<typeof GetCampaignsQuerySchema>
export type GetResourcesQuery = z.infer<typeof GetResourcesQuerySchema>
export type GetTemplatesQuery = z.infer<typeof GetTemplatesQuerySchema>
export type GetCalendarQuery = z.infer<typeof GetCalendarQuerySchema>
