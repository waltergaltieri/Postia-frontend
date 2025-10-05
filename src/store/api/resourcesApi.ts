import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Resource, ApiResponse, PaginatedResponse } from '@/types'

// Types for API requests
export interface CreateResourceRequest {
  workspaceId: string
  name: string
  file: File
}

export interface UpdateResourceRequest {
  id: string
  name: string
}

export interface GetResourcesRequest {
  workspaceId: string
  search?: string
  type?: 'image' | 'video'
  page?: number
  limit?: number
}

export interface UploadResourcesRequest {
  workspaceId: string
  files: { name: string; file: File }[]
}

export const resourcesApi = createApi({
  reducerPath: 'resourcesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/resources',
    prepareHeaders: (headers, { getState }) => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token')
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['Resource'],
  endpoints: builder => ({
    // Get resources for a workspace
    getResources: builder.query<
      PaginatedResponse<Resource>,
      GetResourcesRequest
    >({
      query: params => {
        const searchParams = new URLSearchParams({
          workspaceId: params.workspaceId,
          page: (params.page || 1).toString(),
          limit: (params.limit || 20).toString(),
        })

        if (params.search) searchParams.append('search', params.search)
        if (params.type) searchParams.append('type', params.type)

        return `?${searchParams.toString()}`
      },
      providesTags: result =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: 'Resource' as const,
                id,
              })),
              { type: 'Resource', id: 'LIST' },
            ]
          : [{ type: 'Resource', id: 'LIST' }],
    }),

    // Upload multiple resources
    uploadResources: builder.mutation<
      ApiResponse<Resource[]>,
      UploadResourcesRequest
    >({
      query: params => {
        const formData = new FormData()
        formData.append('workspaceId', params.workspaceId)

        params.files.forEach(fileData => {
          formData.append('files', fileData.file)
        })

        return {
          url: '',
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: [{ type: 'Resource', id: 'LIST' }],
    }),

    // Update resource
    updateResource: builder.mutation<
      ApiResponse<Resource>,
      UpdateResourceRequest
    >({
      query: ({ id, name }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: { name },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Resource', id }],
    }),

    // Delete resource
    deleteResource: builder.mutation<ApiResponse<void>, string>({
      query: resourceId => ({
        url: `/${resourceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, resourceId) => [
        { type: 'Resource', id: resourceId },
        { type: 'Resource', id: 'LIST' },
      ],
    }),

    // Get single resource
    getResource: builder.query<ApiResponse<Resource>, string>({
      query: resourceId => `/${resourceId}`,
      providesTags: (result, error, resourceId) => [
        { type: 'Resource', id: resourceId },
      ],
    }),
  }),
})

export const {
  useGetResourcesQuery,
  useUploadResourcesMutation,
  useUpdateResourceMutation,
  useDeleteResourceMutation,
  useGetResourceQuery,
} = resourcesApi
