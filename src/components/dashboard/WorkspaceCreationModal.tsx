'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Modal, ColorPicker } from '@/components/common'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-hot-toast'

const workspaceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  branding: z.object({
    colors: z.object({
      primary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color primario inválido'),
      secondary: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, 'Color secundario inválido'),
    }),
    logo: z.string().optional(),
    slogan: z.string().max(100, 'El eslogan no puede exceder 100 caracteres'),
    description: z
      .string()
      .max(500, 'La descripción no puede exceder 500 caracteres'),
    whatsapp: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Número de WhatsApp inválido'),
  }),
})

type WorkspaceFormData = z.infer<typeof workspaceSchema>

interface WorkspaceCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: WorkspaceFormData) => void
}

export function WorkspaceCreationModal({
  isOpen,
  onClose,
  onSubmit,
}: WorkspaceCreationModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: '',
      branding: {
        colors: {
          primary: '#3B82F6',
          secondary: '#6B7280',
        },
        logo: '',
        slogan: '',
        description: '',
        whatsapp: '',
      },
    },
  })

  const watchedValues = watch()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          setLogoPreview(result)
          setValue('branding.logo', result)
        }
        reader.readAsDataURL(file)
      }
    },
    onDropRejected: fileRejections => {
      const error = fileRejections[0]?.errors[0]
      if (error?.code === 'file-too-large') {
        toast.error('El archivo es demasiado grande. Máximo 5MB.')
      } else if (error?.code === 'file-invalid-type') {
        toast.error('Tipo de archivo no válido. Solo se permiten imágenes.')
      }
    },
  })

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFormSubmit = (data: WorkspaceFormData) => {
    onSubmit(data)
    reset()
    setCurrentStep(1)
    setLogoPreview(null)
    onClose()
  }

  const handleClose = () => {
    reset()
    setCurrentStep(1)
    setLogoPreview(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear Nuevo Espacio de Trabajo"
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 1
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-200 text-secondary-600'
              }`}
            >
              1
            </div>
            <div
              className={`h-1 w-16 ${
                currentStep >= 2 ? 'bg-primary-600' : 'bg-secondary-200'
              }`}
            ></div>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 2
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-200 text-secondary-600'
              }`}
            >
              2
            </div>
          </div>
        </div>

        {/* Step 1: Basic Information and Branding */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-secondary-900">
                Información Básica y Branding
              </h3>
              <p className="text-secondary-600 text-sm">
                Configura la información básica y el branding de tu cliente
              </p>
            </div>

            {/* Workspace Name */}
            <Input
              label="Nombre del Espacio de Trabajo"
              placeholder="Ej: Restaurante El Buen Sabor"
              error={errors.name?.message}
              {...register('name')}
            />

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Logo (Opcional)
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-secondary-300 hover:border-secondary-400'
                }`}
              >
                <input {...getInputProps()} />
                {logoPreview ? (
                  <div className="space-y-2">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="mx-auto h-16 w-16 object-cover rounded"
                    />
                    <p className="text-sm text-secondary-600">
                      Arrastra una nueva imagen o haz clic para cambiar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <svg
                      className="mx-auto h-12 w-12 text-secondary-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-sm text-secondary-600">
                      {isDragActive
                        ? 'Suelta la imagen aquí'
                        : 'Arrastra una imagen o haz clic para seleccionar'}
                    </p>
                    <p className="text-xs text-secondary-500">
                      PNG, JPG, GIF hasta 5MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Color Picker */}
            <div className="grid grid-cols-2 gap-4">
              <ColorPicker
                label="Color Primario"
                placeholder="#3B82F6"
                error={errors.branding?.colors?.primary?.message}
                value={watchedValues.branding?.colors?.primary || '#3B82F6'}
                onChange={(value) => setValue('branding.colors.primary', value, { shouldDirty: true })}
              />
              <ColorPicker
                label="Color Secundario"
                placeholder="#6B7280"
                error={errors.branding?.colors?.secondary?.message}
                value={watchedValues.branding?.colors?.secondary || '#6B7280'}
                onChange={(value) => setValue('branding.colors.secondary', value, { shouldDirty: true })}
              />
            </div>

            {/* Slogan */}
            <Input
              label="Eslogan"
              placeholder="Ej: La mejor comida de la ciudad"
              error={errors.branding?.slogan?.message}
              {...register('branding.slogan')}
            />

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Descripción
              </label>
              <textarea
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="Describe brevemente el negocio de tu cliente..."
                {...register('branding.description')}
              />
              {errors.branding?.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.branding.description.message}
                </p>
              )}
            </div>

            {/* WhatsApp */}
            <Input
              label="WhatsApp"
              placeholder="+1234567890"
              error={errors.branding?.whatsapp?.message}
              {...register('branding.whatsapp')}
            />
          </div>
        )}

        {/* Step 2: Confirmation and Review */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-secondary-900">
                Confirmación y Revisión
              </h3>
              <p className="text-secondary-600 text-sm">
                Revisa la información antes de crear el espacio de trabajo
              </p>
            </div>

            {/* Preview Card */}
            <div className="border border-secondary-200 rounded-lg p-6 bg-secondary-50">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-16 w-16 rounded-lg bg-white border border-secondary-200 flex items-center justify-center">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <span
                      className="text-2xl font-bold"
                      style={{ color: watchedValues.branding.colors.primary }}
                    >
                      {watchedValues.name.charAt(0).toUpperCase() || 'N'}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-secondary-900">
                    {watchedValues.name || 'Nombre del espacio'}
                  </h4>
                  <p className="text-secondary-600">
                    {watchedValues.branding.slogan || 'Eslogan'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-secondary-700">
                    Color Primario:
                  </span>
                  <div className="flex items-center space-x-2 mt-1">
                    <div
                      className="h-6 w-6 rounded border border-secondary-300"
                      style={{
                        backgroundColor: watchedValues.branding.colors.primary,
                      }}
                    ></div>
                    <span className="text-sm text-secondary-600">
                      {watchedValues.branding.colors.primary}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-secondary-700">
                    Color Secundario:
                  </span>
                  <div className="flex items-center space-x-2 mt-1">
                    <div
                      className="h-6 w-6 rounded border border-secondary-300"
                      style={{
                        backgroundColor:
                          watchedValues.branding.colors.secondary,
                      }}
                    ></div>
                    <span className="text-sm text-secondary-600">
                      {watchedValues.branding.colors.secondary}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-secondary-700">
                    Descripción:
                  </span>
                  <p className="text-sm text-secondary-600 mt-1">
                    {watchedValues.branding.description || 'Sin descripción'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-secondary-700">
                    WhatsApp:
                  </span>
                  <p className="text-sm text-secondary-600 mt-1">
                    {watchedValues.branding.whatsapp || 'No especificado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-between pt-6 border-t border-secondary-200">
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrevious}
              >
                Anterior
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>

            {currentStep < 2 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!watchedValues.name || Object.keys(errors).length > 0}
              >
                Siguiente
              </Button>
            ) : (
              <Button type="submit" disabled={Object.keys(errors).length > 0}>
                Crear Espacio de Trabajo
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}
