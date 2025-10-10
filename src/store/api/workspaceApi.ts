import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Workspace, WorkspaceFormData, ApiResponse } from '@/types'

export const workspaceApi = createApi({
  reducerPath: 'workspaceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/workspaces-simple', // Temporary: use simple endpoint
    prepareHeaders: (headers, { getState }) => {
      // Add auth token when available (not used in simple endpoint)
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
      query: () => {
        // Temporary: use known agency ID
        return '?agencyId=agency-1760035323771'
      },
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
        url: '?agencyId=agency-1760035323771', // Temporary: use known agency ID
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
        url: `/${id}?agencyId=agency-1760035323771`, // Temporary: use known agency ID
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
