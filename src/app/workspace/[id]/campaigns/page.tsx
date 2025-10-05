'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { WorkspaceLayout } from '@/layouts'
import { CampaignList } from '@/components/campaigns/CampaignList'
import { useCampaigns } from '@/hooks/useCampaigns'
import { Campaign } from '@/types'
import { toast } from 'react-hot-toast'

export default function CampaignsPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string

  const [deleteConfirm, setDeleteConfirm] = useState<Campaign | null>(null)

  const {
    campaigns,
    isLoading,
    deleteCampaign,
    duplicateCampaign,
    changeStatus,
    isDeleting,
    isDuplicating,
  } = useCampaigns(workspaceId)

  const handleCreateNew = () => {
    router.push(`/workspace/${workspaceId}/campaigns/new`)
  }

  const handleView = (campaign: Campaign) => {
    // Navigate to campaign detail/preview page
    router.push(`/workspace/${workspaceId}/campaigns/${campaign.id}`)
  }

  const handleEdit = (campaign: Campaign) => {
    // Navigate to campaign edit page
    router.push(`/workspace/${workspaceId}/campaigns/${campaign.id}/edit`)
  }

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      const duplicatedCampaign = await duplicateCampaign(campaign.id)
      if (duplicatedCampaign) {
        // Navigate to edit the duplicated campaign
        router.push(
          `/workspace/${workspaceId}/campaigns/${duplicatedCampaign.id}/edit`
        )
      }
    } catch (error) {
      // Error is handled in the hook
    }
  }

  const handleDelete = (campaign: Campaign) => {
    setDeleteConfirm(campaign)
  }

  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteCampaign(deleteConfirm.id)
        setDeleteConfirm(null)
      } catch (error) {
        // Error is handled in the hook
      }
    }
  }

  const handleStatusChange = async (
    campaign: Campaign,
    newStatus: Campaign['status']
  ) => {
    try {
      await changeStatus(campaign, newStatus)
    } catch (error) {
      // Error is handled in the hook
    }
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId}>
      <div className="p-8 bg-secondary-50/30 min-h-screen">
        <CampaignList
          campaigns={campaigns}
          loading={isLoading}
          onCreateNew={handleCreateNew}
          onView={handleView}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />

        {/* Delete confirmation modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                Eliminar Campaña
              </h3>
              <p className="text-secondary-600 mb-6">
                ¿Estás seguro de que quieres eliminar la campaña "
                {deleteConfirm.name}"? Esta acción no se puede deshacer y se
                eliminarán todas las publicaciones programadas.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  )
}
