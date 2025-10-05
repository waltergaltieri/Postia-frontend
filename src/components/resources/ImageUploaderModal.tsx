'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { cn } from '@/utils'
import {
  HiUpload,
  HiPhotograph,
  HiX,
  HiCheck,
  HiExclamationCircle,
} from 'react-icons/hi'
import toast from 'react-hot-toast'

// File validation schema
const fileUploadSchema = z.object({
  name: z.string().min(1, 'El nombre del recurso es requerido'),
  files: z.array(z.instanceof(File)).min(1, 'Selecciona al menos un archivo'),
})

type FileUploadFormData = z.infer<typeof fileUploadSchema>

interface FileWithPreview extends File {
  preview: string
  id: string
}

interface ImageUploaderModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (files: { name: string; file: File }[]) => Promise<void>
  workspaceId: string
}

export function ImageUploaderModal({
  isOpen,
  onClose,
  onUpload,
  workspaceId,
}: ImageUploaderModalProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FileUploadFormData>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: {
      name: '',
      files: [],
    },
  })

  // File validation
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

    if (file.size > maxSize) {
      return 'El archivo no puede exceder 10MB'
    }

    if (!allowedTypes.includes(file.type)) {
      return 'Tipo de archivo no soportado. Solo se permiten imágenes (JPEG, PNG, WebP, GIF)'
    }

    return null
  }

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            toast.error(
              `${file.name}: El archivo es demasiado grande (máximo 10MB)`
            )
          } else if (error.code === 'file-invalid-type') {
            toast.error(`${file.name}: Tipo de archivo no soportado`)
          } else {
            toast.error(`${file.name}: Error al procesar el archivo`)
          }
        })
      })

      // Process accepted files
      const validFiles: FileWithPreview[] = []

      acceptedFiles.forEach(file => {
        const validationError = validateFile(file)
        if (validationError) {
          toast.error(`${file.name}: ${validationError}`)
          return
        }

        const fileWithPreview: FileWithPreview = Object.assign(file, {
          preview: URL.createObjectURL(file),
          id: Math.random().toString(36).substr(2, 9),
        })

        validFiles.push(fileWithPreview)
      })

      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles])
        setValue('files', [...files, ...validFiles])

        // Auto-generate name if only one file and no name set
        if (validFiles.length === 1 && !watch('name')) {
          const fileName = validFiles[0].name.replace(/\.[^/.]+$/, '')
          setValue('name', fileName)
        }
      }
    },
    [files, setValue, watch]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  })

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const updatedFiles = prev.filter(file => file.id !== fileId)
      setValue('files', updatedFiles)
      return updatedFiles
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const simulateUploadProgress = (fileId: string): Promise<void> => {
    return new Promise(resolve => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 30
        if (progress >= 100) {
          progress = 100
          setUploadProgress(prev => ({ ...prev, [fileId]: progress }))
          clearInterval(interval)
          resolve()
        } else {
          setUploadProgress(prev => ({ ...prev, [fileId]: progress }))
        }
      }, 200)
    })
  }

  const onSubmit = async (data: FileUploadFormData) => {
    if (files.length === 0) {
      toast.error('Selecciona al menos un archivo')
      return
    }

    setUploading(true)
    setUploadProgress({})

    try {
      // Simulate upload progress for each file
      const uploadPromises = files.map(file => simulateUploadProgress(file.id))
      await Promise.all(uploadPromises)

      // Prepare files for upload
      const filesToUpload = files.map((file, index) => ({
        name: files.length === 1 ? data.name : `${data.name} ${index + 1}`,
        file: file,
      }))

      await onUpload(filesToUpload)

      toast.success(`${files.length} archivo(s) subido(s) exitosamente`)
      handleClose()
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error('Error al subir los archivos')
    } finally {
      setUploading(false)
      setUploadProgress({})
    }
  }

  const handleClose = () => {
    if (!uploading) {
      // Clean up object URLs
      files.forEach(file => URL.revokeObjectURL(file.preview))
      setFiles([])
      setUploadProgress({})
      reset()
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Subir Recursos"
      size="lg"
      closeOnOverlayClick={!uploading}
      showCloseButton={!uploading}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        {/* File Drop Zone */}
        <div className="mb-6">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary-400 bg-primary-50'
                : 'border-secondary-300 hover:border-primary-400 hover:bg-secondary-50',
              uploading && 'pointer-events-none opacity-50'
            )}
          >
            <input {...getInputProps()} />
            <HiUpload className="mx-auto h-12 w-12 text-secondary-400 mb-4" />
            {isDragActive ? (
              <p className="text-primary-600 font-medium">
                Suelta los archivos aquí...
              </p>
            ) : (
              <div>
                <p className="text-secondary-600 font-medium mb-2">
                  Arrastra y suelta tus imágenes aquí, o haz clic para
                  seleccionar
                </p>
                <p className="text-sm text-secondary-500">
                  Formatos soportados: JPEG, PNG, WebP, GIF (máximo 10MB por
                  archivo)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* File Preview */}
        {files.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-secondary-900 mb-3">
              Archivos seleccionados ({files.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {files.map(file => (
                <div
                  key={file.id}
                  className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-lg"
                >
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-secondary-500">
                      {formatFileSize(file.size)}
                    </p>

                    {/* Upload progress */}
                    {uploading && uploadProgress[file.id] !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-secondary-600 mb-1">
                          <span>Subiendo...</span>
                          <span>{Math.round(uploadProgress[file.id])}%</span>
                        </div>
                        <div className="w-full bg-secondary-200 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${uploadProgress[file.id] || 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status/Remove button */}
                  <div className="flex-shrink-0">
                    {uploading ? (
                      uploadProgress[file.id] === 100 ? (
                        <HiCheck className="w-5 h-5 text-success-500" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="p-1 text-secondary-400 hover:text-error-500 hover:bg-error-50 rounded-full transition-colors"
                        aria-label="Eliminar archivo"
                      >
                        <HiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resource Name Input */}
        <div className="mb-6">
          <Input
            label="Nombre del recurso"
            placeholder={
              files.length > 1
                ? 'Nombre base (se numerarán automáticamente)'
                : 'Nombre del recurso'
            }
            error={errors.name?.message}
            disabled={uploading}
            {...register('name')}
          />
          {files.length > 1 && (
            <p className="text-xs text-secondary-500 mt-1">
              Los archivos se nombrarán como: "{watch('name')} 1", "
              {watch('name')} 2", etc.
            </p>
          )}
        </div>

        {/* Error Messages */}
        {errors.files && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg flex items-center space-x-2">
            <HiExclamationCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
            <p className="text-sm text-error-700">{errors.files.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
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
            disabled={files.length === 0}
          >
            {uploading ? 'Subiendo...' : `Subir ${files.length} archivo(s)`}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
