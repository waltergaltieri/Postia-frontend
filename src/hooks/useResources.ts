import { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store'
import {
  useGetResourcesQuery,
  useUploadResourcesMutation,
  useUpdateResourceMutation,
  useDeleteResourceMutation,
  GetResourcesRequest,
} from '@/store/api/resourcesApi'
import {
  setSearchTerm,
  setFilterType,
  setSelectedResources,
  toggleResourceSelection,
  clearSelection,
  clearFilters,
} from '@/store/slices/resourcesSlice'
import toast from 'react-hot-toast'

export function useResources(workspaceId: string) {
  const dispatch = useDispatch()
  const { searchTerm, filterType, selectedResources } = useSelector(
    (state: RootState) => state.resources
  )

  // Build query parameters
  const queryParams: GetResourcesRequest = useMemo(
    () => ({
      workspaceId,
      ...(searchTerm && { search: searchTerm }),
      ...(filterType !== 'all' && { type: filterType }),
      page: 1,
      limit: 50,
    }),
    [workspaceId, searchTerm, filterType]
  )

  // API hooks
  const {
    data: resourcesResponse,
    isLoading,
    error,
    refetch,
  } = useGetResourcesQuery(queryParams)

  const [uploadResources, { isLoading: isUploading }] =
    useUploadResourcesMutation()
  const [updateResource, { isLoading: isUpdating }] =
    useUpdateResourceMutation()
  const [deleteResource, { isLoading: isDeleting }] =
    useDeleteResourceMutation()

  // Extract resources from response
  const resources = resourcesResponse?.data || []
  const pagination = resourcesResponse?.pagination

  // Filtered resources based on local state
  const filteredResources = useMemo(() => {
    let filtered = resources

    if (searchTerm) {
      filtered = filtered.filter(resource =>
        resource.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(resource => resource.type === filterType)
    }

    return filtered
  }, [resources, searchTerm, filterType])

  // Actions
  const handleSearch = useCallback(
    (term: string) => {
      dispatch(setSearchTerm(term))
    },
    [dispatch]
  )

  const handleFilterChange = useCallback(
    (type: 'all' | 'image' | 'video') => {
      dispatch(setFilterType(type))
    },
    [dispatch]
  )

  const handleResourceSelect = useCallback(
    (resourceId: string) => {
      dispatch(toggleResourceSelection(resourceId))
    },
    [dispatch]
  )

  const handleSetSelectedResources = useCallback(
    (resourceIds: string[]) => {
      dispatch(setSelectedResources(resourceIds))
    },
    [dispatch]
  )

  const handleClearSelection = useCallback(() => {
    dispatch(clearSelection())
  }, [dispatch])

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters())
  }, [dispatch])

  const handleUploadResources = useCallback(
    async (files: { name: string; file: File }[]) => {
      try {
        const result = await uploadResources({ workspaceId, files }).unwrap()
        toast.success(result.message)
        return result.data
      } catch (error: any) {
        const message = error?.data?.message || 'Error al subir recursos'
        toast.error(message)
        throw error
      }
    },
    [uploadResources, workspaceId]
  )

  const handleUpdateResource = useCallback(
    async (id: string, name: string) => {
      try {
        const result = await updateResource({ id, name }).unwrap()
        toast.success(result.message)
        return result.data
      } catch (error: any) {
        const message = error?.data?.message || 'Error al actualizar recurso'
        toast.error(message)
        throw error
      }
    },
    [updateResource]
  )

  const handleDeleteResource = useCallback(
    async (id: string) => {
      try {
        const result = await deleteResource(id).unwrap()
        toast.success(result.message)

        // Clear selection if deleted resource was selected
        if (selectedResources.includes(id)) {
          dispatch(
            setSelectedResources(
              selectedResources.filter(resId => resId !== id)
            )
          )
        }
      } catch (error: any) {
        const message = error?.data?.message || 'Error al eliminar recurso'
        toast.error(message)
        throw error
      }
    },
    [deleteResource, selectedResources, dispatch]
  )

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // Computed values
  const hasResources = resources.length > 0
  const hasFilteredResources = filteredResources.length > 0
  const hasSelection = selectedResources.length > 0
  const hasFilters = searchTerm !== '' || filterType !== 'all'

  return {
    // Data
    resources: filteredResources,
    allResources: resources,
    pagination,
    selectedResources,

    // State
    searchTerm,
    filterType,
    isLoading,
    isUploading,
    isUpdating,
    isDeleting,
    error,

    // Computed
    hasResources,
    hasFilteredResources,
    hasSelection,
    hasFilters,

    // Actions
    handleSearch,
    handleFilterChange,
    handleResourceSelect,
    handleSetSelectedResources,
    handleClearSelection,
    handleClearFilters,
    handleUploadResources,
    handleUpdateResource,
    handleDeleteResource,
    handleRefresh,
  }
}
