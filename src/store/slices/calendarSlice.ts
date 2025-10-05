import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Publication, CalendarFilters, SocialNetwork } from '@/types'

export interface CalendarState {
  // View settings
  currentView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'
  currentDate: string // ISO string

  // Filters
  filters: CalendarFilters

  // Selected publication for modal
  selectedPublication: Publication | null

  // UI state
  isPublicationModalOpen: boolean
  isRescheduleModalOpen: boolean
  isRegenerateModalOpen: boolean

  // Loading states
  isLoading: boolean
  isPublishing: boolean
  isRescheduling: boolean
  isRegenerating: boolean
  isCancelling: boolean

  // Error state
  error: string | null
}

const initialState: CalendarState = {
  // View settings
  currentView: 'dayGridMonth',
  currentDate: new Date().toISOString(),

  // Filters
  filters: {},

  // Selected publication
  selectedPublication: null,

  // UI state
  isPublicationModalOpen: false,
  isRescheduleModalOpen: false,
  isRegenerateModalOpen: false,

  // Loading states
  isLoading: false,
  isPublishing: false,
  isRescheduling: false,
  isRegenerating: false,
  isCancelling: false,

  // Error state
  error: null,
}

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    // View actions
    setCurrentView: (
      state,
      action: PayloadAction<CalendarState['currentView']>
    ) => {
      state.currentView = action.payload
    },

    setCurrentDate: (state, action: PayloadAction<string>) => {
      state.currentDate = action.payload
    },

    // Filter actions
    setFilters: (state, action: PayloadAction<CalendarFilters>) => {
      state.filters = action.payload
    },

    setCampaignFilter: (state, action: PayloadAction<string | undefined>) => {
      state.filters.campaignId = action.payload
    },

    setSocialNetworkFilter: (
      state,
      action: PayloadAction<SocialNetwork | undefined>
    ) => {
      state.filters.socialNetwork = action.payload
    },

    setStatusFilter: (
      state,
      action: PayloadAction<Publication['status'] | undefined>
    ) => {
      state.filters.status = action.payload
    },

    clearFilters: state => {
      state.filters = {}
    },

    // Publication selection
    setSelectedPublication: (
      state,
      action: PayloadAction<Publication | null>
    ) => {
      state.selectedPublication = action.payload
    },

    // Modal actions
    openPublicationModal: (state, action: PayloadAction<Publication>) => {
      state.selectedPublication = action.payload
      state.isPublicationModalOpen = true
    },

    closePublicationModal: state => {
      state.isPublicationModalOpen = false
      state.selectedPublication = null
    },

    openRescheduleModal: state => {
      state.isRescheduleModalOpen = true
    },

    closeRescheduleModal: state => {
      state.isRescheduleModalOpen = false
    },

    openRegenerateModal: state => {
      state.isRegenerateModalOpen = true
    },

    closeRegenerateModal: state => {
      state.isRegenerateModalOpen = false
    },

    // Loading actions
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    setPublishing: (state, action: PayloadAction<boolean>) => {
      state.isPublishing = action.payload
    },

    setRescheduling: (state, action: PayloadAction<boolean>) => {
      state.isRescheduling = action.payload
    },

    setRegenerating: (state, action: PayloadAction<boolean>) => {
      state.isRegenerating = action.payload
    },

    setCancelling: (state, action: PayloadAction<boolean>) => {
      state.isCancelling = action.payload
    },

    // Error actions
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },

    clearError: state => {
      state.error = null
    },

    // Reset state
    resetCalendarState: () => initialState,
  },
})

export const {
  // View actions
  setCurrentView,
  setCurrentDate,

  // Filter actions
  setFilters,
  setCampaignFilter,
  setSocialNetworkFilter,
  setStatusFilter,
  clearFilters,

  // Publication selection
  setSelectedPublication,

  // Modal actions
  openPublicationModal,
  closePublicationModal,
  openRescheduleModal,
  closeRescheduleModal,
  openRegenerateModal,
  closeRegenerateModal,

  // Loading actions
  setLoading,
  setPublishing,
  setRescheduling,
  setRegenerating,
  setCancelling,

  // Error actions
  setError,
  clearError,

  // Reset
  resetCalendarState,
} = calendarSlice.actions

export default calendarSlice.reducer

// Selectors
export const selectCalendarView = (state: { calendar: CalendarState }) =>
  state.calendar.currentView

export const selectCurrentDate = (state: { calendar: CalendarState }) =>
  state.calendar.currentDate

export const selectCalendarFilters = (state: { calendar: CalendarState }) =>
  state.calendar.filters

export const selectSelectedPublication = (state: { calendar: CalendarState }) =>
  state.calendar.selectedPublication

export const selectIsPublicationModalOpen = (state: {
  calendar: CalendarState
}) => state.calendar.isPublicationModalOpen

export const selectIsRescheduleModalOpen = (state: {
  calendar: CalendarState
}) => state.calendar.isRescheduleModalOpen

export const selectIsRegenerateModalOpen = (state: {
  calendar: CalendarState
}) => state.calendar.isRegenerateModalOpen

export const selectCalendarLoadingStates = (state: {
  calendar: CalendarState
}) => ({
  isLoading: state.calendar.isLoading,
  isPublishing: state.calendar.isPublishing,
  isRescheduling: state.calendar.isRescheduling,
  isRegenerating: state.calendar.isRegenerating,
  isCancelling: state.calendar.isCancelling,
})

export const selectCalendarError = (state: { calendar: CalendarState }) =>
  state.calendar.error
