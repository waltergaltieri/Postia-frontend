'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import DatePicker from 'react-datepicker'
import { CampaignFormData, SocialNetwork } from '@/types'
import { z } from 'zod'

// Create a partial schema for step 1 that doesn't require resources, templates, and prompt
const campaignStep1Schema = z
  .object({
    name: z.string().min(1, 'El nombre de la campaña es requerido'),
    objective: z
      .string()
      .min(10, 'El objetivo debe tener al menos 10 caracteres'),
    startDate: z.date({ message: 'La fecha de inicio es requerida' }),
    endDate: z.date({ message: 'La fecha de fin es requerida' }),
    socialNetworks: z
      .array(z.enum(['instagram', 'linkedin', 'tiktok']))
      .min(1, 'Selecciona al menos una red social'),
    interval: z
      .number()
      .min(1, 'El intervalo debe ser al menos 1 hora')
      .max(168, 'El intervalo no puede exceder 168 horas (1 semana)'),
    contentType: z.enum(['unified', 'optimized']),
    optimizationSettings: z
      .record(
        z.string(),
        z.object({
          tone: z.string(),
          hashtags: z.boolean(),
        })
      )
      .optional(),
    resources: z.array(z.string()).optional(),
    templates: z.array(z.string()).optional(),
    prompt: z.string().optional(),
  })
  .refine(data => data.endDate > data.startDate, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
  })

type CampaignStep1Data = z.infer<typeof campaignStep1Schema>
import { Input } from '@/components/common/Input'
import { Button } from '@/components/common/Button'
import { FaInstagram, FaLinkedin, FaTiktok } from 'react-icons/fa'
import 'react-datepicker/dist/react-datepicker.css'

interface CampaignDataStepProps {
  initialData: Partial<CampaignFormData>
  onNext: (data: Partial<CampaignFormData>) => void
  onCancel: () => void
}

const socialNetworkOptions: {
  value: SocialNetwork
  label: string
  icon: React.ComponentType<any>
}[] = [
  { value: 'instagram', label: 'Instagram', icon: FaInstagram },
  { value: 'linkedin', label: 'LinkedIn', icon: FaLinkedin },
  { value: 'tiktok', label: 'TikTok', icon: FaTiktok },
]

const toneOptions = [
  { value: 'professional', label: 'Profesional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Amigable' },
  { value: 'urgent', label: 'Urgente' },
  { value: 'exciting', label: 'Emocionante' },
  { value: 'informative', label: 'Informativo' },
]

