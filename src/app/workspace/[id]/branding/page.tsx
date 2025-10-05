'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams } from 'next/navigation'
import { WorkspaceLayout } from '@/layouts'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Button, Input } from '@/components/common'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-hot-toast'
import { HiPhotograph, HiColorSwatch, HiSave, HiRefresh } from 'react-icons/hi'
import type { WorkspaceBranding } from '@/types'
import '@/styles/branding.css'

const brandingSchema = z.object({
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color primario inválido'),
    secondary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color secundario inválido'),
  }),
  logo: z.string().optional(),
  slogan: z.string().max(100, 'El eslogan no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres'),
  whatsapp: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Número de WhatsApp inválido'),
})

type BrandingFormData = z.infer<typeof brandingSchema>

export default function WorkspaceBrandingPage() {
  const params = useParams()
  const workspaceId = params.id as string
  const { currentWorkspace, switchWorkspace, workspaces, updateWorkspace } =
    useWorkspace()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
  })

  const watchedValues = watch()

  // Ensure we have the correct workspace selected and initialize form
  useEffect(() => {
    if (
      workspaceId &&
      (!currentWorkspace || currentWorkspace.id !== workspaceId)
    ) {
      const workspace = workspaces.find(w => w.id === workspaceId)
      if (workspace) {
        switchWorkspace(workspaceId)
      }
    }
  }, [workspaceId, currentWorkspace, switchWorkspace, workspaces])

  // Initialize form with current workspace branding
  useEffect(() => {
    if (currentWorkspace) {
      const branding = currentWorkspace.branding
      reset({
        colors: {
          primary: branding.colors.primary,
          secondary: branding.colors.secondary,
        },
        logo: branding.logo || '',
        slogan: branding.slogan,
        description: branding.description,
        whatsapp: branding.whatsapp,
      })
      setLogoPreview(branding.logo || null)
    }
  }, [currentWorkspace, reset])

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
          setValue('logo', result, { shouldDirty: true })
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

  const handleFormSubmit = async (data: BrandingFormData) => {
    if (!currentWorkspace) return

    setIsLoading(true)
    try {
      const updatedBranding: WorkspaceBranding = {
        colors: {
          primary: data.colors.primary,
          secondary: data.colors.secondary,
        },
        logo: data.logo,
        slogan: data.slogan,
        description: data.description,
        whatsapp: data.whatsapp,
      }

      await updateWorkspace(currentWorkspace.id, { branding: updatedBranding })
      toast.success('Branding actualizado exitosamente')
    } catch (error) {
      console.error('Error updating branding:', error)
      toast.error('Error al actualizar el branding')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    if (currentWorkspace) {
      const branding = currentWorkspace.branding
      reset({
        colors: {
          primary: branding.colors.primary,
          secondary: branding.colors.secondary,
        },
        logo: branding.logo || '',
        slogan: branding.slogan,
        description: branding.description,
        whatsapp: branding.whatsapp,
      })
      setLogoPreview(branding.logo || null)
      toast('Cambios descartados', { icon: 'ℹ️' })
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">
            Cargando espacio de trabajo...
          </p>
        </div>
      </div>
    )
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId}>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900">
              Configuración de Branding
            </h1>
            <p className="text-secondary-600 mt-2">
              Personaliza la identidad visual de {currentWorkspace.name}
            </p>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Form */}
              <div className="space-y-6">
                {/* Logo Upload Section */}
                <div className="bg-white rounded-xl shadow-sm border border-secondary-100 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <HiPhotograph className="h-5 w-5 text-primary-600" />
                    <h2 className="text-xl font-semibold text-secondary-900">
                      Logo
                    </h2>
                  </div>

                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                      isDragActive
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-secondary-300 hover:border-secondary-400 hover:bg-secondary-50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {logoPreview ? (
                      <div className="space-y-3">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="mx-auto h-20 w-20 object-cover rounded-lg border border-secondary-200"
                        />
                        <p className="text-sm text-secondary-600">
                          Arrastra una nueva imagen o haz clic para cambiar
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="mx-auto h-16 w-16 bg-secondary-100 rounded-lg flex items-center justify-center">
                          <HiPhotograph className="h-8 w-8 text-secondary-400" />
                        </div>
                        <div>
                          <p className="text-sm text-secondary-600">
                            {isDragActive
                              ? 'Suelta la imagen aquí'
                              : 'Arrastra una imagen o haz clic para seleccionar'}
                          </p>
                          <p className="text-xs text-secondary-500 mt-1">
                            PNG, JPG, GIF hasta 5MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Colors Section */}
                <div className="bg-white rounded-xl shadow-sm border border-secondary-100 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <HiColorSwatch className="h-5 w-5 text-primary-600" />
                    <h2 className="text-xl font-semibold text-secondary-900">
                      Colores de Marca
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Color Primario
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          className="h-11 w-16 rounded-lg border border-secondary-300 cursor-pointer bg-white"
                          {...register('colors.primary')}
                        />
                        <Input
                          placeholder="#9333ea"
                          error={errors.colors?.primary?.message}
                          {...register('colors.primary')}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Color Secundario
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          className="h-11 w-16 rounded-lg border border-secondary-300 cursor-pointer bg-white"
                          {...register('colors.secondary')}
                        />
                        <Input
                          placeholder="#737373"
                          error={errors.colors?.secondary?.message}
                          {...register('colors.secondary')}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="bg-white rounded-xl shadow-sm border border-secondary-100 p-6">
                  <h2 className="text-xl font-semibold text-secondary-900 mb-4">
                    Información de Marca
                  </h2>

                  <div className="space-y-4">
                    <Input
                      label="Eslogan"
                      placeholder="Ej: La mejor comida de la ciudad"
                      error={errors.slogan?.message}
                      {...register('slogan')}
                    />

                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Descripción
                      </label>
                      <textarea
                        className="w-full px-4 py-2.5 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm text-secondary-900 placeholder:text-secondary-400"
                        rows={4}
                        placeholder="Describe brevemente el negocio..."
                        {...register('description')}
                      />
                      {errors.description && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.description.message}
                        </p>
                      )}
                    </div>

                    <Input
                      label="WhatsApp"
                      placeholder="+1234567890"
                      error={errors.whatsapp?.message}
                      {...register('whatsapp')}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Preview */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-secondary-100 p-6 sticky top-8">
                  <h2 className="text-xl font-semibold text-secondary-900 mb-6">
                    Vista Previa
                  </h2>

                  {/* Brand Preview Card */}
                  <div
                    className="branding-preview-card border-2 rounded-xl p-6"
                    data-primary-color="true"
                    style={
                      {
                        '--preview-primary-color':
                          watchedValues?.colors?.primary ||
                          currentWorkspace.branding.colors.primary,
                        '--preview-primary-bg': `${watchedValues?.colors?.primary || currentWorkspace.branding.colors.primary}08`,
                      } as React.CSSProperties
                    }
                  >
                    <div className="flex items-center space-x-4 mb-4">
                      <div
                        className="branding-logo-container h-16 w-16 rounded-xl flex items-center justify-center border-2"
                        data-primary-color="true"
                        style={
                          {
                            '--preview-primary-color':
                              watchedValues?.colors?.primary ||
                              currentWorkspace.branding.colors.primary,
                          } as React.CSSProperties
                        }
                      >
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="h-12 w-12 object-cover rounded-lg"
                          />
                        ) : (
                          <span
                            className="branding-primary-text text-2xl font-bold"
                            style={
                              {
                                '--preview-primary-color':
                                  watchedValues?.colors?.primary ||
                                  currentWorkspace.branding.colors.primary,
                              } as React.CSSProperties
                            }
                          >
                            {currentWorkspace.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-secondary-900">
                          {currentWorkspace.name}
                        </h3>
                        <p
                          className="branding-secondary-text text-sm font-medium"
                          style={
                            {
                              '--preview-secondary-color':
                                watchedValues?.colors?.secondary ||
                                currentWorkspace.branding.colors.secondary,
                            } as React.CSSProperties
                          }
                        >
                          {watchedValues?.slogan ||
                            currentWorkspace.branding.slogan ||
                            'Eslogan de la marca'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-secondary-700 mb-1">
                          Descripción
                        </h4>
                        <p className="text-sm text-secondary-600">
                          {watchedValues?.description ||
                            currentWorkspace.branding.description ||
                            'Descripción del negocio'}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-secondary-700 mb-1">
                          WhatsApp
                        </h4>
                        <p className="text-sm text-secondary-600">
                          {watchedValues?.whatsapp ||
                            currentWorkspace.branding.whatsapp ||
                            'No especificado'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4 pt-2">
                        <div className="flex items-center space-x-2">
                          <div
                            className="branding-color-preview w-4 h-4 rounded-full"
                            data-color="true"
                            style={
                              {
                                '--preview-color':
                                  watchedValues?.colors?.primary ||
                                  currentWorkspace.branding.colors.primary,
                              } as React.CSSProperties
                            }
                          ></div>
                          <span className="text-xs text-secondary-500">
                            Primario
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div
                            className="branding-color-preview w-4 h-4 rounded-full"
                            data-color="true"
                            style={
                              {
                                '--preview-color':
                                  watchedValues?.colors?.secondary ||
                                  currentWorkspace.branding.colors.secondary,
                              } as React.CSSProperties
                            }
                          ></div>
                          <span className="text-xs text-secondary-500">
                            Secundario
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between items-center pt-6 border-t border-secondary-200">
              <div>
                {isDirty && (
                  <p className="text-sm text-amber-600 flex items-center">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                    Tienes cambios sin guardar
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReset}
                  disabled={!isDirty || isLoading}
                >
                  <HiRefresh className="h-4 w-4 mr-2" />
                  Descartar Cambios
                </Button>

                <Button
                  type="submit"
                  disabled={
                    Object.keys(errors).length > 0 || !isDirty || isLoading
                  }
                  loading={isLoading}
                >
                  <HiSave className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
