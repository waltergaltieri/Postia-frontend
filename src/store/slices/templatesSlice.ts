import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Template } from '@/types'

interface TemplatesState {
  items: Template[]
  loading: boolean
  error: string | null
  searchTerm: string
  filterType: 'all' | 'single' | 'carousel'
  selectedTemplates: string[]
}

const initialState: TemplatesState = {
  items: [],
  loading: false,
  error: null,
  searchTerm: '',
  filterType: 'all',
  selectedTemplates: [],
}

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setTemplates: (state, action: PayloadAction<Template[]>) => {
      state.items = action.payload
    },
    addTemplate: (state, action: PayloadAction<Template>) => {
      state.items.unshift(action.payload)
    },
    updateTemplate: (state, action: PayloadAction<Template>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id)
      if (index !== -1) {
        state.items[index] = action.payload
      }
    },
    removeTemplate: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload)
      state.selectedTemplates = state.selectedTemplates.filter(
        id => id !== action.payload
      )
    },
    updateTemplateImageOrder: (
      state,
      action: PayloadAction<{ templateId: string; images: string[] }>
    ) => {
      const template = state.items.find(
        item => item.id === action.payload.templateId
      )
      if (template) {
        template.images = action.payload.images
      }
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload
    },
    setFilterType: (
      state,
      action: PayloadAction<'all' | 'single' | 'carousel'>
    ) => {
      state.filterType = action.payload
    },
    setSelectedTemplates: (state, action: PayloadAction<string[]>) => {
      state.selectedTemplates = action.payload
    },
    toggleTemplateSelection: (state, action: PayloadAction<string>) => {
      const templateId = action.payload
      const index = state.selectedTemplates.indexOf(templateId)
      if (index === -1) {
        state.selectedTemplates.push(templateId)
      } else {
        state.selectedTemplates.splice(index, 1)
      }
    },
    clearSelection: state => {
      state.selectedTemplates = []
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
  setTemplates,
  addTemplate,
  updateTemplate,
  removeTemplate,
  updateTemplateImageOrder,
  setSearchTerm,
  setFilterType,
  setSelectedTemplates,
  toggleTemplateSelection,
  clearSelection,
  clearFilters,
} = templatesSlice.actions

export default templatesSlice.reducer
