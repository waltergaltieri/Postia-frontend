'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import { WorkspaceLayout } from '@/layouts'
import { TemplateGallery } from '@/components/templates/TemplateGallery'
import { TemplateUploadModal } from '@/components/templates/TemplateUploadModal'
import { useTemplates } from '@/hooks/useTemplates'
import { SocialNetwork } from '@/types'
import toast from 'react-hot-toast'

export default function TemplatesPage() {
  const params = useParams()
  const workspaceId = params.id as string

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  const {
    templates,
    selectedTemplates,
    searchTerm,
    filterType,
    isLoading,
    error,
    handleSearchChange,
    handleFilterChange,
    handleTemplateSelect,
    handleCreateTemplate,
    handleUpdateTemplate,
    handleDeleteTemplate,
  } = useTemplates(workspaceId)

  const handleTemplateEdit = async (id: string) => {
    console.log('Edit template:', id)
    // TODO: Implement template editing modal
    toast('Función de edición próximamente', { icon: 'ℹ️' })
  }

  const handleTemplateDeleteConfirm = async (id: string) => {
    try {
      await handleDeleteTemplate(id)
      toast.success('Template eliminado exitosamente')
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Error al eliminar el template')
    }
  }

  const handleTemplateCreate = () => {
    setIsUploadModalOpen(true)
  }

  const handleTemplateUpload = async (data: {
    name: string
    type: 'single' | 'carousel'
    socialNetworks: SocialNetwork[]
    images: { name: string; file: File }[]
  }) => {
    try {
      await handleCreateTemplate(data)
      setIsUploadModalOpen(false)
    } catch (error) {
      console.error('Error creating template:', error)
      throw error // Re-throw to let the modal handle the error display
    }
  }

  if (error) {
    return (
      <WorkspaceLayout workspaceId={workspaceId}>
        <div className="p-8 bg-secondary-50/30 min-h-screen">
          <div className="text-center py-12">
            <div className="text-error-600 mb-4">
              Error al cargar los templates
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-primary-600 hover:text-primary-700 underline"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </WorkspaceLayout>
    )
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId}>
      <div className="p-8 bg-secondary-50/30 min-h-screen">
        <TemplateGallery
          templates={templates}
          onTemplateEdit={handleTemplateEdit}
          onTemplateDelete={handleTemplateDeleteConfirm}
          onTemplateCreate={handleTemplateCreate}
          workspaceId={workspaceId}
          loading={isLoading}
          searchTerm={searchTerm}
          filterType={filterType}
          onSearchChange={handleSearchChange}
          onFilterChange={handleFilterChange}
          selectedTemplates={selectedTemplates}
          onTemplateSelect={handleTemplateSelect}
        />

        <TemplateUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={handleTemplateUpload}
          workspaceId={workspaceId}
        />
      </div>
    </WorkspaceLayout>
  )
}
