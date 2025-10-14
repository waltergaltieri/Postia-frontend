import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const registerSchema = z
  .object({
    agencyName: z.string().min(1, 'El nombre de la agencia es requerido'),
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

// Workspace schemas
export const workspaceBrandingSchema = z.object({
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color primario inválido'),
    secondary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color secundario inválido'),
  }),
  logo: z.string().url('URL de logo inválida').optional(),
  slogan: z.string().max(100, 'El eslogan no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres'),
  whatsapp: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Número de WhatsApp inválido'),
})

export const workspaceSchema = z.object({
  name: z.string().min(1, 'El nombre del espacio de trabajo es requerido'),
  branding: workspaceBrandingSchema,
})

// Campaign schemas
export const campaignSchema = z
  .object({
    name: z.string().min(1, 'El nombre de la campaña es requerido'),
    objective: z
      .string()
      .min(10, 'El objetivo debe tener al menos 10 caracteres'),
    startDate: z.date({
      message: 'La fecha de inicio es requerida',
    }),
    endDate: z.date({
      message: 'La fecha de fin es requerida',
    }),
    socialNetworks: z
      .array(z.enum(['instagram', 'linkedin', 'tiktok']))
      .min(1, 'Selecciona al menos una red social'),
    interval: z
      .number()
      .min(1, 'El intervalo debe ser al menos 1 hora')
      .max(168, 'El intervalo no puede exceder 168 horas (1 semana)'),
    contentType: z.enum(['unified', 'optimized']),
    prompt: z.string().min(20, 'El prompt debe tener al menos 20 caracteres'),
    resources: z.array(z.string()).optional(),
    templates: z.array(z.string()).optional(),
  })
  .refine(data => data.endDate > data.startDate, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
  })

// Resource schemas
export const resourceSchema = z.object({
  name: z.string().min(1, 'El nombre del recurso es requerido'),
  file: z
    .instanceof(File)
    .refine(
      file => file.size <= 10 * 1024 * 1024,
      'El archivo no puede exceder 10MB'
    )
    .refine(
      file =>
        ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(
          file.type
        ),
      'Tipo de archivo no soportado'
    ),
})

// Template schemas
export const templateSchema = z.object({
  name: z.string().min(1, 'El nombre del template es requerido'),
  type: z.enum(['single', 'carousel']),
  socialNetworks: z
    .array(z.enum(['instagram', 'linkedin', 'tiktok']))
    .min(1, 'Selecciona al menos una red social'),
  images: z.array(z.instanceof(File)).min(1, 'Sube al menos una imagen'),
})

// Agency settings schemas
export const agencySettingsSchema = z.object({
  name: z.string().min(1, 'El nombre de la agencia es requerido'),
  email: z.string().email('Email inválido'),
  notifications: z.boolean(),
  timezone: z.string(),
  language: z.string(),
})

// Publication schemas
export const publicationUpdateSchema = z.object({
  scheduledDate: z.date({
    message: 'La fecha de programación es requerida',
  }),
  customPrompt: z.string().optional(),
})

// AI Campaign schemas
export const aiCampaignConfigSchema = z
  .object({
    name: z.string().min(1, 'El nombre de la campaña es requerido'),
    description: z
      .string()
      .min(10, 'La descripción debe tener al menos 10 caracteres'),
    startDate: z.date({
      message: 'La fecha de inicio es requerida',
    }),
    endDate: z.date({
      message: 'La fecha de fin es requerida',
    }),
    publicationsPerDay: z
      .number()
      .min(1, 'Debe haber al menos 1 publicación por día')
      .max(10, 'No puede exceder 10 publicaciones por día'),
    intervalDays: z
      .number()
      .min(1, 'El intervalo debe ser al menos 1 día')
      .max(7, 'El intervalo no puede exceder 7 días'),
    platformDistribution: z.object({
      instagram: z.number().min(0).max(100),
      linkedin: z.number().min(0).max(100),
      tiktok: z.number().min(0).max(100),
    }).refine(
      (data) => {
        const total = data.instagram + data.linkedin + data.tiktok;
        return total === 100;
      },
      {
        message: 'La distribución de plataformas debe sumar 100%',
      }
    ),
    selectedResources: z.array(z.string()).min(1, 'Selecciona al menos un recurso'),
    selectedTemplates: z.array(z.string()).optional(),
    shortPrompt: z
      .string()
      .min(10, 'El objetivo debe tener al menos 10 caracteres')
      .max(200, 'El objetivo no puede exceder 200 caracteres'),
    longPrompt: z
      .string()
      .min(50, 'Las instrucciones deben tener al menos 50 caracteres')
      .max(2000, 'Las instrucciones no pueden exceder 2000 caracteres'),
  })
  .refine(data => data.endDate > data.startDate, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
  })

// Form data type inference
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type WorkspaceFormData = z.infer<typeof workspaceSchema>
export type CampaignFormData = z.infer<typeof campaignSchema>
export type AiCampaignConfigFormData = z.infer<typeof aiCampaignConfigSchema>
export type ResourceFormData = z.infer<typeof resourceSchema>
export type TemplateFormData = z.infer<typeof templateSchema>
export type AgencySettingsFormData = z.infer<typeof agencySettingsSchema>
export type PublicationUpdateFormData = z.infer<typeof publicationUpdateSchema>
