'use client'

import React, { useState, useMemo } from 'react'
import { Campaign } from '@/types'
import { CampaignCard } from './CampaignCard'
import { Button, Input } from '@/components/common'
import { cn } from '@/utils'
import {
  HiPlus,
  HiSearch,
  HiFilter,
  HiX,
  HiExclamationCircle,
} from 'react-icons/hi'

interface CampaignListProps {
  campaigns: Campaign[]
  loading?: boolean
  onCreateNew: () => void
  onView: (campaign: Campaign) => void
  onEdit: (campaign: Campaign) => void
  onDuplicate: (campaign: Campaign) => void
  onDelete: (campaign: Campaign) => void
  onStatusChange?: (campaign: Campaign, newStatus: Campaign['status']) => void
}

type FilterStatus = 'all' | 'active' | 'completed' | 'draft' | 'paused'

const filterOptions: { value: FilterStatus; label: string; count?: number }[] =
  [
    { value: 'all', label: 'Todas' },
    { value: 'active', label: 'Activas' },
    { value: 'draft', label: 'Borradores' },
    { value: 'paused', label: 'Pausadas' },
    { value: 'completed', label: 'Completadas' },
  ]

export function CampaignList({
  campaigns,
  loading = false,
  onCreateNew,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}: CampaignListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Calculate counts for each status
  const statusCounts = useMemo(() => {
    const counts = campaigns.reduce(
      (acc, campaign) => {
        acc[campaign.status] = (acc[campaign.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      all: campaigns.length,
      ...counts,
    }
  }, [campaigns])

  // Filter campaigns based on search and status
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        campaign =>
          campaign.name.toLowerCase().includes(searchLower) ||
          campaign.objective.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [campaigns, statusFilter, searchTerm])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setShowFilters(false)
  }

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all'

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-secondary-200 rounded animate-pulse" />
          <div className="h-10 w-40 bg-secondary-200 rounded animate-pulse" />
        </div>

        {/* Filters skeleton */}
        <div className="flex gap-4">
          <div className="h-10 w-64 bg-secondary-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-secondary-200 rounded animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 bg-secondary-200 rounded-lg animate-pulse"
            />
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
          <h1 className="text-2xl font-bold text-secondary-900">Campañas</h1>
          <p className="mt-1 text-sm text-secondary-600">
            Gestiona y monitorea tus campañas de contenido automatizado
          </p>
        </div>

        <Button
          onClick={onCreateNew}
          icon={<HiPlus className="w-5 h-5" />}
          className="shrink-0"
        >
          Nueva Campaña
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <Input
              type="text"
              placeholder="Buscar campañas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                title="Limpiar búsqueda"
              >
                <HiX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto">
          {filterOptions.map(option => {
            const count = (statusCounts as any)[option.value] || 0
            const isActive = statusFilter === option.value

            return (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary-100 text-primary-900 border border-primary-200'
                    : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
                )}
              >
                {option.label}
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs',
                    isActive
                      ? 'bg-primary-200 text-primary-800'
                      : 'bg-secondary-100 text-secondary-600'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            icon={<HiX className="w-4 h-4" />}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Results info */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-secondary-600">
          <HiFilter className="w-4 h-4" />
          Mostrando {filteredCampaigns.length} de {campaigns.length} campañas
          {searchTerm && <span>para "{searchTerm}"</span>}
        </div>
      )}

      {/* Campaign grid */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onView={onView}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-12">
          <HiExclamationCircle className="mx-auto h-12 w-12 text-secondary-400" />
          <h3 className="mt-4 text-lg font-medium text-secondary-900">
            {hasActiveFilters
              ? 'No se encontraron campañas'
              : 'No hay campañas'}
          </h3>
          <p className="mt-2 text-sm text-secondary-600 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Intenta ajustar los filtros o términos de búsqueda para encontrar lo que buscas.'
              : 'Comienza creando tu primera campaña de contenido automatizado.'}
          </p>
          {!hasActiveFilters && (
            <div className="mt-6">
              <Button
                onClick={onCreateNew}
                icon={<HiPlus className="w-5 h-5" />}
              >
                Crear Primera Campaña
              </Button>
            </div>
          )}
          {hasActiveFilters && (
            <div className="mt-6">
              <Button
                variant="ghost"
                onClick={clearFilters}
                icon={<HiX className="w-4 h-4" />}
              >
                Limpiar Filtros
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
