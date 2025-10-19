'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CampaignDataStep } from '@/components/campaigns/CampaignDataStep'
import { ResourceSelectionStep } from '@/components/campaigns/ResourceSelectionStep'
import { CampaignPromptStep } from '@/components/campaigns/CampaignPromptStep'
import { CampaignContentPlanStep } from '@/components/campaigns/CampaignContentPlanStep'
import { CampaignFormData } from '@/types'
import { useCreateCampaignMutation } from '@/store/api/campaignsApi'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useResources } from '@/hooks/useResources'
import { useTemplates } from '@/hooks/useTemplates'
import { toast } from 'react-hot-toast'
import type { CampaignData, WorkspaceData, ResourceData, TemplateData, ContentPlanItem } from '@/lib/ai/agents/types'

/**
 * Helper function to safely extract workspace data with proper validation
 * Prevents the "Cannot read properties of undefined" error by providing
 * default values for missing branding properties
 * 
 * @param workspace - The workspace object from context
 * @returns WorkspaceData object or null if validation fails
 */
const getWorkspaceData = (workspace: any): WorkspaceData | null => {
  // Validate required workspace properties
  if (!workspace || !workspace.id || !workspace.name) {
    return null
  }

  // Safely access nested branding properties with fallbacks
  const branding = workspace.branding || {}
  const colors = branding.colors || {}

  return {
    id: workspace.id,
    name: workspace.name,
    branding: {
      primaryColor: colors.primary || '#3B82F6', // Default blue
      secondaryColor: colors.secondary || '#6B7280', // Default gray
      logo: branding.logo || '',
      slogan: branding.slogan || '',
      description: branding.description || '',
      whatsapp: branding.whatsapp || '',
    }
  }
}

interface CampaignCreationFormProps {
  workspaceId: string
}

