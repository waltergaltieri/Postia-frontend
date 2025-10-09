'use client'

import React, { useState } from 'react'
import { Template, SocialNetwork } from '@/types'
import { cn } from '@/utils'
import {
  HiDotsVertical,
  HiPencil,
  HiTrash,
  HiCheck,
  HiPhotograph,
  HiViewGrid,
  HiGlobeAlt,
} from 'react-icons/hi'

interface TemplateCardProps {
  template: Template
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  selectable?: boolean
  selected?: boolean
  onSelect?: (id: string) => void
}

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onSelect,
}: TemplateCardProps) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [imageError, setImageError] = useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Handle clicks outside menu
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false)
      }
    }

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showContextMenu])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowContextMenu(!showContextMenu)
  }

  const handleEdit = () => {
    onEdit(template.id)
    setShowContextMenu(false)
  }

  const handleDelete = () => {
    onDelete(template.id)
    setShowContextMenu(false)
  }

  const handleSelect = () => {
    if (selectable && onSelect) {
      onSelect(template.id)
    }
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date))
  }

  const getSocialNetworkIcon = (network: SocialNetwork) => {
    const iconClass = 'w-3 h-3'
    switch (network) {
      case 'facebook':
        return <div className={cn(iconClass, 'bg-blue-600 rounded')} />
      case 'instagram':
        return (
          <div
            className={cn(
              iconClass,
              'bg-gradient-to-br from-purple-600 to-pink-600 rounded'
            )}
          />
        )
      case 'twitter':
        return <div className={cn(iconClass, 'bg-sky-500 rounded')} />
      case 'linkedin':
        return <div className={cn(iconClass, 'bg-blue-700 rounded')} />
      default:
        return <HiGlobeAlt className={iconClass} />
    }
  }

  const getTypeIcon = () => {
    return template.type === 'single' ? (
      <HiPhotograph className="w-4 h-4" />
    ) : (
      <HiViewGrid className="w-4 h-4" />
    )
  }

  const getTypeLabel = () => {
    return template.type === 'single' ? 'Imagen Única' : 'Carrusel'
  }

  return (
    <div
      className={cn(
        'group relative bg-white rounded-lg border border-secondary-200 overflow-hidden transition-all duration-200 hover:shadow-md',
        selectable && 'cursor-pointer hover:border-primary-300',
        selected && 'ring-2 ring-primary-500 border-primary-500'
      )}
      onClick={handleSelect}
      onContextMenu={handleContextMenu}
    >
      {/* Selection indicator */}
      {selectable && (
        <div className="absolute top-2 left-2 z-20">
          <div
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
              selected
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white border-secondary-300 group-hover:border-primary-400'
            )}
          >
            {selected && <HiCheck className="w-3 h-3 text-white" />}
          </div>
        </div>
      )}

      {/* Template type indicator */}
      {!selectable && (
        <div className="absolute top-2 left-2 z-10">
          <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-secondary-700">
            {getTypeIcon()}
            <span>{getTypeLabel()}</span>
          </div>
        </div>
      )}

      {/* Context menu button */}
      {!selectable && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              setShowContextMenu(!showContextMenu)
            }}
            className="p-1 bg-white rounded-full shadow-sm border border-secondary-200 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50"
            aria-label="Opciones del template"
          >
            <HiDotsVertical className="w-4 h-4" />
          </button>

          {/* Context menu */}
          {showContextMenu && (
            <div 
              ref={menuRef}
              className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-secondary-200 py-1 z-50"
            >
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEdit()
                }}
                className="flex items-center w-full px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
              >
                <HiPencil className="w-4 h-4 mr-2" />
                Editar
              </button>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDelete()
                }}
                className="flex items-center w-full px-3 py-2 text-sm text-error-600 hover:bg-error-50"
              >
                <HiTrash className="w-4 h-4 mr-2" />
                Eliminar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Template preview */}
      <div className="aspect-square bg-secondary-100 relative overflow-hidden">
        {template.images.length > 0 ? (
          template.type === 'single' ? (
            imageError ? (
              <div className="w-full h-full flex items-center justify-center">
                <HiPhotograph className="w-12 h-12 text-secondary-400" />
              </div>
            ) : (
              <img
                src={template.images[0]}
                alt={template.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            )
          ) : (
            // Carousel preview - show grid of images
            <div className="w-full h-full grid grid-cols-2 gap-1 p-1">
              {template.images.slice(0, 4).map((image, index) => (
                <div key={index} className="relative overflow-hidden rounded">
                  <img
                    src={image}
                    alt={`${template.name} - ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                  {index === 3 && template.images.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        +{template.images.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <HiPhotograph className="w-12 h-12 text-secondary-400" />
          </div>
        )}
      </div>

      {/* Template info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-secondary-900 truncate mb-2">
          {template.name}
        </h3>

        {/* Social networks */}
        <div className="flex items-center space-x-1 mb-2">
          {template.socialNetworks.map(network => (
            <div key={network} className="flex items-center">
              {getSocialNetworkIcon(network)}
            </div>
          ))}
          {template.socialNetworks.length === 0 && (
            <span className="text-xs text-secondary-400">
              Sin redes configuradas
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-secondary-500">
          <span>
            {template.images.length} imagen
            {template.images.length !== 1 ? 'es' : ''}
          </span>
          <span>{formatDate(template.createdAt)}</span>
        </div>
      </div>


    </div>
  )
}
