'use client'

import React, { useState } from 'react'
import { Resource } from '@/types'
import { ResourceCard } from './ResourceCard'
import { ImageUploaderModal } from './ImageUploaderModal'
import { Button } from '@/components/common/Button'
import { cn } from '@/utils'
import { HiPlus, HiSearch, HiFilter } from 'react-icons/hi'
import toast from 'react-hot-toast'

interface ResourceGalleryProps {
  resources: Resource[]
  onResourceEdit: (id: string) => void
  onResourceDelete: (id: string) => void
  onResourceUpload: (files: { name: string; file: File }[]) => Promise<void>
  workspaceId: string
  selectable?: boolean
  selectedResources?: string[]
  onResourceSelect?: (id: string) => void
  loading?: boolean
  searchTerm?: string
  filterType?: 'all' | 'image' | 'video'
  onSearchChange?: (term: string) => void
  onFilterChange?: (type: 'all' | 'image' | 'video') => void
}

export function ResourceGallery({
  resources,
  onResourceEdit,
  onResourceDelete,
  onResourceUpload,
  workspaceId,
  selectable = false,
  selectedResources = [],
  onResourceSelect,
  loading = false,
  searchTerm = '',
  filterType = 'all',
  onSearchChange,
  onFilterChange,
}: ResourceGalleryProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // Use props for search and filter, fallback to local state if not provided
  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const [localFilterType, setLocalFilterType] = useState<
    'all' | 'image' | 'video'
  >('all')

  const currentSearchTerm = onSearchChange ? searchTerm : localSearchTerm
  const currentFilterType = onFilterChange ? filterType : localFilterType

  const handleSearchChange = (term: string) => {
    if (onSearchChange) {
      onSearchChange(term)
    } else {
      setLocalSearchTerm(term)
    }
  }

  const handleFilterChange = (type: 'all' | 'image' | 'video') => {
    if (onFilterChange) {
      onFilterChange(type)
    } else {
      setLocalFilterType(type)
    }
  }

  // Filter resources based on search and type (only if not using store)
  const filteredResources =
    onSearchChange && onFilterChange
      ? resources
      : resources.filter(resource => {
          const matchesSearch = resource.name
            .toLowerCase()
            .includes(currentSearchTerm.toLowerCase())
          const matchesType =
            currentFilterType === 'all' || resource.type === currentFilterType
          return matchesSearch && matchesType
        })

  const handleUpload = async (files: { name: string; file: File }[]) => {
    try {
      await onResourceUpload(files)
      setIsUploadModalOpen(false)
    } catch (error) {
      console.error('Error uploading resources:', error)
      throw error // Re-throw to let the modal handle the error display
    }
  }

  const handleResourceDelete = (id: string) => {
    const resource = resources.find(r => r.id === id)
    if (
      resource &&
      window.confirm(
        `¿Estás seguro de que quieres eliminar "${resource.name}"?`
      )
    ) {
      onResourceDelete(id)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-secondary-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-secondary-200 rounded animate-pulse" />
        </div>

        {/* Filters skeleton */}
        <div className="flex items-center space-x-4">
          <div className="h-10 w-64 bg-secondary-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-secondary-200 rounded animate-pulse" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="aspect-square bg-secondary-200 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-secondary-200 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-secondary-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Recursos</h2>
          <p className="text-secondary-600 mt-1">
            Gestiona las imágenes y videos para tus campañas
          </p>
        </div>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          icon={<HiPlus className="w-4 h-4" />}
        >
          Subir Recursos
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar recursos..."
            value={currentSearchTerm}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center space-x-2">
          <HiFilter className="text-secondary-400 w-5 h-5" />
          <select
            value={currentFilterType}
            onChange={e =>
              handleFilterChange(e.target.value as 'all' | 'image' | 'video')
            }
            className="border border-secondary-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            aria-label="Filtrar por tipo de recurso"
          >
            <option value="all">Todos los tipos</option>
            <option value="image">Imágenes</option>
            <option value="video">Videos</option>
          </select>
        </div>
      </div>

      {/* Resource count */}
      <div className="flex items-center justify-between text-sm text-secondary-600">
        <span>
          {filteredResources.length} de {resources.length} recursos
          {currentSearchTerm && ` (filtrado por "${currentSearchTerm}")`}
        </span>
        {selectable && selectedResources.length > 0 && (
          <span className="font-medium text-primary-600">
            {selectedResources.length} seleccionado(s)
          </span>
        )}
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-12">
          {resources.length === 0 ? (
            <div>
              <HiPlus className="mx-auto h-12 w-12 text-secondary-400 mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">
                No hay recursos
              </h3>
              <p className="text-secondary-600 mb-6">
                Comienza subiendo tus primeras imágenes y videos
              </p>
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                icon={<HiPlus className="w-4 h-4" />}
              >
                Subir Primer Recurso
              </Button>
            </div>
          ) : (
            <div>
              <HiSearch className="mx-auto h-12 w-12 text-secondary-400 mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">
                No se encontraron recursos
              </h3>
              <p className="text-secondary-600">
                Intenta con otros términos de búsqueda o filtros
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredResources.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onEdit={onResourceEdit}
              onDelete={handleResourceDelete}
              selectable={selectable}
              selected={selectedResources.includes(resource.id)}
              onSelect={onResourceSelect}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <ImageUploaderModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        workspaceId={workspaceId}
      />
    </div>
  )
}
