'use client'

import React, { useState } from 'react'
import { useGetResourcesQuery } from '@/store/api/resourcesApi'
import { useGetTemplatesQuery } from '@/store/api/templatesApi'
import { ResourceCard } from '@/components/resources/ResourceCard'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { cn } from '@/utils'
import {
  HiSearch,
  HiPhotograph,
  HiVideoCamera,
  HiViewGrid,
  HiExclamationCircle,
} from 'react-icons/hi'

interface ResourceSelectionStepProps {
  workspaceId: string
  initialData: {
    resources: string[]
    templates: string[]
  }
  onNext: (data: { resources: string[]; templates: string[] }) => void
  onBack: () => void
}

type ResourceFilter = 'all' | 'image' | 'video'
type TemplateFilter = 'all' | 'single' | 'carousel'

export function ResourceSelectionStep({
  workspaceId,
  initialData,
  onNext,
  onBack,
}: ResourceSelectionStepProps) {
  // State for selections
  const [selectedResources, setSelectedResources] = useState<string[]>(
    initialData.resources
  )
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(
    initialData.templates
  )

  // State for filters and search
  const [resourceSearch, setResourceSearch] = useState('')
  const [templateSearch, setTemplateSearch] = useState('')
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all')
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('all')

  // Fetch data
  const {
    data: resourcesData,
    isLoading: isLoadingResources,
    error: resourcesError,
  } = useGetResourcesQuery({
    workspaceId,
    search: resourceSearch || undefined,
    type: resourceFilter !== 'all' ? resourceFilter : undefined,
  })

  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useGetTemplatesQuery({
    workspaceId,
    search: templateSearch || undefined,
    type: templateFilter !== 'all' ? templateFilter : undefined,
  })

  const resources = resourcesData?.data || []
  const templates = templatesData?.data || []

  // Validation
  const isValid = selectedResources.length > 0 && selectedTemplates.length > 0

  // Handlers
  const handleResourceSelect = (resourceId: string) => {
    setSelectedResources(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    )
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    )
  }

  const handleNext = () => {
    if (isValid) {
      onNext({
        resources: selectedResources,
        templates: selectedTemplates,
      })
    }
  }

  const handleSelectAllResources = () => {
    if (selectedResources.length === resources.length) {
      setSelectedResources([])
    } else {
      setSelectedResources(resources.map(r => r.id))
    }
  }

  const handleSelectAllTemplates = () => {
    if (selectedTemplates.length === templates.length) {
      setSelectedTemplates([])
    } else {
      setSelectedTemplates(templates.map(t => t.id))
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-secondary-900 mb-2">
          Selecciona Recursos y Templates
        </h2>
        <p className="text-secondary-600">
          Elige los recursos gráficos y templates que se utilizarán para generar
          el contenido de tu campaña.
        </p>
      </div>

      {/* Resources Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-secondary-900 flex items-center gap-2">
            <HiPhotograph className="w-5 h-5 text-primary-600" />
            Recursos Gráficos
            {selectedResources.length > 0 && (
              <span className="bg-primary-100 text-primary-700 text-sm px-2 py-1 rounded-full">
                {selectedResources.length} seleccionado
                {selectedResources.length !== 1 ? 's' : ''}
              </span>
            )}
          </h3>
          {resources.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllResources}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {selectedResources.length === resources.length
                ? 'Deseleccionar todo'
                : 'Seleccionar todo'}
            </button>
          )}
        </div>

        {/* Resource filters and search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Buscar recursos..."
              value={resourceSearch}
              onChange={e => setResourceSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setResourceFilter('all')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                resourceFilter === 'all'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              )}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setResourceFilter('image')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1',
                resourceFilter === 'image'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              )}
            >
              <HiPhotograph className="w-4 h-4" />
              Imágenes
            </button>
            <button
              type="button"
              onClick={() => setResourceFilter('video')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1',
                resourceFilter === 'video'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              )}
            >
              <HiVideoCamera className="w-4 h-4" />
              Videos
            </button>
          </div>
        </div>

        {/* Resources grid */}
        {isLoadingResources ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-secondary-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : resourcesError ? (
          <div className="text-center py-8">
            <HiExclamationCircle className="w-12 h-12 text-error-400 mx-auto mb-4" />
            <p className="text-secondary-600">Error al cargar los recursos</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8">
            <HiPhotograph className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600">
              {resourceSearch || resourceFilter !== 'all'
                ? 'No se encontraron recursos con los filtros aplicados'
                : 'No hay recursos disponibles'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {resources.map(resource => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                selectable
                selected={selectedResources.includes(resource.id)}
                onSelect={handleResourceSelect}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-secondary-900 flex items-center gap-2">
            <HiViewGrid className="w-5 h-5 text-primary-600" />
            Templates de Diseño
            {selectedTemplates.length > 0 && (
              <span className="bg-primary-100 text-primary-700 text-sm px-2 py-1 rounded-full">
                {selectedTemplates.length} seleccionado
                {selectedTemplates.length !== 1 ? 's' : ''}
              </span>
            )}
          </h3>
          {templates.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllTemplates}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {selectedTemplates.length === templates.length
                ? 'Deseleccionar todo'
                : 'Seleccionar todo'}
            </button>
          )}
        </div>

        {/* Template filters and search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Buscar templates..."
              value={templateSearch}
              onChange={e => setTemplateSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTemplateFilter('all')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                templateFilter === 'all'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              )}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setTemplateFilter('single')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1',
                templateFilter === 'single'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              )}
            >
              <HiPhotograph className="w-4 h-4" />
              Imagen Única
            </button>
            <button
              type="button"
              onClick={() => setTemplateFilter('carousel')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1',
                templateFilter === 'carousel'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              )}
            >
              <HiViewGrid className="w-4 h-4" />
              Carrusel
            </button>
          </div>
        </div>

        {/* Templates grid */}
        {isLoadingTemplates ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-secondary-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : templatesError ? (
          <div className="text-center py-8">
            <HiExclamationCircle className="w-12 h-12 text-error-400 mx-auto mb-4" />
            <p className="text-secondary-600">Error al cargar los templates</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8">
            <HiViewGrid className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600">
              {templateSearch || templateFilter !== 'all'
                ? 'No se encontraron templates con los filtros aplicados'
                : 'No hay templates disponibles'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                selectable
                selected={selectedTemplates.includes(template.id)}
                onSelect={handleTemplateSelect}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Validation message */}
      {!isValid &&
        (selectedResources.length > 0 || selectedTemplates.length > 0) && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HiExclamationCircle className="w-5 h-5 text-warning-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-warning-800">
                  Selección incompleta
                </h4>
                <p className="text-sm text-warning-700 mt-1">
                  {selectedResources.length === 0 &&
                  selectedTemplates.length === 0
                    ? 'Debes seleccionar al menos un recurso y un template para continuar.'
                    : selectedResources.length === 0
                      ? 'Debes seleccionar al menos un recurso para continuar.'
                      : 'Debes seleccionar al menos un template para continuar.'}
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Action buttons */}
      <div className="flex justify-between pt-6 border-t border-secondary-200">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isValid}
          className={cn(
            'px-6 py-2 text-sm font-medium rounded-lg transition-colors',
            isValid
              ? 'text-white bg-primary-600 hover:bg-primary-700'
              : 'text-secondary-400 bg-secondary-100 cursor-not-allowed'
          )}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
