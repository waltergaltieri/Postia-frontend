'use client'

import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store'
import {
  useGetCampaignsQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  useDuplicateCampaignMutation,
} from '@/store/api/campaignsApi'
import {
  setFilters,
  clearFilters,
  setCurrentCampaign,
} from '@/store/slices/campaignsSlice'
import { Campaign, CampaignFormData } from '@/types'
import { toast } from 'react-hot-toast'

export function useCampaigns(workspaceId: string) {
  const dispatch = useDispatch()
  const { filters } = useSelector((state: RootState) => state.campaigns)

  // Queries
  const {
    data: campaignsResponse,
    isLoading,
    error,
    refetch,
  } = useGetCampaignsQuery({
    workspaceId,
    status: filters.status === 'all' ? undefined : filters.status,
    search: filters.search || undefined,
  })

  // Mutations
  const [createCampaign, { isLoading: isCreating }] =
    useCreateCampaignMutation()
  const [updateCampaign, { isLoading: isUpdating }] =
    useUpdateCampaignMutation()
  const [deleteCampaign, { isLoading: isDeleting }] =
    useDeleteCampaignMutation()
  const [duplicateCampaign, { isLoading: isDuplicating }] =
    useDuplicateCampaignMutation()

  const campaigns = campaignsResponse?.data || []
  const pagination = campaignsResponse?.pagination

  // Filter management
  const updateFilters = useCallback(
    (newFilters: Partial<typeof filters>) => {
      dispatch(setFilters(newFilters))
    },
    [dispatch]
  )

  const resetFilters = useCallback(() => {
    dispatch(clearFilters())
  }, [dispatch])

  // Campaign operations
  const handleCreateCampaign = useCallback(
    async (campaignData: CampaignFormData) => {
      try {
        const result = await createCampaign({
          ...campaignData,
          workspaceId,
        }).unwrap()

        toast.success('Campaña creada exitosamente')
        return result.data
      } catch (error) {
        toast.error('Error al crear la campaña')
        throw error
      }
    },
    [createCampaign, workspaceId]
  )

  const handleUpdateCampaign = useCallback(
    async (campaignId: string, updates: Partial<CampaignFormData>) => {
      try {
        const result = await updateCampaign({
          id: campaignId,
          ...updates,
        }).unwrap()

        toast.success('Campaña actualizada exitosamente')
        return result.data
      } catch (error) {
        toast.error('Error al actualizar la campaña')
        throw error
      }
    },
    [updateCampaign]
  )

  const handleDeleteCampaign = useCallback(
    async (campaignId: string) => {
      try {
        await deleteCampaign(campaignId).unwrap()
        toast.success('Campaña eliminada exitosamente')
      } catch (error) {
        toast.error('Error al eliminar la campaña')
        throw error
      }
    },
    [deleteCampaign]
  )

  const handleDuplicateCampaign = useCallback(
    async (campaignId: string) => {
      try {
        const result = await duplicateCampaign(campaignId).unwrap()
        toast.success('Campaña duplicada exitosamente')
        return result.data
      } catch (error) {
        toast.error('Error al duplicar la campaña')
        throw error
      }
    },
    [duplicateCampaign]
  )

  const handleStatusChange = useCallback(
    async (campaign: Campaign, newStatus: Campaign['status']) => {
      try {
        await handleUpdateCampaign(campaign.id, { status: newStatus } as any)

        const statusMessages = {
          active: 'Campaña activada',
          paused: 'Campaña pausada',
          completed: 'Campaña completada',
          draft: 'Campaña guardada como borrador',
        }

        toast.success(statusMessages[newStatus])
      } catch (error) {
        toast.error('Error al cambiar el estado de la campaña')
        throw error
      }
    },
    [handleUpdateCampaign]
  )

  // Current campaign management
  const selectCampaign = useCallback(
    (campaign: Campaign | null) => {
      dispatch(setCurrentCampaign(campaign))
    },
    [dispatch]
  )

  return {
    // Data
    campaigns,
    pagination,
    filters,

    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isDuplicating,

    // Error
    error,

    // Operations
    createCampaign: handleCreateCampaign,
    updateCampaign: handleUpdateCampaign,
    deleteCampaign: handleDeleteCampaign,
    duplicateCampaign: handleDuplicateCampaign,
    changeStatus: handleStatusChange,

    // Filter management
    updateFilters,
    resetFilters,

    // Current campaign
    selectCampaign,

    // Utilities
    refetch,
  }
}
