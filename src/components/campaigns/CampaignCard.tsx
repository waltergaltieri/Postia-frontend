'use client'

import React, { useState } from 'react'
import { Campaign, SocialNetwork } from '@/types'
import { Button } from '@/components/common'
import { cn } from '@/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  HiEye,
  HiPencil,
  HiDuplicate,
  HiTrash,
  HiDotsVertical,
  HiPlay,
  HiPause,
  HiStop,
  HiCalendar,
  HiUsers,
  HiClock,
} from 'react-icons/hi'

interface CampaignCardProps {
  campaign: Campaign
  onView: (campaign: Campaign) => void
  onEdit: (campaign: Campaign) => void
  onDuplicate: (campaign: Campaign) => void
  onDelete: (campaign: Campaign) => void
  onStatusChange?: (campaign: Campaign, newStatus: Campaign['status']) => void
}

const statusConfig = {
  draft: {
    label: 'Borrador',
    color: 'bg-secondary-100 text-secondary-700 border border-secondary-200',
    icon: HiPencil,
  },
  active: {
    label: 'Activa',
    color: 'bg-green-100 text-green-700 border border-green-200',
    icon: HiPlay,
  },
  paused: {
    label: 'Pausada',
    color: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    icon: HiPause,
  },
  completed: {
    label: 'Completada',
    color: 'bg-primary-100 text-primary-700 border border-primary-200',
    icon: HiStop,
  },
}

const socialNetworkIcons = {
  facebook: '📘',
  instagram: '📷',
  twitter: '🐦',
  linkedin: '💼',
}

export function CampaignCard({
  campaign,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}: CampaignCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const statusInfo = statusConfig[campaign.status]
  const StatusIcon = statusInfo.icon

  const handleStatusChange = async (newStatus: Campaign['status']) => {
    if (onStatusChange && newStatus !== campaign.status) {
      setIsLoading(true)
      try {
        await onStatusChange(campaign, newStatus)
      } finally {
        setIsLoading(false)
      }
    }
    setShowActions(false)
  }

  const formatDateRange = () => {
    const start = format(new Date(campaign.startDate), 'dd MMM', { locale: es })
    const end = format(new Date(campaign.endDate), 'dd MMM yyyy', {
      locale: es,
    })
    return `${start} - ${end}`
  }

  const getPublicationCount = () => {
    return campaign.publications?.length || 0
  }

  const getScheduledCount = () => {
    return (
      campaign.publications?.filter(p => p.status === 'scheduled').length || 0
    )
  }

  return (
    <div className="bg-white rounded-lg border border-secondary-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-secondary-900 truncate">
              {campaign.name}
            </h3>
            <p className="mt-1 text-sm text-secondary-600 line-clamp-2">
              {campaign.objective}
            </p>
          </div>

          {/* Status badge */}
          <div className="ml-4 flex items-center">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                statusInfo.color
              )}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Campaign info */}
        <div className="mt-4 flex items-center gap-4 text-sm text-secondary-500">
          <div className="flex items-center">
            <HiCalendar className="w-4 h-4 mr-1" />
            {formatDateRange()}
          </div>
          <div className="flex items-center">
            <HiClock className="w-4 h-4 mr-1" />
            Cada {campaign.interval}h
          </div>
          <div className="flex items-center">
            <HiUsers className="w-4 h-4 mr-1" />
            {getPublicationCount()} publicaciones
          </div>
        </div>

        {/* Social networks */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-secondary-500">Redes:</span>
          <div className="flex gap-1">
            {campaign.socialNetworks.map(network => (
              <span
                key={network}
                className="text-lg"
                title={network.charAt(0).toUpperCase() + network.slice(1)}
              >
                {socialNetworkIcons[network]}
              </span>
            ))}
          </div>
          {campaign.contentType === 'optimized' && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
              Optimizado
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(campaign)}
              icon={<HiEye className="w-4 h-4" />}
            >
              Ver
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(campaign)}
              icon={<HiPencil className="w-4 h-4" />}
            >
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(campaign)}
              icon={<HiDuplicate className="w-4 h-4" />}
            >
              Duplicar
            </Button>
          </div>

          {/* More actions dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              icon={<HiDotsVertical className="w-4 h-4" />}
              loading={isLoading}
            >
              Más
            </Button>

            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-secondary-200 py-1 z-10">
                {/* Status change options */}
                {campaign.status !== 'active' && (
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                  >
                    <HiPlay className="w-4 h-4 mr-3 text-green-500" />
                    Activar
                  </button>
                )}

                {campaign.status === 'active' && (
                  <button
                    onClick={() => handleStatusChange('paused')}
                    className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                  >
                    <HiPause className="w-4 h-4 mr-3 text-yellow-500" />
                    Pausar
                  </button>
                )}

                {(campaign.status === 'active' ||
                  campaign.status === 'paused') && (
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                  >
                    <HiStop className="w-4 h-4 mr-3 text-blue-500" />
                    Completar
                  </button>
                )}

                <div className="border-t border-secondary-100 my-1" />

                <button
                  onClick={() => {
                    onDelete(campaign)
                    setShowActions(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  <HiTrash className="w-4 h-4 mr-3" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress info for active campaigns */}
        {campaign.status === 'active' && getScheduledCount() > 0 && (
          <div className="mt-3 pt-3 border-t border-secondary-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary-600">
                {getScheduledCount()} publicaciones programadas
              </span>
              <span className="text-primary-600 font-medium">En progreso</span>
            </div>
          </div>
        )}
      </div>

      {/* Click outside handler for actions dropdown */}
      {showActions && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  )
}
