'use client'

import React, { useState } from 'react'
import { Template } from '@/types'
import { TemplateCard } from './TemplateCard'
import { Button } from '@/components/common/Button'
import { cn } from '@/utils'
import {
  HiPlus,
  HiSearch,
  HiFilter,
  HiPhotograph,
  HiViewGrid,
} from 'react-icons/hi'

interface TemplateGalleryProps {
  templates: Template[]
  onTemplateEdit: (id: string) => void
  onTemplateDelete: (id: string) => void
  onTemplateCreate: () => void
  workspaceId: string
  selectable?: boolean
  selectedTemplates?: string[]
  onTemplateSelect?: (id: string) => void
  loading?: boolean
  searchTerm?: string
  filterType?: 'all' | 'single' | 'carousel'
  onSearchChange?: (term: string) => void
  onFilterChange?: (type: 'all' | 'single' | 'carousel') => void
}

export function TemplateGallery({
  templates,
  onTemplateEdit,
  onTemplateDelete,
  onTemplateCreate,
  workspaceId,
  selectable = false,
  selectedTemplates = [],
  onTemplateSelect,
  loading = false,
  searchTerm = '',
  filterType = 'all',
  onSearchChange,
  onFilterChange,
}: TemplateGalleryProps) {
  // Use props for search and filter, fallback to local state if not provided
  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const [localFilterType, setLocalFilterType] = useState<
    'all' | 'single' | 'carousel'
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

  const handleFilterChange = (type: 'all' | 'single' | 'carousel') => {
    if (onFilterChange) {
      onFilterChange(type)
    } else {
      setLocalFilterType(type)
    }
  }

  // Filter templates based on search and type (only if not using store)
  const filteredTemplates =
    onSearchChange && onFilterChange
      ? templates
      : templates.filter(template => {
          const matchesSearch = template.name
            .toLowerCase()
            .includes(currentSearchTerm.toLowerCase())
          const matchesType =
            currentFilterType === 'all' || template.type === currentFilterType
          return matchesSearch && matchesType
        })

  const handleTemplateDelete = (id: string) => {
    const template = templates.find(t => t.id === id)
    if (
      template &&
      window.confirm(
        `¿Estás seguro de que quieres eliminar el template "${template.name}"?`
      )
    ) {
      onTemplateDelete(id)
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
          <h2 className="text-2xl font-bold text-secondary-900">Templates</h2>
          <p className="text-secondary-600 mt-1">
            Gestiona los templates de diseño para tus campañas
          </p>
        </div>
        <Button
          onClick={onTemplateCreate}
          icon={<HiPlus className="w-4 h-4" />}
        >
          Crear Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar templates..."
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
              handleFilterChange(
                e.target.value as 'all' | 'single' | 'carousel'
              )
            }
            className="border border-secondary-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            aria-label="Filtrar por tipo de template"
          >
            <option value="all">Todos los tipos</option>
            <option value="single">Imagen Única</option>
            <option value="carousel">Carrusel</option>
          </select>
        </div>
      </div>

      {/* Template count */}
      <div className="flex items-center justify-between text-sm text-secondary-600">
        <span>
          {filteredTemplates.length} de {templates.length} templates
          {currentSearchTerm && ` (filtrado por "${currentSearchTerm}")`}
        </span>
        {selectable && selectedTemplates.length > 0 && (
          <span className="font-medium text-primary-600">
            {selectedTemplates.length} seleccionado(s)
          </span>
        )}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          {templates.length === 0 ? (
            <div>
              <div className="mx-auto h-12 w-12 text-secondary-400 mb-4 flex items-center justify-center">
                <HiPhotograph className="w-8 h-8" />
                <HiViewGrid className="w-8 h-8 -ml-2" />
              </div>
              <h3 className="text-lg font-medium text-secondary-900 mb-2">
                No hay templates
              </h3>
              <p className="text-secondary-600 mb-6">
                Comienza creando tu primer template de diseño
              </p>
              <Button
                onClick={onTemplateCreate}
                icon={<HiPlus className="w-4 h-4" />}
              >
                Crear Primer Template
              </Button>
            </div>
          ) : (
            <div>
              <HiSearch className="mx-auto h-12 w-12 text-secondary-400 mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">
                No se encontraron templates
              </h3>
              <p className="text-secondary-600">
                Intenta con otros términos de búsqueda o filtros
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={onTemplateEdit}
              onDelete={handleTemplateDelete}
              selectable={selectable}
              selected={selectedTemplates.includes(template.id)}
              onSelect={onTemplateSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
