'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { SocialNetwork } from '@/types'
import { cn } from '@/utils'
import {
  HiUpload,
  HiPhotograph,
  HiViewGrid,
  HiMenu,
  HiTrash,
  HiPlus,
} from 'react-icons/hi'
import toast from 'react-hot-toast'

const templateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['single', 'carousel']).optional(),
  socialNetworks: z
    .array(z.enum(['facebook', 'instagram', 'twitter', 'linkedin']))
    .min(1, 'Selecciona al menos una red social'),
})

type TemplateFormData = z.infer<typeof templateSchema>

interface UploadedImage {
  id: string
  file: File
  preview: string
  name: string
}

interface TemplateUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (data: {
    name: string
    type: 'single' | 'carousel'
    socialNetworks: SocialNetwork[]
    images: { name: string; file: File; dataUrl?: string }[]
  }) => Promise<void>
  workspaceId: string
}

// Sortable Image Item Component
function SortableImageItem({
  image,
  onRemove,
  onRename,
}: {
  image: UploadedImage
  onRemove: (id: string) => void
  onRename: (id: string, name: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(image.name)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id })

  const style = transform
    ? {
      transform: CSS.Transform.toString(transform),
      transition,
    }
    : undefined

  const handleRename = () => {
    if (editName.trim() && editName !== image.name) {
      onRename(image.id, editName.trim())
    }
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setEditName(image.name)
      setIsEditing(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center space-x-3 p-3 bg-white border border-secondary-200 rounded-lg flex-1',
        isDragging && 'opacity-50'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-secondary-400 hover:text-secondary-600"
      >
        <HiMenu className="w-5 h-5" />
      </div>

      {/* Image preview */}
      <div className="w-12 h-12 bg-secondary-100 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={image.preview}
          alt={image.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Image name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyPress}
            className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            autoFocus
            aria-label="Editar nombre de imagen"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-left text-sm font-medium text-secondary-900 hover:text-primary-600 truncate w-full"
          >
            {image.name}
          </button>
        )}
        <p className="text-xs text-secondary-500 mt-1">
          {(image.file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(image.id)}
        className="text-secondary-400 hover:text-error-600 p-1"
        aria-label="Eliminar imagen"
      >
        <HiTrash className="w-4 h-4" />
      </button>
    </div>
  )
}

