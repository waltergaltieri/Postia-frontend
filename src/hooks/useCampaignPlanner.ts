'use client'

import { useState, useCallback } from 'react'
import { getCampaignPlannerService } from '@/lib/ai/services/CampaignPlannerService'
import type { 
  CampaignData, 
  WorkspaceData, 
  ResourceData, 
  TemplateData, 
  ContentPlanItem 
} from '@/lib/ai/agents/types'

export interface UseCampaignPlannerState {
  contentPlan: ContentPlanItem[]
  isLoading: boolean
  error: string | null
  isRegenerating: boolean
}

export interface UseCampaignPlannerActions {
  generateContentPlan: (params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources?: ResourceData[]
    templates?: TemplateData[]
  }) => Promise<void>
  regenerateContentPlan: () => Promise<void>
  regenerateContentItem: (index: number) => Promise<void>
  clearContentPlan: () => void
  clearError: () => void
}

export interface UseCampaignPlannerReturn extends UseCampaignPlannerState, UseCampaignPlannerActions {}

export function useCampaignPlanner(): UseCampaignPlannerReturn {
  const [state, setState] = useState<UseCampaignPlannerState>({
    contentPlan: [],
    isLoading: false,
    error: null,
    isRegenerating: false
  })

  // Parámetros de la última generación para regenerar
  const [lastParams, setLastParams] = useState<{
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
  } | null>(null)

  const service = getCampaignPlannerService()

  const generateContentPlan = useCallback(async (params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources?: ResourceData[]
    templates?: TemplateData[]
  }) => {
    const { campaign, workspace, resources = [], templates = [] } = params

    // Validar datos de entrada
    const validation = service.validateCampaignData(campaign)
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        error: validation.errors.join(', ')
      }))
      return
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    // Guardar parámetros para regeneración
    setLastParams({ campaign, workspace, resources, templates })

    try {
      const contentPlan = await service.generateContentPlan({
        campaign,
        workspace,
        resources,
        templates
      })

      setState(prev => ({
        ...prev,
        contentPlan,
        isLoading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
    }
  }, [service])

  const regenerateContentPlan = useCallback(async () => {
    if (!lastParams) {
      setState(prev => ({
        ...prev,
        error: 'No hay parámetros de campaña disponibles para regenerar'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      isRegenerating: true,
      error: null
    }))

    try {
      const contentPlan = await service.regenerateContentPlan({
        ...lastParams,
        previousPlan: state.contentPlan
      })

      setState(prev => ({
        ...prev,
        contentPlan,
        isRegenerating: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isRegenerating: false
      }))
    }
  }, [lastParams, state.contentPlan, service])

  const regenerateContentItem = useCallback(async (index: number) => {
    if (!lastParams) {
      setState(prev => ({
        ...prev,
        error: 'No hay parámetros de campaña disponibles para regenerar'
      }))
      return
    }

    if (index < 0 || index >= state.contentPlan.length) {
      setState(prev => ({
        ...prev,
        error: 'Índice de elemento inválido'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      error: null
    }))

    try {
      const newItem = await service.regenerateContentItem({
        ...lastParams,
        itemIndex: index,
        previousPlan: state.contentPlan
      })

      setState(prev => {
        const newContentPlan = [...prev.contentPlan]
        newContentPlan[index] = newItem
        return {
          ...prev,
          contentPlan: newContentPlan
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setState(prev => ({
        ...prev,
        error: errorMessage
      }))
    }
  }, [lastParams, state.contentPlan, service])

  const clearContentPlan = useCallback(() => {
    setState(prev => ({
      ...prev,
      contentPlan: [],
      error: null
    }))
    setLastParams(null)
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }))
  }, [])

  return {
    ...state,
    generateContentPlan,
    regenerateContentPlan,
    regenerateContentItem,
    clearContentPlan,
    clearError
  }
}