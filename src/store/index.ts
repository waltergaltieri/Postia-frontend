import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

// Import API slices
import { workspaceApi } from './api/workspaceApi'
import { resourcesApi } from './api/resourcesApi'
import { templatesApi } from './api/templatesApi'
import { campaignsApi } from './api/campaignsApi'
import { calendarApi } from './api/calendarApi'
// import { authApi } from './api/authApi'
// import { agencyApi } from './api/agencyApi'

// Import slices
import workspaceSlice from './slices/workspaceSlice'
import resourcesSlice from './slices/resourcesSlice'
import templatesSlice from './slices/templatesSlice'
import campaignsSlice from './slices/campaignsSlice'
import calendarSlice from './slices/calendarSlice'
// import authSlice from './slices/authSlice'
// import agencySlice from './slices/agencySlice'
// import uiSlice from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    // API slices
    [workspaceApi.reducerPath]: workspaceApi.reducer,
    [resourcesApi.reducerPath]: resourcesApi.reducer,
    [templatesApi.reducerPath]: templatesApi.reducer,
    [campaignsApi.reducerPath]: campaignsApi.reducer,
    [calendarApi.reducerPath]: calendarApi.reducer,
    // [authApi.reducerPath]: authApi.reducer,
    // [agencyApi.reducerPath]: agencyApi.reducer,
    // State slices
    workspace: workspaceSlice,
    resources: resourcesSlice,
    templates: templatesSlice,
    campaigns: campaignsSlice,
    calendar: calendarSlice,
    // auth: authSlice,
    // agency: agencySlice,
    // ui: uiSlice,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    })
      .concat(workspaceApi.middleware)
      .concat(resourcesApi.middleware)
      .concat(templatesApi.middleware)
      .concat(campaignsApi.middleware)
      .concat(calendarApi.middleware),
  // .concat(authApi.middleware)
  // .concat(agencyApi.middleware)
})

// Enable listener behavior for the store
setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
