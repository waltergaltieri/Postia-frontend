'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import { WorkspaceLayout } from '@/layouts'
import { ResourceGallery } from '@/components/resources/ResourceGallery'
import { ResourceEditModal } from '@/components/resources/ResourceEditModal'
import { useResources } from '@/hooks/useResources'
import toast from 'react-hot-toast'

export default function ResourcesPage() {
  const params = useParams()
  const workspaceId = params.id as string

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [resourceToEdit, setResourceToEdit] = useState<any>(null)

  const {
    resources,
    selectedResources,
    searchTerm,
    filterType,
    isLoading,
    handleResourceSelect,
    handleUploadResources,
    handleUpdateResource,
    handleDeleteResource,
    handleSearch,
    handleFilterChange,
  } = useResources(workspaceId)

  const handleResourceEdit = async (id: string) => {
    const resource = resources.find(r => r.id === id)
    if (resource) {
      setResourceToEdit(resource)
      setIsEditModalOpen(true)
    } else {
      toast.error('Recurso no encontrado')
    }
  }

  const handleResourceUpdate = async (resourceId: string, name: string) => {
    try {
      await handleUpdateResource(resourceId, name)
      setIsEditModalOpen(false)
      setResourceToEdit(null)
    } catch (error) {
      console.error('Error updating resource:', error)
      throw error
    }
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId}>
      <div className="p-8 bg-secondary-50/30 min-h-screen">
        <ResourceGallery
          resources={resources}
          onResourceEdit={handleResourceEdit}
          onResourceDelete={handleDeleteResource}
          onResourceUpload={handleUploadResources}
          workspaceId={workspaceId}
          loading={isLoading}
          selectable={false}
          selectedResources={selectedResources}
          onResourceSelect={handleResourceSelect}
          searchTerm={searchTerm}
          filterType={filterType}
          onSearchChange={handleSearch}
          onFilterChange={handleFilterChange}
        />

        <ResourceEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setResourceToEdit(null)
          }}
          onUpdate={handleResourceUpdate}
          resource={resourceToEdit}
        />
      </div>
    </WorkspaceLayout>
  )
}
