import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store'
import {
  setSearchTerm,
  setFilterType,
  toggleTemplateSelection,
  setSelectedTemplates,
  clearSelection,
  clearFilters,
} from '@/store/slices/templatesSlice'
import {
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useUpdateTemplateImageOrderMutation,
  useDeleteTemplateMutation,
  useGetTemplateQuery,
} from '@/store/api/templatesApi'
import { SocialNetwork } from '@/types'

export function useTemplates(workspaceId: string) {
  const dispatch = useDispatch()
  const {
    searchTerm,
    filterType,
    selectedTemplates,
    loading: storeLoading,
    error: storeError,
  } = useSelector((state: RootState) => state.templates)

  // API queries and mutations
  const {
    data: templatesResponse,
    isLoading: queryLoading,
    error: queryError,
    refetch,
  } = useGetTemplatesQuery({
    workspaceId,
    search: searchTerm || undefined,
    type: filterType !== 'all' ? filterType : undefined,
  })

  const [createTemplate, { isLoading: isCreating }] =
    useCreateTemplateMutation()
  const [updateTemplate, { isLoading: isUpdating }] =
    useUpdateTemplateMutation()
  const [updateImageOrder, { isLoading: isUpdatingOrder }] =
    useUpdateTemplateImageOrderMutation()
  const [deleteTemplate, { isLoading: isDeleting }] =
    useDeleteTemplateMutation()

  // Computed values
  const templates = templatesResponse?.data || []
  const isLoading =
    queryLoading ||
    storeLoading ||
    isCreating ||
    isUpdating ||
    isDeleting ||
    isUpdatingOrder
  const error = queryError || storeError

  // Filter templates based on current filters (client-side filtering as fallback)
  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      !searchTerm ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || template.type === filterType
    return matchesSearch && matchesType
  })

  // Actions
  const handleSearchChange = (term: string) => {
    dispatch(setSearchTerm(term))
  }

  const handleFilterChange = (type: 'all' | 'single' | 'carousel') => {
    dispatch(setFilterType(type))
  }

  const handleTemplateSelect = (templateId: string) => {
    dispatch(toggleTemplateSelection(templateId))
  }

  const handleSetSelectedTemplates = (templateIds: string[]) => {
    dispatch(setSelectedTemplates(templateIds))
  }

  const handleClearSelection = () => {
    dispatch(clearSelection())
  }

  const handleClearFilters = () => {
    dispatch(clearFilters())
  }

  // Template operations
  const handleCreateTemplate = async (data: {
    name: string
    type: 'single' | 'carousel'
    socialNetworks: SocialNetwork[]
    images: { name: string; file: File }[]
  }) => {
    return await createTemplate({
      workspaceId,
      ...data,
    }).unwrap()
  }

  const handleUpdateTemplate = async (
    templateId: string,
    data: {
      name?: string
      socialNetworks?: SocialNetwork[]
      images?: string[]
    }
  ) => {
    return await updateTemplate({
      id: templateId,
      ...data,
    }).unwrap()
  }

  const handleUpdateImageOrder = async (
    templateId: string,
    images: string[]
  ) => {
    return await updateImageOrder({
      templateId,
      images,
    }).unwrap()
  }

  const handleDeleteTemplate = async (templateId: string) => {
    return await deleteTemplate(templateId).unwrap()
  }

  const handleRefresh = () => {
    refetch()
  }

  return {
    // Data
    templates: filteredTemplates,
    allTemplates: templates,
    selectedTemplates,
    searchTerm,
    filterType,

    // State
    isLoading,
    error,

    // Actions
    handleSearchChange,
    handleFilterChange,
    handleTemplateSelect,
    handleSetSelectedTemplates,
    handleClearSelection,
    handleClearFilters,

    // Operations
    handleCreateTemplate,
    handleUpdateTemplate,
    handleUpdateImageOrder,
    handleDeleteTemplate,
    handleRefresh,

    // Loading states
    isCreating,
    isUpdating,
    isUpdatingOrder,
    isDeleting,
  }
}

export function useTemplate(templateId: string) {
  const {
    data: templateResponse,
    isLoading,
    error,
    refetch,
  } = useGetTemplateQuery(templateId)

  return {
    template: templateResponse?.data,
    isLoading,
    error,
    refetch,
  }
}
