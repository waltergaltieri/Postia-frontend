import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  Template,
  ApiResponse,
  PaginatedResponse,
  SocialNetwork,
} from '@/types'

// Types for API requests
export interface CreateTemplateRequest {
  workspaceId: string
  name: string
  type: 'single' | 'carousel'
  socialNetworks: SocialNetwork[]
  images: { name: string; file: File; dataUrl?: string }[]
}

export interface UpdateTemplateRequest {
  id: string
  name?: string
  socialNetworks?: SocialNetwork[]
  images?: string[]
}

export interface GetTemplatesRequest {
  workspaceId: string
  search?: string
  type?: 'single' | 'carousel'
  page?: number
  limit?: number
}

export interface UpdateTemplateImageOrderRequest {
  templateId: string
  images: string[]
}

export const templatesApi = createApi({
  reducerPath: 'templatesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/templates',
    prepareHeaders: (headers, { getState }) => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token')
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['Template'],
  endpoints: builder => ({
    // Get templates for a workspace
    getTemplates: builder.query<
      PaginatedResponse<Template>,
      GetTemplatesRequest
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
                type: 'Template' as const,
                id,
              })),
              { type: 'Template', id: 'LIST' },
            ]
          : [{ type: 'Template', id: 'LIST' }],
    }),

    // Create template
    createTemplate: builder.mutation<
      ApiResponse<Template>,
      CreateTemplateRequest
    >({
      query: params => ({
        url: '',
        method: 'POST',
        body: {
          workspaceId: params.workspaceId,
          name: params.name,
          type: params.type,
          socialNetworks: params.socialNetworks,
          images: params.images.map(img => ({
            name: img.name,
            dataUrl: img.dataUrl
          })),
        },
      }),
      invalidatesTags: [{ type: 'Template', id: 'LIST' }],
    }),

    // Update template
    updateTemplate: builder.mutation<
      ApiResponse<Template>,
      UpdateTemplateRequest
    >({
      query: ({ id, ...updateData }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: updateData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Template', id }],
    }),

    // Update template image order
    updateTemplateImageOrder: builder.mutation<
      ApiResponse<Template>,
      UpdateTemplateImageOrderRequest
    >({
      query: ({ templateId, images }) => ({
        url: `/${templateId}`,
        method: 'PATCH',
        body: { images },
      }),
      invalidatesTags: (result, error, { templateId }) => [
        { type: 'Template', id: templateId },
      ],
    }),

    // Delete template
    deleteTemplate: builder.mutation<ApiResponse<void>, string>({
      query: templateId => ({
        url: `/${templateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, templateId) => [
        { type: 'Template', id: templateId },
        { type: 'Template', id: 'LIST' },
      ],
    }),

    // Get single template
    getTemplate: builder.query<ApiResponse<Template>, string>({
      query: templateId => `/${templateId}`,
      providesTags: (result, error, templateId) => [
        { type: 'Template', id: templateId },
      ],
    }),
  }),
})

export const {
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useUpdateTemplateImageOrderMutation,
  useDeleteTemplateMutation,
  useGetTemplateQuery,
} = templatesApi
