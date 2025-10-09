'use client'

import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Template, SocialNetwork } from '@/types'
import { cn } from '@/utils'
import {
  HiPhotograph,
  HiViewGrid,
} from 'react-icons/hi'
import toast from 'react-hot-toast'

const templateEditSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  socialNetworks: z
    .array(z.enum(['facebook', 'instagram', 'twitter', 'linkedin']))
    .min(1, 'Selecciona al menos una red social'),
})

type TemplateEditFormData = z.infer<typeof templateEditSchema>

interface TemplateEditModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (templateId: string, data: {
    name: string
    socialNetworks: SocialNetwork[]
  }) => Promise<void>
  template: Template | null
}

export function TemplateEditModal({
  isOpen,
  onClose,
  onUpdate,
  template,
}: TemplateEditModalProps) {
  const [updating, setUpdating] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TemplateEditFormData>({
    resolver: zodResolver(templateEditSchema),
    defaultValues: {
      name: '',
      socialNetworks: [],
    },
  })

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        socialNetworks: template.socialNetworks,
      })
    }
  }, [template, reset])

  const onSubmit = async (data: TemplateEditFormData) => {
    if (!template) return

    setUpdating(true)
    try {
      await onUpdate(template.id, {
        name: data.name,
        socialNetworks: data.socialNetworks,
      })

      onClose()
      toast.success('Template actualizado exitosamente')
    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('Error al actualizar el template')
    } finally {
      setUpdating(false)
    }
  }

  const handleClose = () => {
    if (!updating) {
      reset()
      onClose()
    }
  }

  const getTypeIcon = () => {
    return template?.type === 'single' ? (
      <HiPhotograph className="w-6 h-6" />
    ) : (
      <HiViewGrid className="w-6 h-6" />
    )
  }

  const getTypeLabel = () => {
    return template?.type === 'single' ? 'Imagen Única' : 'Carrusel'
  }

  const socialNetworkOptions: {
    value: SocialNetwork
    label: string
    color: string
  }[] = [
      { value: 'facebook', label: 'Facebook', color: 'bg-blue-600' },
      {
        value: 'instagram',
        label: 'Instagram',
        color: 'bg-gradient-to-br from-purple-600 to-pink-600',
      },
      { value: 'twitter', label: 'Twitter', color: 'bg-sky-500' },
      { value: 'linkedin', label: 'LinkedIn', color: 'bg-blue-700' },
    ]

  if (!template) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Template"
      size="lg"
    >
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Template Info */}
          <div className="flex items-center space-x-4 p-5 bg-secondary-50 rounded-lg">
            <div className="text-primary-600">
              {getTypeIcon()}
            </div>
            <div>
              <div className="font-medium text-secondary-900">{getTypeLabel()}</div>
              <div className="text-sm text-secondary-600">
                {template.images.length} imagen{template.images.length !== 1 ? 'es' : ''}
              </div>
            </div>
          </div>

          {/* Template Name */}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Nombre del Template"
                placeholder="Ej: Template de Producto"
                error={errors.name?.message}
                required
              />
            )}
          />

          {/* Social Networks */}
          <div className="py-2">
            <label className="block text-sm font-medium text-secondary-700 mb-4">
              Redes Sociales *
            </label>
            <Controller
              name="socialNetworks"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-4">
                  {socialNetworkOptions.map(option => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors',
                        field.value.includes(option.value)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-secondary-200 hover:border-secondary-300'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={field.value.includes(option.value)}
                        onChange={e => {
                          if (e.target.checked) {
                            field.onChange([...field.value, option.value])
                          } else {
                            field.onChange(
                              field.value.filter(v => v !== option.value)
                            )
                          }
                        }}
                        className="sr-only"
                        aria-label={`Seleccionar ${option.label}`}
                      />
                      <div className={cn('w-4 h-4 rounded mr-3', option.color)} />
                      <span className="font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.socialNetworks && (
              <p className="mt-1 text-sm text-error-600">
                {errors.socialNetworks.message}
              </p>
            )}
          </div>

          {/* Image Preview */}
          <div className="py-2">
            <label className="block text-sm font-medium text-secondary-700 mb-4">
              Imágenes (Solo lectura)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {template.images.slice(0, 8).map((image, index) => (
                <div key={index} className="aspect-square bg-secondary-100 rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt={`${template.name} - ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {template.images.length > 8 && (
                <div className="aspect-square bg-secondary-100 rounded-lg flex items-center justify-center">
                  <span className="text-secondary-500 text-sm">
                    +{template.images.length - 8} más
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-secondary-500 mt-2">
              Para cambiar las imágenes, crea un nuevo template
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-secondary-200">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={updating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={updating}
            >
              Actualizar Template
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}