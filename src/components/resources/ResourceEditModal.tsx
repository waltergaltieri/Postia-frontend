'use client'

import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Resource } from '@/types'
import { cn } from '@/utils'
import {
  HiPhotograph,
  HiVideoCamera,
} from 'react-icons/hi'
import toast from 'react-hot-toast'

const resourceEditSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
})

type ResourceEditFormData = z.infer<typeof resourceEditSchema>

interface ResourceEditModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (resourceId: string, name: string) => Promise<void>
  resource: Resource | null
}

export function ResourceEditModal({
  isOpen,
  onClose,
  onUpdate,
  resource,
}: ResourceEditModalProps) {
  const [updating, setUpdating] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResourceEditFormData>({
    resolver: zodResolver(resourceEditSchema),
    defaultValues: {
      name: '',
    },
  })

  // Reset form when resource changes
  useEffect(() => {
    if (resource) {
      reset({
        name: resource.name,
      })
    }
  }, [resource, reset])

  const onSubmit = async (data: ResourceEditFormData) => {
    if (!resource) return

    setUpdating(true)
    try {
      await onUpdate(resource.id, data.name)
      onClose()
      toast.success('Recurso actualizado exitosamente')
    } catch (error) {
      console.error('Error updating resource:', error)
      toast.error('Error al actualizar el recurso')
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  if (!resource) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Recurso"
      size="md"
    >
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Resource Info */}
          <div className="flex items-start space-x-4 p-4 bg-secondary-50 rounded-lg">
            {/* Preview */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-secondary-100 rounded-lg overflow-hidden">
                {resource.type === 'image' ? (
                  <img
                    src={resource.url}
                    alt={resource.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <HiVideoCamera className="w-8 h-8 text-secondary-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {resource.type === 'image' ? (
                  <HiPhotograph className="w-4 h-4 text-primary-600" />
                ) : (
                  <HiVideoCamera className="w-4 h-4 text-primary-600" />
                )}
                <span className="text-sm font-medium text-secondary-900 capitalize">
                  {resource.type}
                </span>
              </div>
              <div className="text-sm text-secondary-600 space-y-1">
                <div>Tamaño: {formatFileSize(resource.size)}</div>
                <div>Creado: {formatDate(resource.createdAt)}</div>
              </div>
            </div>
          </div>

          {/* Resource Name */}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Nombre del Recurso"
                placeholder="Ej: Logo de la empresa"
                error={errors.name?.message}
                required
              />
            )}
          />

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
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
              Actualizar Recurso
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}