export type CampaignStep = 'data' | 'resources' | 'prompt' | 'planner'

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
  const { currentWorkspace } = useWorkspace()
  const { resources } = useResources(workspaceId)
  const { templates } = useTemplates(workspaceId)
  const [createCampaign, { isLoading: isCreating }] =
    useCreateCampaignMutation()

  const [currentStep, setCurrentStep] = useState<CampaignStep>('data')
  const [formData, setFormData] = useState<CampaignFormState>({
    step1: {},
    step2: { resources: [], templates: [] },
    step3: { prompt: '' },
  })
  const [campaignPlannerData, setCampaignPlannerData] = useState<{
    campaign: CampaignData | null
    workspace: WorkspaceData | null
    resources: ResourceData[]
    templates: TemplateData[]
  }>({
    campaign: null,
    workspace: null,
    resources: [],
    templates: []
  })
  
  const [generatedContentPlan, setGeneratedContentPlan] = useState<ContentPlanItem[]>([])

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

    // Validate required data from step 1 to prevent runtime errors
    if (!finalData.step1.name || !finalData.step1.objective || !finalData.step1.startDate || 
        !finalData.step1.endDate || !finalData.step1.socialNetworks || !finalData.step1.interval ||
        !finalData.step1.contentType) {
      toast.error('Faltan datos requeridos de la campaña. Por favor, revisa el paso 1.')
      return
    }

    // DEBUG: Log selected templates and resources
    console.log('🔍 DEBUG Form Data:')
    console.log('   Selected templates:', finalData.step2.templates)
    console.log('   Selected resources:', finalData.step2.resources)
    console.log('   Available templates:', templates?.map(t => `${t.id}: ${t.name}`))
    console.log('   Available resources:', resources?.map(r => `${r.id}: ${r.name}`))

    // Prepare data for Campaign Planner
    const campaignData: CampaignData = {
      id: `temp-${Date.now()}`, // Temporary ID
      name: finalData.step1.name,
      objective: finalData.step1.objective,
      startDate: finalData.step1.startDate.toISOString(),
      endDate: finalData.step1.endDate.toISOString(),
      socialNetworks: finalData.step1.socialNetworks,
      intervalHours: finalData.step1.interval,
      contentType: finalData.step1.contentType,
      optimizationSettings: finalData.step1.optimizationSettings,
      prompt: finalData.step3.prompt,
      templateIds: finalData.step2.templates, // ¡AQUÍ ESTABA EL PROBLEMA! Faltaba incluir las plantillas seleccionadas
    }

    console.log('🎯 Campaign data being sent to planner:', campaignData)

    // Get real workspace data from context with proper validation
    const workspaceData = getWorkspaceData(currentWorkspace)
    if (!workspaceData) {
      toast.error('No se pudo obtener la información del workspace. Por favor, verifica que el workspace esté configurado correctamente.')
      return
    }

    // Convert resources and templates to the format expected by Campaign Planner
    const resourcesData: ResourceData[] = (resources || []).map(resource => ({
      id: resource.id,
      name: resource.name,
      url: resource.url,
      type: resource.type as 'image' | 'video',
      mimeType: resource.type === 'image' ? 'image/jpeg' : 'video/mp4' // Default mime types
    }))

    const templatesData: TemplateData[] = (templates || []).map(template => ({
      id: template.id,
      name: template.name,
      type: template.type as 'single' | 'carousel',
      socialNetworks: template.socialNetworks,
      images: template.images
    }))

    setCampaignPlannerData({
      campaign: campaignData,
      workspace: workspaceData,
      resources: resourcesData,
      templates: templatesData
    })

    setCurrentStep('planner')
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'resources':
        setCurrentStep('data')
        break
      case 'prompt':
        setCurrentStep('resources')
        break
      case 'planner':
        setCurrentStep('prompt')
        break
    }
  }

  const handlePlannerBack = () => {
    setCurrentStep('prompt')
  }

  const handleCreateCampaignWithPlan = async (contentPlan: ContentPlanItem[]) => {
    if (!campaignPlannerData.campaign) return

    // Store the content plan
    setGeneratedContentPlan(contentPlan)

    // Combine all form data for final campaign creation
    const campaignData: CampaignFormData = {
      name: formData.step1.name!,
      objective: formData.step1.objective!,
      startDate: formData.step1.startDate!,
      endDate: formData.step1.endDate!,
      socialNetworks: formData.step1.socialNetworks!,
      interval: formData.step1.interval!,
      contentType: formData.step1.contentType!,
      optimizationSettings: formData.step1.optimizationSettings,
      resources: formData.step2.resources,
      templates: formData.step2.templates,
      prompt: formData.step3.prompt,
    }

    try {
      // 1. Create the campaign first
      const createdCampaign = await createCampaign({
        ...campaignData,
        workspaceId,
      }).unwrap()

      console.log('✅ Campaign created:', createdCampaign)
      console.log('📋 Content plan to save:', contentPlan)

      // 2. TODO: Create individual publications from the content plan
      // This would require a new API endpoint to create publications
      // For now, we'll log the plan that should be saved
      
      toast.success(`Campaña creada exitosamente con ${contentPlan.length} publicaciones programadas`)
      router.push(`/workspace/${workspaceId}/campaigns`)
    } catch (error) {
      toast.error('Error al crear la campaña')
      console.error('Error creating campaign:', error)
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
          <div className="flex items-center space-x-2">
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
              <span className="ml-2 text-sm font-medium">Datos</span>
            </div>

            <div className="w-6 h-px bg-secondary-200" />

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

            <div className="w-6 h-px bg-secondary-200" />

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

            <div className="w-6 h-px bg-secondary-200" />

            <div
              className={`flex items-center ${currentStep === 'planner' ? 'text-primary-600' : 'text-secondary-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'planner'
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-200 text-secondary-600'
                }`}
              >
                4
              </div>
              <span className="ml-2 text-sm font-medium">Plan de Contenido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form content */}
      <div className={currentStep === 'planner' ? 'p-0' : 'p-8'}>
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

        {currentStep === 'planner' && campaignPlannerData.campaign && campaignPlannerData.workspace && (
          <CampaignContentPlanStep
            campaign={campaignPlannerData.campaign}
            workspace={campaignPlannerData.workspace}
            resources={campaignPlannerData.resources}
            templates={campaignPlannerData.templates}
            onNext={handleCreateCampaignWithPlan}
            onBack={handlePlannerBack}
          />
        )}
      </div>
    </div>
  )
}
