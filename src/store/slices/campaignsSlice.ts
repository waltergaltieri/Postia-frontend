import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Campaign } from '@/types'

interface CampaignsState {
  campaigns: Campaign[]
  currentCampaign: Campaign | null
  loading: boolean
  error: string | null
  filters: {
    status: 'all' | 'active' | 'completed' | 'draft' | 'paused'
    search: string
  }
}

const initialState: CampaignsState = {
  campaigns: [],
  currentCampaign: null,
  loading: false,
  error: null,
  filters: {
    status: 'all',
    search: '',
  },
}

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setCampaigns: (state, action: PayloadAction<Campaign[]>) => {
      state.campaigns = action.payload
    },
    addCampaign: (state, action: PayloadAction<Campaign>) => {
      state.campaigns.unshift(action.payload)
    },
    updateCampaign: (state, action: PayloadAction<Campaign>) => {
      const index = state.campaigns.findIndex(c => c.id === action.payload.id)
      if (index !== -1) {
        state.campaigns[index] = action.payload
      }
    },
    deleteCampaign: (state, action: PayloadAction<string>) => {
      state.campaigns = state.campaigns.filter(c => c.id !== action.payload)
    },
    setCurrentCampaign: (state, action: PayloadAction<Campaign | null>) => {
      state.currentCampaign = action.payload
    },
    setFilters: (
      state,
      action: PayloadAction<Partial<CampaignsState['filters']>>
    ) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearFilters: state => {
      state.filters = initialState.filters
    },
  },
})

export const {
  setLoading,
  setError,
  setCampaigns,
  addCampaign,
  updateCampaign,
  deleteCampaign,
  setCurrentCampaign,
  setFilters,
  clearFilters,
} = campaignsSlice.actions

export default campaignsSlice.reducer
