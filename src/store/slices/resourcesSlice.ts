import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Resource } from '@/types'

interface ResourcesState {
  items: Resource[]
  loading: boolean
  error: string | null
  searchTerm: string
  filterType: 'all' | 'image' | 'video'
  selectedResources: string[]
}

const initialState: ResourcesState = {
  items: [],
  loading: false,
  error: null,
  searchTerm: '',
  filterType: 'all',
  selectedResources: [],
}

const resourcesSlice = createSlice({
  name: 'resources',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setResources: (state, action: PayloadAction<Resource[]>) => {
      state.items = action.payload
    },
    addResource: (state, action: PayloadAction<Resource>) => {
      state.items.unshift(action.payload)
    },
    updateResource: (state, action: PayloadAction<Resource>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id)
      if (index !== -1) {
        state.items[index] = action.payload
      }
    },
    removeResource: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload)
      state.selectedResources = state.selectedResources.filter(
        id => id !== action.payload
      )
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload
    },
    setFilterType: (
      state,
      action: PayloadAction<'all' | 'image' | 'video'>
    ) => {
      state.filterType = action.payload
    },
    setSelectedResources: (state, action: PayloadAction<string[]>) => {
      state.selectedResources = action.payload
    },
    toggleResourceSelection: (state, action: PayloadAction<string>) => {
      const resourceId = action.payload
      const index = state.selectedResources.indexOf(resourceId)
      if (index === -1) {
        state.selectedResources.push(resourceId)
      } else {
        state.selectedResources.splice(index, 1)
      }
    },
    clearSelection: state => {
      state.selectedResources = []
    },
    clearFilters: state => {
      state.searchTerm = ''
      state.filterType = 'all'
    },
  },
})

export const {
  setLoading,
  setError,
  setResources,
  addResource,
  updateResource,
  removeResource,
  setSearchTerm,
  setFilterType,
  setSelectedResources,
  toggleResourceSelection,
  clearSelection,
  clearFilters,
} = resourcesSlice.actions

export default resourcesSlice.reducer
