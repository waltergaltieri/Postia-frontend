'use client'

import React, { useState } from 'react'
import { Button } from '@/components/common'
import { HiFilter, HiX, HiChevronDown } from 'react-icons/hi'

interface CalendarFiltersProps {
  onFiltersChange: (filters: CalendarFilterOptions) => void
  currentFilters: CalendarFilterOptions
}

export interface CalendarFilterOptions {
  socialNetworks?: string[]
  generationStatus?: string[]
  campaignGenerationStatus?: string[]
  status?: string[]
  campaignId?: string
}

export function CalendarFilters({ onFiltersChange, currentFilters }: CalendarFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<CalendarFilterOptions>(currentFilters)

  const socialNetworks = [
    { value: 'instagram', label: 'Instagram', icon: '📷', color: 'text-purple-600' },
    { value: 'facebook', label: 'Facebook', icon: '📘', color: 'text-blue-600' },
    { value: 'linkedin', label: 'LinkedIn', icon: '💼', color: 'text-blue-700' },
    { value: 'twitter', label: 'Twitter', icon: '🐦', color: 'text-sky-500' },
  ]

  const generationStatuses = [
    { value: 'pending', label: 'Pendiente', icon: '⏳', color: 'text-yellow-600' },
    { value: 'generating', label: 'Generando', icon: '🔄', color: 'text-blue-600' },
    { value: 'completed', label: 'Generado', icon: '✅', color: 'text-green-600' },
    { value: 'failed', label: 'Error', icon: '❌', color: 'text-red-600' },
  ]

  const publicationStatuses = [
    { value: 'scheduled', label: 'Programada', color: 'text-blue-600' },
    { value: 'published', label: 'Publicada', color: 'text-green-600' },
    { value: 'failed', label: 'Fallida', color: 'text-red-600' },
    { value: 'cancelled', label: 'Cancelada', color: 'text-gray-600' },
  ]

  const campaignGenerationStatuses = [
    { value: 'planning', label: 'Planificando', color: 'text-yellow-600' },
    { value: 'generating', label: 'Generando', color: 'text-blue-600' },
    { value: 'completed', label: 'Completada', color: 'text-green-600' },
    { value: 'failed', label: 'Fallida', color: 'text-red-600' },
  ]

  const handleFilterChange = (filterType: keyof CalendarFilterOptions, value: string) => {
    const currentValues = localFilters[filterType] as string[] || []
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]

    const newFilters = {
      ...localFilters,
      [filterType]: newValues.length > 0 ? newValues : undefined
    }

    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const clearFilters = () => {
    const emptyFilters: CalendarFilterOptions = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
    setIsOpen(false)
  }

  const hasActiveFilters = Object.values(currentFilters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : Boolean(filter)
  )

  const activeFilterCount = Object.values(currentFilters).reduce((count, filter) => {
    if (Array.isArray(filter)) return count + filter.length
    if (filter) return count + 1
    return count
  }, 0)

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant={hasActiveFilters ? "primary" : "secondary"}
        size="sm"
        icon={<HiFilter className="h-4 w-4" />}
        className="relative"
      >
        Filtros
        {activeFilterCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
        <HiChevronDown className={`h-4 w-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Filter Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-secondary-200 z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-secondary-900">Filtros</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  <HiX className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Social Networks */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-3">Redes Sociales</h4>
                  <div className="space-y-2">
                    {socialNetworks.map(network => (
                      <label key={network.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localFilters.socialNetworks?.includes(network.value) || false}
                          onChange={() => handleFilterChange('socialNetworks', network.value)}
                          className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-3 flex items-center gap-2">
                          <span>{network.icon}</span>
                          <span className={`text-sm ${network.color}`}>{network.label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Generation Status */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-3">Estado de Generación IA</h4>
                  <div className="space-y-2">
                    {generationStatuses.map(status => (
                      <label key={status.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localFilters.generationStatus?.includes(status.value) || false}
                          onChange={() => handleFilterChange('generationStatus', status.value)}
                          className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-3 flex items-center gap-2">
                          <span>{status.icon}</span>
                          <span className={`text-sm ${status.color}`}>{status.label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Publication Status */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-3">Estado de Publicación</h4>
                  <div className="space-y-2">
                    {publicationStatuses.map(status => (
                      <label key={status.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localFilters.status?.includes(status.value) || false}
                          onChange={() => handleFilterChange('status', status.value)}
                          className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-3">
                          <span className={`text-sm ${status.color}`}>{status.label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Campaign Generation Status */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-3">Estado de Campaña</h4>
                  <div className="space-y-2">
                    {campaignGenerationStatuses.map(status => (
                      <label key={status.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localFilters.campaignGenerationStatus?.includes(status.value) || false}
                          onChange={() => handleFilterChange('campaignGenerationStatus', status.value)}
                          className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-3">
                          <span className={`text-sm ${status.color}`}>{status.label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-secondary-200">
                <Button
                  onClick={applyFilters}
                  variant="primary"
                  size="sm"
                  className="flex-1"
                >
                  Aplicar Filtros
                </Button>
                <Button
                  onClick={clearFilters}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}