import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Workspace, WorkspaceFormData, ApiResponse } from '@/types'

export const workspaceApi = createApi({
  reducerPath: 'workspaceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/workspaces',
    prepareHeaders: (headers, { getState }) => {
      // Add auth token when available
      const token = localStorage.getItem('auth_token')
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['Workspace'],
  endpoints: builder => ({
    // Get all workspaces for the current agency
    getWorkspaces: builder.query<ApiResponse<Workspace[]>, void>({
      query: () => '',
      providesTags: ['Workspace'],
    }),

    // Get a single workspace by ID
    getWorkspace: builder.query<ApiResponse<Workspace>, string>({
      query: id => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Workspace', id }],
    }),

    // Create a new workspace
    createWorkspace: builder.mutation<
      ApiResponse<Workspace>,
      WorkspaceFormData
    >({
      query: workspaceData => ({
        url: '',
        method: 'POST',
        body: workspaceData,
      }),
      invalidatesTags: ['Workspace'],
    }),

    // Update an existing workspace
    updateWorkspace: builder.mutation<
      ApiResponse<Workspace>,
      { id: string; data: Partial<WorkspaceFormData> }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Workspace', id }],
    }),

    // Delete a workspace
    deleteWorkspace: builder.mutation<ApiResponse<void>, string>({
      query: id => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Workspace'],
    }),
  }),
})

export const {
  useGetWorkspacesQuery,
  useGetWorkspaceQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
} = workspaceApi