export function TemplateUploadModal({
  isOpen,
  onClose,
  onUpload,
  workspaceId,
}: TemplateUploadModalProps) {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      type: 'single',
      socialNetworks: [],
    },
  })

  const templateType = watch('type')

  // Auto-determine template type based on number of images
  React.useEffect(() => {
    if (images.length > 1) {
      setValue('type', 'carousel')
    } else if (images.length === 1) {
      setValue('type', 'single')
    }
  }, [images.length, setValue])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      preview: URL.createObjectURL(file),
      name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    }))

    setImages(prev => [...prev, ...newImages])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true, // Always allow multiple files
  })

  // Function to add more images
  const addMoreImages = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      preview: URL.createObjectURL(file),
      name: file.name.replace(/\.[^/.]+$/, ''),
    }))

    setImages(prev => [...prev, ...newImages])
  }, [])

  const {
    getRootProps: getAddMoreRootProps,
    getInputProps: getAddMoreInputProps,
    open: openAddMoreDialog
  } = useDropzone({
    onDrop: addMoreImages,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    noClick: true, // We'll handle clicks manually
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setImages(items => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const removeImage = (id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return prev.filter(img => img.id !== id)
    })
  }

  const renameImage = (id: string, newName: string) => {
    setImages(prev =>
      prev.map(img => (img.id === id ? { ...img, name: newName } : img))
    )
  }

  const onSubmit = async (data: TemplateFormData) => {
    if (images.length === 0) {
      toast.error('Debes subir al menos una imagen')
      return
    }

    setUploading(true)
    try {
      // Auto-determine type based on number of images
      const finalType: 'single' | 'carousel' = images.length > 1 ? 'carousel' : 'single'

      // Convert images to data URLs for temporary storage
      console.log('Converting images to data URLs...')
      const imageDataUrls = await Promise.all(
        images.map(async (img) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string
              console.log('Generated data URL for:', img.name, dataUrl.substring(0, 50) + '...')
              resolve(dataUrl)
            }
            reader.readAsDataURL(img.file)
          })
        })
      )
      console.log('All images converted to data URLs')

      const templateData = {
        name: data.name,
        type: finalType,
        socialNetworks: data.socialNetworks,
        images: images.map((img, index) => ({
          name: img.name,
          file: img.file,
          dataUrl: imageDataUrls[index], // Add data URL for preview
        })),
      }

      console.log('Sending template data:', {
        ...templateData,
        images: templateData.images.map(img => ({
          name: img.name,
          dataUrl: img.dataUrl?.substring(0, 50) + '...'
        }))
      })

      await onUpload(templateData)

      // Clean up
      images.forEach(img => URL.revokeObjectURL(img.preview))
      setImages([])
      reset()
      onClose()
      toast.success('Template creado exitosamente')
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Error al crear el template')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      images.forEach(img => URL.revokeObjectURL(img.preview))
      setImages([])
      reset()
      onClose()
    }
  }

  // Clean up object URLs on unmount
  React.useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview))
    }
  }, [])

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear Nuevo Template"
      size="lg"
    >
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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

        {/* Template Type - Auto-determined */}
        {images.length > 0 && (
          <div className="py-2">
            <label className="block text-sm font-medium text-secondary-700 mb-4">
              Tipo de Template
            </label>
            <div className="flex items-center space-x-4 p-5 bg-secondary-50 rounded-lg">
              {templateType === 'single' ? (
                <>
                  <HiPhotograph className="w-6 h-6 text-primary-600" />
                  <div>
                    <div className="font-medium text-secondary-900">Imagen Única</div>
                    <div className="text-sm text-secondary-600">
                      Una imagen por publicación
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <HiViewGrid className="w-6 h-6 text-primary-600" />
                  <div>
                    <div className="font-medium text-secondary-900">Carrusel</div>
                    <div className="text-sm text-secondary-600">
                      {images.length} imágenes deslizables
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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

        {/* Image Upload */}
        <div className="py-2">
          <label className="block text-sm font-medium text-secondary-700 mb-4">
            Imágenes *
          </label>

          {images.length === 0 ? (
            /* Initial Dropzone */
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-secondary-300 hover:border-secondary-400'
              )}
            >
              <input {...getInputProps()} />
              <HiUpload className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-primary-600">Suelta las imágenes aquí...</p>
              ) : (
                <div>
                  <p className="text-secondary-600 mb-2">
                    Arrastra y suelta imágenes aquí, o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-secondary-500">
                    Sube una imagen para template único o múltiples para carrusel (máx. 10MB cada una)
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Image Preview and Management */
            <div className="space-y-6">
              {/* Image Preview Section */}
              <div className="flex space-x-6">
                {/* Main Preview */}
                <div className="flex-1">
                  <div className="aspect-square bg-secondary-100 rounded-lg overflow-hidden">
                    <img
                      src={images[0].preview}
                      alt={images[0].name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Add More Images Button */}
                <div className="flex-1">
                  <div
                    {...getAddMoreRootProps()}
                    className={cn(
                      'aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors',
                      'border-secondary-300 hover:border-primary-400 hover:bg-primary-50'
                    )}
                    onClick={openAddMoreDialog}
                  >
                    <input {...getAddMoreInputProps()} />
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <HiPlus className="w-8 h-8 text-primary-600" />
                      </div>
                      <p className="text-sm font-medium text-secondary-700 mb-1">
                        Agregar más imágenes
                      </p>
                      <p className="text-xs text-secondary-500">
                        {images.length === 1 ? 'Crear carrusel' : 'Añadir al carrusel'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Management */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-secondary-700">
                    Imágenes ({images.length})
                  </h4>
                  {images.length > 1 && (
                    <p className="text-xs text-secondary-500">
                      Arrastra para reordenar - el orden se respetará en la generación con IA
                    </p>
                  )}
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={images.map(img => img.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {images.map((image, index) => (
                        <div key={image.id} className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                            {index + 1}
                          </div>
                          <SortableImageItem
                            image={image}
                            onRemove={removeImage}
                            onRename={renameImage}
                          />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
        </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-secondary-200">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={uploading}
              disabled={images.length === 0}
            >
              Crear Template
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
