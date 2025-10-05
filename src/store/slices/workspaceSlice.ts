import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Workspace } from '@/types'

interface WorkspaceState {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  loading: boolean
  error: string | null
}

const initialState: WorkspaceState = {
  workspaces: [],
  currentWorkspace: null,
  loading: false,
  error: null,
}

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.workspaces = action.payload
      state.loading = false
      state.error = null
    },
    addWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.workspaces.push(action.payload)
    },
    updateWorkspace: (state, action: PayloadAction<Workspace>) => {
      const index = state.workspaces.findIndex(w => w.id === action.payload.id)
      if (index !== -1) {
        state.workspaces[index] = action.payload
      }
      if (state.currentWorkspace?.id === action.payload.id) {
        state.currentWorkspace = action.payload
      }
    },
    removeWorkspace: (state, action: PayloadAction<string>) => {
      state.workspaces = state.workspaces.filter(w => w.id !== action.payload)
      if (state.currentWorkspace?.id === action.payload) {
        state.currentWorkspace = null
      }
    },
    setCurrentWorkspace: (state, action: PayloadAction<Workspace | null>) => {
      state.currentWorkspace = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.loading = false
    },
    clearError: state => {
      state.error = null
    },
  },
})

export const {
  setWorkspaces,
  addWorkspace,
  updateWorkspace,
  removeWorkspace,
  setCurrentWorkspace,
  setLoading,
  setError,
  clearError,
} = workspaceSlice.actions

export default workspaceSlice.reducer

// Selectors
export const selectWorkspaces = (state: { workspace: WorkspaceState }) =>
  state.workspace.workspaces
export const selectCurrentWorkspace = (state: { workspace: WorkspaceState }) =>
  state.workspace.currentWorkspace
export const selectWorkspaceLoading = (state: { workspace: WorkspaceState }) =>
  state.workspace.loading
export const selectWorkspaceError = (state: { workspace: WorkspaceState }) =>
  state.workspace.error
