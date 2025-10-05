import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  Campaign,
  CampaignFormData,
  ApiResponse,
  PaginatedResponse,
} from '@/types'

export const campaignsApi = createApi({
  reducerPath: 'campaignsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/campaigns',
    prepareHeaders: headers => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token')
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['Campaign'],
  endpoints: builder => ({
    getCampaigns: builder.query<
      PaginatedResponse<Campaign>,
      {
        workspaceId: string
        page?: number
        limit?: number
        status?: string
        search?: string
      }
    >({
      query: ({ workspaceId, page = 1, limit = 10, status, search }) => {
        const params = new URLSearchParams({
          workspaceId,
          page: page.toString(),
          limit: limit.toString(),
        })

        if (status) params.append('status', status)
        if (search) params.append('search', search)

        return `?${params.toString()}`
      },
      providesTags: ['Campaign'],
    }),

    getCampaign: builder.query<ApiResponse<Campaign>, string>({
      query: id => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Campaign', id }],
    }),

    createCampaign: builder.mutation<
      ApiResponse<Campaign>,
      CampaignFormData & { workspaceId: string }
    >({
      query: campaignData => ({
        url: '',
        method: 'POST',
        body: campaignData,
      }),
      invalidatesTags: ['Campaign'],
    }),

    updateCampaign: builder.mutation<
      ApiResponse<Campaign>,
      { id: string } & Partial<CampaignFormData>
    >({
      query: ({ id, ...patch }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Campaign', id }],
    }),

    deleteCampaign: builder.mutation<ApiResponse<void>, string>({
      query: id => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Campaign'],
    }),

    duplicateCampaign: builder.mutation<ApiResponse<Campaign>, string>({
      query: id => ({
        url: `/${id}/duplicate`,
        method: 'POST',
      }),
      invalidatesTags: ['Campaign'],
    }),
  }),
})

export const {
  useGetCampaignsQuery,
  useGetCampaignQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  useDuplicateCampaignMutation,
} = campaignsApi
