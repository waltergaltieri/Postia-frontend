'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CampaignDataStep } from '@/components/campaigns/CampaignDataStep'
import { ResourceSelectionStep } from '@/components/campaigns/ResourceSelectionStep'
import { CampaignPromptStep } from '@/components/campaigns/CampaignPromptStep'
import { CampaignFormData } from '@/types'
import { useCreateCampaignMutation } from '@/store/api/campaignsApi'
import { toast } from 'react-hot-toast'

interface CampaignCreationFormProps {
  workspaceId: string
}

export type CampaignStep = 'data' | 'resources' | 'prompt'

export interface CampaignFormState {
  step1: Partial<CampaignFormData>
  step2: {
    resources: string[]
    templates: string[]
  }
  step3: {
    prompt: string
  }
}

export function CampaignCreationForm({
  workspaceId,
}: CampaignCreationFormProps) {
  const router = useRouter()
  const [createCampaign, { isLoading: isCreating }] =
    useCreateCampaignMutation()

  const [currentStep, setCurrentStep] = useState<CampaignStep>('data')
  const [formData, setFormData] = useState<CampaignFormState>({
    step1: {},
    step2: { resources: [], templates: [] },
    step3: { prompt: '' },
  })

  const handleStep1Complete = (data: Partial<CampaignFormData>) => {
    setFormData(prev => ({ ...prev, step1: data }))
    setCurrentStep('resources')
  }

  const handleStep2Complete = (data: {
    resources: string[]
    templates: string[]
  }) => {
    setFormData(prev => ({ ...prev, step2: data }))
    setCurrentStep('prompt')
  }

  const handleStep3Complete = async (data: { prompt: string }) => {
    const finalData = { ...formData, step3: data }

    // Combine all form data
    const campaignData: CampaignFormData = {
      name: finalData.step1.name!,
      objective: finalData.step1.objective!,
      startDate: finalData.step1.startDate!,
      endDate: finalData.step1.endDate!,
      socialNetworks: finalData.step1.socialNetworks!,
      interval: finalData.step1.interval!,
      contentType: finalData.step1.contentType!,
      optimizationSettings: finalData.step1.optimizationSettings,
      resources: finalData.step2.resources,
      templates: finalData.step2.templates,
      prompt: finalData.step3.prompt,
    }

    try {
      const result = await createCampaign({
        ...campaignData,
        workspaceId,
      }).unwrap()
      toast.success('Campaña creada exitosamente')
      router.push(`/workspace/${workspaceId}/campaigns`)
    } catch (error) {
      toast.error('Error al crear la campaña')
      console.error('Error creating campaign:', error)
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'resources':
        setCurrentStep('data')
        break
      case 'prompt':
        setCurrentStep('resources')
        break
    }
  }

  const handleCancel = () => {
    router.push(`/workspace/${workspaceId}/campaigns`)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-secondary-100">
      {/* Progress indicator */}
      <div className="px-6 py-4 border-b border-secondary-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center ${currentStep === 'data' ? 'text-primary-600' : 'text-secondary-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'data'
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-200 text-secondary-600'
                }`}
              >
                1
              </div>
              <span className="ml-2 text-sm font-medium">Datos de Campaña</span>
            </div>

            <div className="w-8 h-px bg-secondary-200" />

            <div
              className={`flex items-center ${currentStep === 'resources' ? 'text-primary-600' : 'text-secondary-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'resources'
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-200 text-secondary-600'
                }`}
              >
                2
              </div>
              <span className="ml-2 text-sm font-medium">Recursos</span>
            </div>

            <div className="w-8 h-px bg-secondary-200" />

            <div
              className={`flex items-center ${currentStep === 'prompt' ? 'text-primary-600' : 'text-secondary-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'prompt'
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-200 text-secondary-600'
                }`}
              >
                3
              </div>
              <span className="ml-2 text-sm font-medium">Prompt IA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form content */}
      <div className="p-8">
        {currentStep === 'data' && (
          <CampaignDataStep
            initialData={formData.step1}
            onNext={handleStep1Complete}
            onCancel={handleCancel}
          />
        )}

        {currentStep === 'resources' && (
          <ResourceSelectionStep
            workspaceId={workspaceId}
            initialData={formData.step2}
            onNext={handleStep2Complete}
            onBack={handleBack}
          />
        )}

        {currentStep === 'prompt' && (
          <CampaignPromptStep
            workspaceId={workspaceId}
            initialData={formData.step3}
            selectedResources={formData.step2.resources}
            selectedTemplates={formData.step2.templates}
            contentType={formData.step1.contentType || 'unified'}
            onNext={handleStep3Complete}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  )
}
