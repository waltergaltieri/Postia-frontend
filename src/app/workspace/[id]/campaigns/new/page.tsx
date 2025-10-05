'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { WorkspaceLayout } from '@/layouts'
import { CampaignCreationForm } from '@/components/campaigns/CampaignCreationForm'

export default function NewCampaignPage() {
  const params = useParams()
  const workspaceId = params.id as string

  return (
    <WorkspaceLayout workspaceId={workspaceId}>
      <div className="p-8 bg-secondary-50/30 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="page-header">
            <h1 className="page-title">Crear Nueva Campaña</h1>
            <p className="page-description">
              Configura tu campaña de contenido automatizada paso a paso
            </p>
          </div>

          <CampaignCreationForm workspaceId={workspaceId} />
        </div>
      </div>
    </WorkspaceLayout>
  )
}
