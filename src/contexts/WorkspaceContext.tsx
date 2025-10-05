'use client'

import { createContext, useContext, ReactNode, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Workspace } from '@/types'
import {
  useGetWorkspacesQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
} from '@/store/api/workspaceApi'
import {
  setCurrentWorkspace,
  selectCurrentWorkspace,
  selectWorkspaces,
  selectWorkspaceLoading,
} from '@/store/slices/workspaceSlice'
import type { AppDispatch } from '@/store'

interface WorkspaceContextType {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  isLoading: boolean
  setCurrentWorkspace: (workspace: Workspace | null) => void
  switchWorkspace: (workspaceId: string) => void
  createWorkspace: (data: any) => Promise<any>
  updateWorkspace: (workspaceId: string, updates: any) => Promise<any>
  removeWorkspace: (workspaceId: string) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
)

interface WorkspaceProviderProps {
  children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const dispatch = useDispatch<AppDispatch>()

  // Redux selectors
  const currentWorkspace = useSelector(selectCurrentWorkspace)
  const workspaces = useSelector(selectWorkspaces)
  const isLoading = useSelector(selectWorkspaceLoading)

  // RTK Query hooks
  const { data: workspacesData, isLoading: isLoadingWorkspaces } =
    useGetWorkspacesQuery()
  const [createWorkspaceMutation] = useCreateWorkspaceMutation()
  const [updateWorkspaceMutation] = useUpdateWorkspaceMutation()
  const [deleteWorkspaceMutation] = useDeleteWorkspaceMutation()

  // Load workspaces and restore current workspace from localStorage
  useEffect(() => {
    if (workspacesData?.data && workspacesData.data.length > 0) {
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId')
      if (savedWorkspaceId) {
        const workspace = workspacesData.data.find(
          w => w.id === savedWorkspaceId
        )
        if (workspace) {
          dispatch(setCurrentWorkspace(workspace))
        }
      }
    }
  }, [workspacesData, dispatch, isLoadingWorkspaces])

  const handleSetCurrentWorkspace = useCallback((workspace: Workspace | null) => {
    dispatch(setCurrentWorkspace(workspace))
    if (workspace) {
      localStorage.setItem('currentWorkspaceId', workspace.id)
    } else {
      localStorage.removeItem('currentWorkspaceId')
    }
  }, [dispatch])

  const switchWorkspace = useCallback((workspaceId: string) => {
    // Look in the RTK Query data first
    let workspace = workspacesData?.data?.find(w => w.id === workspaceId)
    
    // Fallback to Redux store data
    if (!workspace) {
      workspace = workspaces.find(w => w.id === workspaceId)
    }
    
    if (workspace) {
      handleSetCurrentWorkspace(workspace)
    }
  }, [workspacesData?.data, workspaces, handleSetCurrentWorkspace])

  const createWorkspace = async (data: any) => {
    try {
      const result = await createWorkspaceMutation(data).unwrap()
      // The workspace will be automatically added to the list via RTK Query cache invalidation
      return result
    } catch (error) {
      console.error('Error creating workspace:', error)
      throw error
    }
  }

  const updateWorkspace = async (workspaceId: string, updates: any) => {
    try {
      const result = await updateWorkspaceMutation({
        id: workspaceId,
        data: updates,
      }).unwrap()
      // The workspace will be automatically updated via RTK Query cache invalidation
      return result
    } catch (error) {
      console.error('Error updating workspace:', error)
      throw error
    }
  }

  const removeWorkspace = async (workspaceId: string) => {
    try {
      await deleteWorkspaceMutation(workspaceId).unwrap()

      // Clear current workspace if it's the one being removed
      if (currentWorkspace?.id === workspaceId) {
        handleSetCurrentWorkspace(null)
      }
    } catch (error) {
      console.error('Error deleting workspace:', error)
      throw error
    }
  }

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces: workspacesData?.data || [],
    isLoading: isLoadingWorkspaces || isLoading,
    setCurrentWorkspace: handleSetCurrentWorkspace,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    removeWorkspace,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
