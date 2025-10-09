'use client'

import React, { useState, useEffect } from 'react'
import { useTemplates } from '@/hooks/useTemplates'
import { Template, SocialNetwork } from '@/types'
import { FaSearch, FaCheck, FaImages, FaImage } from 'react-icons/fa'
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin } from 'react-icons/fa'

interface TemplateSelectorProps {
  workspaceId: string
  selectedTemplates: string[]
  onChange: (templateIds: string[]) => void
  error?: string
}

const socialNetworkIcons: Record<SocialNetwork, React.ComponentType<any>> = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  twitter: FaTwitter,
  linkedin: FaLinkedin,
}

export function TemplateSelector({
  workspaceId,
  selectedTemplates,
  onChange,
  error,
}: TemplateSelectorProps) {
  const {
    templates,
    isLoading,
    handleSearchChange,
    handleFilterChange,
    searchTerm,
    filterType,
  } = useTemplates(workspaceId)

  const [localSearchTerm, setLocalSearchTerm] = useState('')

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearchChange(localSearchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [localSearchTerm, handleSearchChange])

  const handleTemplateToggle = (templateId: string) => {
    const isSelected = selectedTemplates.includes(templateId)
    if (isSelected) {
      onChange(selectedTemplates.filter(id => id !== templateId))
    } else {
      onChange([...selectedTemplates, templateId])
    }
  }

  const handleSelectAll = () => {
    const allTemplateIds = templates.map(template => template.id)
    onChange(allTemplateIds)
  }

  const handleClearAll = () => {
    onChange([])
  }

  const getTemplatePreview = (template: Template) => {
    const firstImage = template.images[0]
    
    if (firstImage) {
      return (
        <div className="relative">
          <img
            src={firstImage}
            alt={template.name}
            className="w-full h-32 object-cover rounded-lg"
          />
          {template.type === 'carousel' && template.images.length > 1 && (
            <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <FaImages className="w-3 h-3" />
              {template.images.length}
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div className="w-full h-32 bg-secondary-100 rounded-lg flex items-center justify-center">
          <FaImage className="w-8 h-8 text-secondary-400" />
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
            {[...Array(6)].map((_, i) => (
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
            placeholder="Buscar templates..."
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
            onClick={() => handleFilterChange('single')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              filterType === 'single'
                ? 'bg-primary-600 text-white'
                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
            }`}
          >
            <FaImage className="w-4 h-4" />
            Simple
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('carousel')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              filterType === 'carousel'
                ? 'bg-primary-600 text-white'
                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
            }`}
          >
            <FaImages className="w-4 h-4" />
            Carrusel
          </button>
        </div>
      </div>

      {/* Selection Controls */}
      {templates.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-secondary-600">
            {selectedTemplates.length} de {templates.length} templates seleccionados
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm px-3 py-1 text-primary-600 hover:text-primary-700 transition-colors"
            >
              Seleccionar todos
            </button>
            {selectedTemplates.length > 0 && (
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

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaImage className="w-8 h-8 text-secondary-400" />
          </div>
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            No hay templates disponibles
          </h3>
          <p className="text-secondary-600 mb-4">
            {searchTerm || filterType !== 'all'
              ? 'No se encontraron templates con los filtros aplicados.'
              : 'Los templates son opcionales. Puedes crear contenido sin ellos o subir algunos templates para diseños más elaborados.'}
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
          {templates.map((template) => {
            const isSelected = selectedTemplates.includes(template.id)
            
            return (
              <div
                key={template.id}
                onClick={() => handleTemplateToggle(template.id)}
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

                {/* Template Preview */}
                <div className="p-3">
                  {getTemplatePreview(template)}
                  
                  <div className="mt-3 space-y-2">
                    <h4 className="font-medium text-secondary-900 text-sm truncate">
                      {template.name}
                    </h4>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        template.type === 'single'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {template.type === 'single' ? 'Simple' : 'Carrusel'}
                      </span>
                      
                      {template.type === 'carousel' && (
                        <span className="text-xs text-secondary-500">
                          {template.images.length} imágenes
                        </span>
                      )}
                    </div>

                    {/* Social Networks */}
                    <div className="flex items-center gap-1">
                      {template.socialNetworks.map((network) => {
                        const Icon = socialNetworkIcons[network]
                        return (
                          <Icon
                            key={network}
                            className="w-4 h-4 text-secondary-500"
                            title={network}
                          />
                        )
                      })}
                    </div>
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

      {/* Selected Templates Preview */}
      {selectedTemplates.length > 0 && (
        <div className="mt-6 p-4 bg-secondary-50 rounded-lg">
          <h4 className="font-medium text-secondary-900 mb-3">
            Templates seleccionados ({selectedTemplates.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedTemplates.map((templateId) => {
              const template = templates.find(t => t.id === templateId)
              if (!template) return null
              
              return (
                <div
                  key={templateId}
                  className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-secondary-200"
                >
                  {template.type === 'single' ? (
                    <FaImage className="w-4 h-4 text-secondary-500" />
                  ) : (
                    <FaImages className="w-4 h-4 text-secondary-500" />
                  )}
                  <span className="text-sm text-secondary-700 truncate max-w-32">
                    {template.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTemplateToggle(templateId)
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

      {/* Info Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Sobre los templates</p>
            <p>
              Los templates son opcionales y se usan para crear diseños más elaborados con texto incorporado en las imágenes. 
              Si no seleccionas ningún template, la IA generará contenido simple con texto e imágenes separadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}