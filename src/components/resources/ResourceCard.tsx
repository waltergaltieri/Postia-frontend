'use client'

import React, { useState } from 'react'
import { Resource } from '@/types'
import { cn } from '@/utils'
import {
  HiDotsVertical,
  HiPencil,
  HiTrash,
  HiCheck,
  HiPhotograph,
  HiVideoCamera,
} from 'react-icons/hi'

interface ResourceCardProps {
  resource: Resource
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  selectable?: boolean
  selected?: boolean
  onSelect?: (id: string) => void
}

export function ResourceCard({
  resource,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onSelect,
}: ResourceCardProps) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowContextMenu(!showContextMenu)
  }

  const handleEdit = () => {
    onEdit(resource.id)
    setShowContextMenu(false)
  }

  const handleDelete = () => {
    onDelete(resource.id)
    setShowContextMenu(false)
  }

  const handleSelect = () => {
    if (selectable && onSelect) {
      onSelect(resource.id)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date))
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
        <div className="absolute top-2 left-2 z-10">
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
            aria-label="Opciones del recurso"
          >
            <HiDotsVertical className="w-4 h-4" />
          </button>

          {/* Context menu */}
          {showContextMenu && (
            <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-secondary-200 py-1 z-20">
              <button
                type="button"
                onClick={e => {
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
                onClick={e => {
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

      {/* Resource preview */}
      <div className="aspect-square bg-secondary-100 relative overflow-hidden">
        {resource.type === 'image' ? (
          imageError ? (
            <div className="w-full h-full flex items-center justify-center">
              <HiPhotograph className="w-12 h-12 text-secondary-400" />
            </div>
          ) : (
            <img
              src={resource.url}
              alt={resource.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <HiVideoCamera className="w-12 h-12 text-secondary-400" />
          </div>
        )}
      </div>

      {/* Resource info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-secondary-900 truncate mb-1">
          {resource.name}
        </h3>
        <div className="flex items-center justify-between text-xs text-secondary-500">
          <span className="capitalize">{resource.type}</span>
          <span>{formatFileSize(resource.size)}</span>
        </div>
        <div className="text-xs text-secondary-400 mt-1">
          {formatDate(resource.createdAt)}
        </div>
      </div>

      {/* Click outside handler for context menu */}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowContextMenu(false)}
        />
      )}
    </div>
  )
}
