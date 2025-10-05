import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  Publication,
  ApiResponse,
  SocialNetwork,
  CalendarFilters,
} from '@/types'

export interface PublicationUpdateData {
  content?: string
  scheduledDate?: Date
  status?: Publication['status']
}

export interface RescheduleData {
  publicationId: string
  newDate: Date
}

export const calendarApi = createApi({
  reducerPath: 'calendarApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/calendar',
    prepareHeaders: headers => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token')
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['Publication', 'Calendar'],
  endpoints: builder => ({
    getPublications: builder.query<
      ApiResponse<Publication[]>,
      {
        workspaceId: string
        startDate?: Date
        endDate?: Date
        filters?: CalendarFilters
      }
    >({
      query: ({ workspaceId, startDate, endDate, filters }) => {
        const params = new URLSearchParams({
          workspaceId,
        })

        if (startDate) params.append('startDate', startDate.toISOString())
        if (endDate) params.append('endDate', endDate.toISOString())
        if (filters?.campaignId) params.append('campaignId', filters.campaignId)
        if (filters?.socialNetwork)
          params.append('socialNetwork', filters.socialNetwork)
        if (filters?.status) params.append('status', filters.status)

        return `?${params.toString()}`
      },
      providesTags: ['Publication', 'Calendar'],
    }),

    getPublication: builder.query<ApiResponse<Publication>, string>({
      query: id => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Publication', id }],
    }),

    updatePublication: builder.mutation<
      ApiResponse<Publication>,
      { id: string } & PublicationUpdateData
    >({
      query: ({ id, ...updateData }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: updateData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Publication', id },
        'Calendar',
      ],
    }),

    publishNow: builder.mutation<ApiResponse<Publication>, string>({
      query: publicationId => ({
        url: `/${publicationId}/publish`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Publication', id },
        'Calendar',
      ],
    }),

    reschedulePublication: builder.mutation<
      ApiResponse<Publication>,
      RescheduleData
    >({
      query: ({ publicationId, newDate }) => ({
        url: `/${publicationId}/reschedule`,
        method: 'POST',
        body: { scheduledDate: newDate.toISOString() },
      }),
      invalidatesTags: (result, error, { publicationId }) => [
        { type: 'Publication', id: publicationId },
        'Calendar',
      ],
    }),

    cancelPublication: builder.mutation<ApiResponse<Publication>, string>({
      query: publicationId => ({
        url: `/${publicationId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Publication', id },
        'Calendar',
      ],
    }),

    regeneratePublication: builder.mutation<
      ApiResponse<Publication>,
      { id: string; newPrompt?: string }
    >({
      query: ({ id, newPrompt }) => ({
        url: `/${id}/regenerate`,
        method: 'POST',
        body: newPrompt ? { prompt: newPrompt } : {},
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Publication', id },
        'Calendar',
      ],
    }),
  }),
})

export const {
  useGetPublicationsQuery,
  useGetPublicationQuery,
  useUpdatePublicationMutation,
  usePublishNowMutation,
  useReschedulePublicationMutation,
  useCancelPublicationMutation,
  useRegeneratePublicationMutation,
} = calendarApi
