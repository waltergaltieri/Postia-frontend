import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import {
  // Actions
  setCurrentView,
  setCurrentDate,
  setFilters,
  setCampaignFilter,
  setSocialNetworkFilter,
  setStatusFilter,
  clearFilters,
  setSelectedPublication,
  openPublicationModal,
  closePublicationModal,
  openRescheduleModal,
  closeRescheduleModal,
  openRegenerateModal,
  closeRegenerateModal,
  setError,
  clearError,
  // Selectors
  selectCalendarView,
  selectCurrentDate,
  selectCalendarFilters,
  selectSelectedPublication,
  selectIsPublicationModalOpen,
  selectIsRescheduleModalOpen,
  selectIsRegenerateModalOpen,
  selectCalendarLoadingStates,
  selectCalendarError,
} from '@/store/slices/calendarSlice'
import {
  useGetPublicationsQuery,
  useGetPublicationQuery,
  useUpdatePublicationMutation,
  usePublishNowMutation,
  useReschedulePublicationMutation,
  useCancelPublicationMutation,
  useRegeneratePublicationMutation,
} from '@/store/api/calendarApi'
import { Publication, CalendarFilters, SocialNetwork } from '@/types'
import { useCallback } from 'react'
import toast from 'react-hot-toast'

export const useCalendar = (workspaceId: string) => {
  const dispatch = useDispatch<AppDispatch>()

  // Selectors
  const currentView = useSelector(selectCalendarView)
  const currentDate = useSelector(selectCurrentDate)
  const filters = useSelector(selectCalendarFilters)
  const selectedPublication = useSelector(selectSelectedPublication)
  const isPublicationModalOpen = useSelector(selectIsPublicationModalOpen)
  const isRescheduleModalOpen = useSelector(selectIsRescheduleModalOpen)
  const isRegenerateModalOpen = useSelector(selectIsRegenerateModalOpen)
  const loadingStates = useSelector(selectCalendarLoadingStates)
  const error = useSelector(selectCalendarError)

  // API hooks
  const {
    data: publicationsData,
    isLoading: isLoadingPublications,
    error: publicationsError,
    refetch: refetchPublications,
  } = useGetPublicationsQuery({
    workspaceId,
    filters,
  })

  const [updatePublication] = useUpdatePublicationMutation()
  const [publishNow] = usePublishNowMutation()
  const [reschedulePublication] = useReschedulePublicationMutation()
  const [cancelPublication] = useCancelPublicationMutation()
  const [regeneratePublication] = useRegeneratePublicationMutation()

  // View actions
  const handleViewChange = useCallback(
    (view: typeof currentView) => {
      dispatch(setCurrentView(view))
    },
    [dispatch]
  )

  const handleDateChange = useCallback(
    (date: Date) => {
      dispatch(setCurrentDate(date.toISOString()))
    },
    [dispatch]
  )

  // Filter actions
  const handleFiltersChange = useCallback(
    (newFilters: CalendarFilters) => {
      dispatch(setFilters(newFilters))
    },
    [dispatch]
  )

  const handleCampaignFilterChange = useCallback(
    (campaignId?: string) => {
      dispatch(setCampaignFilter(campaignId))
    },
    [dispatch]
  )

  const handleSocialNetworkFilterChange = useCallback(
    (socialNetwork?: SocialNetwork) => {
      dispatch(setSocialNetworkFilter(socialNetwork))
    },
    [dispatch]
  )

  const handleStatusFilterChange = useCallback(
    (status?: Publication['status']) => {
      dispatch(setStatusFilter(status))
    },
    [dispatch]
  )

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters())
  }, [dispatch])

  // Publication actions
  const handlePublicationSelect = useCallback(
    (publication: Publication) => {
      dispatch(openPublicationModal(publication))
    },
    [dispatch]
  )

  const handleCloseModal = useCallback(() => {
    dispatch(closePublicationModal())
  }, [dispatch])

  const handleOpenRescheduleModal = useCallback(() => {
    dispatch(openRescheduleModal())
  }, [dispatch])

  const handleCloseRescheduleModal = useCallback(() => {
    dispatch(closeRescheduleModal())
  }, [dispatch])

  const handleOpenRegenerateModal = useCallback(() => {
    dispatch(openRegenerateModal())
  }, [dispatch])

  const handleCloseRegenerateModal = useCallback(() => {
    dispatch(closeRegenerateModal())
  }, [dispatch])

  // Publication operations
  const handlePublishNow = useCallback(
    async (publicationId: string) => {
      try {
        await publishNow(publicationId).unwrap()
        toast.success('Publicación publicada exitosamente')
        dispatch(closePublicationModal())
      } catch (error) {
        toast.error('Error al publicar la publicación')
        console.error('Error publishing:', error)
      }
    },
    [publishNow, dispatch]
  )

  const handleReschedule = useCallback(
    async (publicationId: string, newDate: Date) => {
      try {
        await reschedulePublication({ publicationId, newDate }).unwrap()
        toast.success('Publicación reprogramada exitosamente')
        dispatch(closeRescheduleModal())
        dispatch(closePublicationModal())
      } catch (error) {
        toast.error('Error al reprogramar la publicación')
        console.error('Error rescheduling:', error)
      }
    },
    [reschedulePublication, dispatch]
  )

  const handleCancel = useCallback(
    async (publicationId: string) => {
      try {
        await cancelPublication(publicationId).unwrap()
        toast.success('Publicación cancelada exitosamente')
        dispatch(closePublicationModal())
      } catch (error) {
        toast.error('Error al cancelar la publicación')
        console.error('Error cancelling:', error)
      }
    },
    [cancelPublication, dispatch]
  )

  const handleRegenerate = useCallback(
    async (publicationId: string, newPrompt?: string) => {
      try {
        await regeneratePublication({ id: publicationId, newPrompt }).unwrap()
        toast.success('Publicación regenerada exitosamente')
        dispatch(closeRegenerateModal())
        dispatch(closePublicationModal())
      } catch (error) {
        toast.error('Error al regenerar la publicación')
        console.error('Error regenerating:', error)
      }
    },
    [regeneratePublication, dispatch]
  )

  const handleUpdatePublication = useCallback(
    async (
      publicationId: string,
      updateData: { content?: string; scheduledDate?: Date }
    ) => {
      try {
        await updatePublication({ id: publicationId, ...updateData }).unwrap()
        toast.success('Publicación actualizada exitosamente')
      } catch (error) {
        toast.error('Error al actualizar la publicación')
        console.error('Error updating:', error)
      }
    },
    [updatePublication]
  )

  // Error handling
  const handleClearError = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  return {
    // State
    currentView,
    currentDate,
    filters,
    selectedPublication,
    publications: publicationsData?.data || [],

    // UI State
    isPublicationModalOpen,
    isRescheduleModalOpen,
    isRegenerateModalOpen,

    // Loading states
    isLoading: isLoadingPublications || loadingStates.isLoading,
    isPublishing: loadingStates.isPublishing,
    isRescheduling: loadingStates.isRescheduling,
    isRegenerating: loadingStates.isRegenerating,
    isCancelling: loadingStates.isCancelling,

    // Error state
    error: error || publicationsError,

    // Actions
    handleViewChange,
    handleDateChange,
    handleFiltersChange,
    handleCampaignFilterChange,
    handleSocialNetworkFilterChange,
    handleStatusFilterChange,
    handleClearFilters,
    handlePublicationSelect,
    handleCloseModal,
    handleOpenRescheduleModal,
    handleCloseRescheduleModal,
    handleOpenRegenerateModal,
    handleCloseRegenerateModal,
    handlePublishNow,
    handleReschedule,
    handleCancel,
    handleRegenerate,
    handleUpdatePublication,
    handleClearError,

    // Utilities
    refetchPublications,
  }
}

export default useCalendar