export function CampaignDataStep({
  initialData,
  onNext,
  onCancel,
}: CampaignDataStepProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<CampaignStep1Data>({
    resolver: zodResolver(campaignStep1Schema),
    defaultValues: {
      name: initialData.name || '',
      objective: initialData.objective || '',
      startDate: initialData.startDate || new Date(),
      endDate:
        initialData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      socialNetworks: initialData.socialNetworks || [],
      interval: initialData.interval || 24,
      contentType: initialData.contentType || 'unified',
      optimizationSettings:
        (initialData.optimizationSettings as Record<
          string,
          { tone: string; hashtags: boolean }
        >) || {},
      resources: initialData.resources || [],
      templates: initialData.templates || [],
      prompt: initialData.prompt || '',
    },
    mode: 'onChange',
  })

  const watchedFields = watch()
  const selectedSocialNetworks = watch('socialNetworks')
  const contentType = watch('contentType')

  const handleSocialNetworkChange = (
    network: SocialNetwork,
    checked: boolean
  ) => {
    const current = selectedSocialNetworks || []
    if (checked) {
      setValue('socialNetworks', [...current, network], {
        shouldValidate: true,
      })
    } else {
      setValue(
        'socialNetworks',
        current.filter(n => n !== network),
        { shouldValidate: true }
      )

      // Remove optimization settings for unchecked network
      if (contentType === 'optimized') {
        const currentSettings = watchedFields.optimizationSettings || {}
        const newSettings = { ...currentSettings }
        delete newSettings[network]
        setValue('optimizationSettings', newSettings)
      }
    }
  }

  const handleOptimizationChange = (
    network: SocialNetwork,
    field: 'tone' | 'hashtags',
    value: string | boolean
  ) => {
    const currentSettings = watchedFields.optimizationSettings || {}
    const networkSettings = currentSettings[network] || {
      tone: 'professional',
      hashtags: true,
    }

    setValue('optimizationSettings', {
      ...currentSettings,
      [network]: {
        ...networkSettings,
        [field]: value,
      },
    })
  }

  const onSubmit = (data: CampaignStep1Data) => {
    onNext(data as Partial<CampaignFormData>)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-6">
        <h3 className="section-title">Información Básica</h3>

        <div className="grid grid-cols-1 gap-6">
          <Input
            label="Nombre de la Campaña"
            placeholder="Ej: Campaña de Verano 2024"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="form-group">
            <label className="form-label">Objetivo de la Campaña</label>
            <textarea
              placeholder="Describe el objetivo principal de esta campaña..."
              className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                errors.objective
                  ? 'border-red-300'
                  : 'border-secondary-200 hover:border-secondary-300'
              }`}
              rows={4}
              {...register('objective')}
            />
            {errors.objective && (
              <p className="form-error">{errors.objective.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-secondary-900">
          Fechas de Campaña
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Fecha de Inicio
            </label>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onChange={field.onChange}
                  dateFormat="dd/MM/yyyy"
                  minDate={new Date()}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.startDate ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  placeholderText="Selecciona fecha de inicio"
                />
              )}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.startDate.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Fecha de Fin
            </label>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onChange={field.onChange}
                  dateFormat="dd/MM/yyyy"
                  minDate={watchedFields.startDate || new Date()}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.endDate ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  placeholderText="Selecciona fecha de fin"
                />
              )}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.endDate.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Social Networks */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-secondary-900">
          Redes Sociales
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {socialNetworkOptions.map(({ value, label, icon: Icon }) => {
            const isSelected = selectedSocialNetworks?.includes(value) || false
            return (
              <label
                key={value}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-secondary-300 hover:border-secondary-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={e =>
                    handleSocialNetworkChange(value, e.target.checked)
                  }
                  className="sr-only"
                />
                <Icon className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">{label}</span>
              </label>
            )
          })}
        </div>
        {errors.socialNetworks && (
          <p className="text-sm text-red-600">
            {errors.socialNetworks.message}
          </p>
        )}
      </div>

      {/* Publishing Interval */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-secondary-900">
          Frecuencia de Publicación
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="number"
            label="Intervalo (horas)"
            placeholder="24"
            min="1"
            max="168"
            error={errors.interval?.message}
            {...register('interval', { valueAsNumber: true })}
          />
          <div className="flex items-end">
            <p className="text-sm text-secondary-600">
              Las publicaciones se programarán cada{' '}
              {watchedFields.interval || 24} horas
            </p>
          </div>
        </div>
      </div>

      {/* Content Type */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-secondary-900">
          Tipo de Contenido
        </h3>

        <div className="space-y-3">
          <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:border-secondary-400">
            <input
              type="radio"
              value="unified"
              {...register('contentType')}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-secondary-900">
                Contenido Unificado
              </div>
              <div className="text-sm text-secondary-600">
                El mismo contenido se publicará en todas las redes sociales
                seleccionadas
              </div>
            </div>
          </label>

          <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:border-secondary-400">
            <input
              type="radio"
              value="optimized"
              {...register('contentType')}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-secondary-900">
                Contenido Optimizado
              </div>
              <div className="text-sm text-secondary-600">
                El contenido se adaptará específicamente para cada red social
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Optimization Settings */}
      {contentType === 'optimized' &&
        selectedSocialNetworks &&
        selectedSocialNetworks.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-secondary-900">
              Configuración de Optimización
            </h3>

            <div className="space-y-4">
              {selectedSocialNetworks.map(network => {
                const networkOption = socialNetworkOptions.find(
                  opt => opt.value === network
                )
                const Icon = networkOption?.icon
                const currentSettings = (watchedFields.optimizationSettings?.[
                  network
                ] as { tone: string; hashtags: boolean }) || {
                  tone: 'professional',
                  hashtags: true,
                }

                return (
                  <div
                    key={network}
                    className="p-4 border border-secondary-200 rounded-lg"
                  >
                    <div className="flex items-center mb-3">
                      {Icon && (
                        <Icon className="w-5 h-5 mr-2 text-secondary-600" />
                      )}
                      <h4 className="font-medium text-secondary-900">
                        {networkOption?.label}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Tono de Voz
                        </label>
                        <select
                          value={currentSettings.tone}
                          onChange={e =>
                            handleOptimizationChange(
                              network,
                              'tone',
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                          aria-label={`Tono de voz para ${networkOption?.label}`}
                        >
                          {toneOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={currentSettings.hashtags}
                            onChange={e =>
                              handleOptimizationChange(
                                network,
                                'hashtags',
                                e.target.checked
                              )
                            }
                            className="mr-2 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-secondary-700">
                            Incluir hashtags
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-6 border-t border-secondary-200">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!isValid}>
          Continuar
        </Button>
      </div>
    </form>
  )
}
