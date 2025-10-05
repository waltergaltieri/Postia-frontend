'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { WorkspaceLayout } from '@/layouts'
import { ResourceGallery } from '@/components/resources/ResourceGallery'
import { useResources } from '@/hooks/useResources'

export default function ResourcesPage() {
  const params = useParams()
  const workspaceId = params.id as string

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
      const newName = window.prompt('Nuevo nombre:', resource.name)
      if (newName && newName !== resource.name) {
        await handleUpdateResource(id, newName)
      }
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
      </div>
    </WorkspaceLayout>
  )
}
