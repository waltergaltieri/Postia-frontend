'use client'

import React, { useState, useEffect } from 'react'
import { useResources } from '@/hooks/useResources'
import { Resource } from '@/types'
import { FaImage, FaVideo, FaSearch, FaCheck } from 'react-icons/fa'

interface ResourceSelectorProps {
  workspaceId: string
  selectedResources: string[]
  onChange: (resourceIds: string[]) => void
  error?: string
}

export function ResourceSelector({
  workspaceId,
  selectedResources,
  onChange,
  error,
}: ResourceSelectorProps) {
  const {
    resources,
    isLoading,
    handleSearch,
    handleFilterChange,
    searchTerm,
    filterType,
  } = useResources(workspaceId)

  const [localSearchTerm, setLocalSearchTerm] = useState('')

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(localSearchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [localSearchTerm, handleSearch])

  const handleResourceToggle = (resourceId: string) => {
    const isSelected = selectedResources.includes(resourceId)
    if (isSelected) {
      onChange(selectedResources.filter(id => id !== resourceId))
    } else {
      onChange([...selectedResources, resourceId])
    }
  }

  const handleSelectAll = () => {
    const allResourceIds = resources.map(resource => resource.id)
    onChange(allResourceIds)
  }

  const handleClearAll = () => {
    onChange([])
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getResourcePreview = (resource: Resource) => {
    if (resource.type === 'image') {
      return (
        <img
          src={resource.url}
          alt={resource.name}
          className="w-full h-32 object-cover rounded-lg"
        />
      )
    } else {
      return (
        <div className="w-full h-32 bg-secondary-100 rounded-lg flex items-center justify-center">
          <FaVideo className="w-8 h-8 text-secondary-400" />
        </div>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-secondary-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-32 bg-secondary-200 rounded-lg"></div>
                <div className="h-4 bg-secondary-200 rounded"></div>
                <div className="h-3 bg-secondary-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar recursos..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('image')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              filterType === 'image'
                ? 'bg-primary-600 text-white'
                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
            }`}
          >
            <FaImage className="w-4 h-4" />
            Imágenes
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('video')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              filterType === 'video'
                ? 'bg-primary-600 text-white'
                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
            }`}
          >
            <FaVideo className="w-4 h-4" />
            Videos
          </button>
        </div>
      </div>

      {/* Selection Controls */}
      {resources.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-secondary-600">
            {selectedResources.length} de {resources.length} recursos seleccionados
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm px-3 py-1 text-primary-600 hover:text-primary-700 transition-colors"
            >
              Seleccionar todos
            </button>
            {selectedResources.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-sm px-3 py-1 text-secondary-600 hover:text-secondary-700 transition-colors"
              >
                Limpiar selección
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resources Grid */}
      {resources.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaImage className="w-8 h-8 text-secondary-400" />
          </div>
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            No hay recursos disponibles
          </h3>
          <p className="text-secondary-600 mb-4">
            {searchTerm || filterType !== 'all'
              ? 'No se encontraron recursos con los filtros aplicados.'
              : 'Sube algunos recursos para comenzar a crear contenido.'}
          </p>
          {(searchTerm || filterType !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setLocalSearchTerm('')
                handleFilterChange('all')
              }}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {resources.map((resource) => {
            const isSelected = selectedResources.includes(resource.id)
            
            return (
              <div
                key={resource.id}
                onClick={() => handleResourceToggle(resource.id)}
                className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
              >
                {/* Selection Indicator */}
                <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border-2 border-secondary-300'
                }`}>
                  {isSelected && <FaCheck className="w-3 h-3" />}
                </div>

                {/* Resource Preview */}
                <div className="p-3">
                  {getResourcePreview(resource)}
                  
                  <div className="mt-3 space-y-1">
                    <h4 className="font-medium text-secondary-900 text-sm truncate">
                      {resource.name}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-secondary-500">
                      <span className="flex items-center gap-1">
                        {resource.type === 'image' ? (
                          <FaImage className="w-3 h-3" />
                        ) : (
                          <FaVideo className="w-3 h-3" />
                        )}
                        {resource.type}
                      </span>
                      <span>{formatFileSize(resource.size)}</span>
                    </div>
                    {/* Dimensions would be available if added to Resource type */}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}

      {/* Selected Resources Preview */}
      {selectedResources.length > 0 && (
        <div className="mt-6 p-4 bg-secondary-50 rounded-lg">
          <h4 className="font-medium text-secondary-900 mb-3">
            Recursos seleccionados ({selectedResources.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedResources.map((resourceId) => {
              const resource = resources.find(r => r.id === resourceId)
              if (!resource) return null
              
              return (
                <div
                  key={resourceId}
                  className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-secondary-200"
                >
                  {resource.type === 'image' ? (
                    <FaImage className="w-4 h-4 text-secondary-500" />
                  ) : (
                    <FaVideo className="w-4 h-4 text-secondary-500" />
                  )}
                  <span className="text-sm text-secondary-700 truncate max-w-32">
                    {resource.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleResourceToggle(resourceId)
                    }}
                    className="text-secondary-400 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}