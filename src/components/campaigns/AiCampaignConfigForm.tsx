'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import DatePicker from 'react-datepicker'
import { aiCampaignConfigSchema, AiCampaignConfigFormData } from '@/utils/validations'
import { Input } from '@/components/common/Input'
import { Button } from '@/components/common/Button'
import { PlatformSelector } from '@/components/campaigns/PlatformSelector'
import { ResourceSelector } from '@/components/campaigns/ResourceSelector'
import { TemplateSelector } from '@/components/campaigns/TemplateSelector'
import 'react-datepicker/dist/react-datepicker.css'

interface AiCampaignConfigFormProps {
  workspaceId: string
  onSubmit: (data: AiCampaignConfigFormData) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<AiCampaignConfigFormData>
}

export function AiCampaignConfigForm({
  workspaceId,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData = {},
}: AiCampaignConfigFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<AiCampaignConfigFormData>({
    resolver: zodResolver(aiCampaignConfigSchema),
    defaultValues: {
      name: initialData.name || '',
      description: initialData.description || '',
      startDate: initialData.startDate || new Date(),
      endDate: initialData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      publicationsPerDay: initialData.publicationsPerDay || 1,
      intervalDays: initialData.intervalDays || 1,
      platformDistribution: initialData.platformDistribution || {
        instagram: 40,
        linkedin: 30,
        twitter: 20,
        facebook: 10,
      },
      selectedResources: initialData.selectedResources || [],
      selectedTemplates: initialData.selectedTemplates || [],
      shortPrompt: initialData.shortPrompt || '',
      longPrompt: initialData.longPrompt || '',
    },
    mode: 'onChange',
  })

  const watchedFields = watch()
  const shortPromptLength = watch('shortPrompt')?.length || 0
  const longPromptLength = watch('longPrompt')?.length || 0

  const handleFormSubmit = (data: AiCampaignConfigFormData) => {
    onSubmit(data)
  }

  const handlePlatformDistributionChange = (distribution: {
    instagram: number
    linkedin: number
    twitter: number
    facebook: number
  }) => {
    setValue('platformDistribution', distribution, { shouldValidate: true })
  }

  const handleResourcesChange = (resources: string[]) => {
    setValue('selectedResources', resources, { shouldValidate: true })
  }

  const handleTemplatesChange = (templates: string[]) => {
    setValue('selectedTemplates', templates, { shouldValidate: true })
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-secondary-100">
      <div className="px-6 py-4 border-b border-secondary-200">
        <h2 className="text-xl font-semibold text-secondary-900">
          Configuración de Campaña con IA
        </h2>
        <p className="text-sm text-secondary-600 mt-1">
          Configura todos los parámetros para generar contenido automáticamente
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-8 space-y-8">
        {/* Información Básica */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-secondary-900">
            Información Básica
          </h3>

          <div className="grid grid-cols-1 gap-6">
            <Input
              label="Nombre de la Campaña"
              placeholder="Ej: Campaña de Verano 2024"
              error={errors.name?.message}
              required
              {...register('name')}
            />

            <div className="form-group">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Descripción de la Campaña
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                placeholder="Describe el propósito y contexto de esta campaña..."
                className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                  errors.description
                    ? 'border-red-300'
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
                rows={4}
                {...register('description')}
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Fechas de Campaña */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary-900">
            Fechas de Campaña
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Fecha de Inicio
                <span className="text-red-500 ml-0.5">*</span>
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
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Fecha de Fin
                <span className="text-red-500 ml-0.5">*</span>
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

        {/* Frecuencia de Publicaciones */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary-900">
            Frecuencia de Publicaciones
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Publicaciones por Día"
              placeholder="1"
              min="1"
              max="10"
              error={errors.publicationsPerDay?.message}
              {...register('publicationsPerDay', { valueAsNumber: true })}
            />

            <Input
              type="number"
              label="Intervalo entre Días"
              placeholder="1"
              min="1"
              max="7"
              helperText="Días entre cada ronda de publicaciones"
              error={errors.intervalDays?.message}
              {...register('intervalDays', { valueAsNumber: true })}
            />
          </div>

          <div className="bg-secondary-50 p-4 rounded-lg">
            <p className="text-sm text-secondary-600">
              Se generarán {watchedFields.publicationsPerDay || 1} publicaciones cada{' '}
              {watchedFields.intervalDays || 1} día(s) durante el período de la campaña.
            </p>
          </div>
        </div>

        {/* Distribución de Plataformas */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary-900">
            Distribución de Plataformas
          </h3>
          <PlatformSelector
            distribution={watchedFields.platformDistribution}
            onChange={handlePlatformDistributionChange}
            error={errors.platformDistribution?.message}
          />
        </div>

        {/* Selección de Recursos */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary-900">
            Recursos Gráficos
          </h3>
          <ResourceSelector
            workspaceId={workspaceId}
            selectedResources={watchedFields.selectedResources}
            onChange={handleResourcesChange}
            error={errors.selectedResources?.message}
          />
        </div>

        {/* Selección de Templates */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary-900">
            Templates (Opcional)
          </h3>
          <TemplateSelector
            workspaceId={workspaceId}
            selectedTemplates={watchedFields.selectedTemplates || []}
            onChange={handleTemplatesChange}
          />
        </div>

        {/* Prompts para IA */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-secondary-900">
            Instrucciones para IA
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Objetivo de la Campaña
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Promocionar nuevos productos de verano para aumentar ventas"
                className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                  errors.shortPrompt
                    ? 'border-red-300'
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
                {...register('shortPrompt')}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.shortPrompt && (
                  <p className="text-sm text-red-600">
                    {errors.shortPrompt.message}
                  </p>
                )}
                <p className="text-xs text-secondary-500 ml-auto">
                  {shortPromptLength}/200 caracteres
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Instrucciones Detalladas
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                placeholder="Proporciona instrucciones detalladas sobre el tono, estilo, audiencia objetivo, mensajes clave, etc."
                className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                  errors.longPrompt
                    ? 'border-red-300'
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
                rows={6}
                {...register('longPrompt')}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.longPrompt && (
                  <p className="text-sm text-red-600">
                    {errors.longPrompt.message}
                  </p>
                )}
                <p className="text-xs text-secondary-500 ml-auto">
                  {longPromptLength}/2000 caracteres
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 justify-end pt-6 border-t border-secondary-200">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isValid} loading={isLoading}>
            Generar Descripciones
          </Button>
        </div>
      </form>
    </div>
  )
}