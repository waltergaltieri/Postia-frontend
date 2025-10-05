'use client'

import { WorkspaceLayout } from '@/layouts'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  Button,
  MetricCard,
  ChartContainer,
  QuickActionCard,
} from '@/components/common'
import {
  HiChartPie,
  HiCalendar,
  HiTemplate,
  HiPhotograph,
  HiPlus,
  HiTrendingUp,
  HiUsers,
  HiCog,
} from 'react-icons/hi'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'react-hot-toast'

export default function WorkspaceDashboardPage() {
  const params = useParams()
  const workspaceId = params.id as string
  const { currentWorkspace, switchWorkspace, workspaces } = useWorkspace()

  // Ensure we have the correct workspace selected
  useEffect(() => {
    if (workspaceId && workspaces.length > 0) {
      if (!currentWorkspace || currentWorkspace.id !== workspaceId) {
        const workspace = workspaces.find(w => w.id === workspaceId)
        if (workspace) {
          switchWorkspace(workspaceId)
        }
      }
    }
  }, [workspaceId, currentWorkspace?.id, workspaces, switchWorkspace])

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">
            Cargando espacio de trabajo...
          </p>
        </div>
      </div>
    )
  }

  const handleCreateCampaign = () => {
    toast(
      'Funcionalidad de crear campaña se implementará en tareas posteriores',
      {
        icon: 'ℹ️',
      }
    )
  }

  const handleUploadResource = () => {
    toast(
      'Funcionalidad de subir recursos se implementará en tareas posteriores',
      {
        icon: 'ℹ️',
      }
    )
  }

  const handleCreateTemplate = () => {
    toast(
      'Funcionalidad de crear templates se implementará en tareas posteriores',
      {
        icon: 'ℹ️',
      }
    )
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId}>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900">
              Dashboard - {currentWorkspace.name}
            </h1>
            <p className="text-secondary-600 mt-2">
              {currentWorkspace.branding.description}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-secondary-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">
                    Campañas
                  </p>
                  <p className="text-2xl font-bold text-secondary-900">0</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-secondary-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">
                    Recursos
                  </p>
                  <p className="text-2xl font-bold text-secondary-900">0</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-secondary-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg
                    className="h-6 w-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">
                    Templates
                  </p>
                  <p className="text-2xl font-bold text-secondary-900">0</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-secondary-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg
                    className="h-6 w-6 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">
                    Publicaciones
                  </p>
                  <p className="text-2xl font-bold text-secondary-900">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 mb-8">
            <div className="px-6 py-4 border-b border-secondary-200">
              <h2 className="text-xl font-semibold text-secondary-900">
                Acciones Rápidas
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={handleCreateCampaign}
                  className="h-20 flex-col"
                  variant="secondary"
                >
                  <svg
                    className="h-6 w-6 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Crear Campaña
                </Button>

                <Button
                  onClick={handleUploadResource}
                  className="h-20 flex-col"
                  variant="secondary"
                >
                  <svg
                    className="h-6 w-6 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Subir Recurso
                </Button>

                <Button
                  onClick={handleCreateTemplate}
                  className="h-20 flex-col"
                  variant="secondary"
                >
                  <svg
                    className="h-6 w-6 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  Crear Template
                </Button>
              </div>
            </div>
          </div>

          {/* Workspace Branding Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
            <div className="px-6 py-4 border-b border-secondary-200">
              <h2 className="text-xl font-semibold text-secondary-900">
                Configuración de Branding
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-4">
                    Información General
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-secondary-500">
                        Nombre
                      </dt>
                      <dd className="text-sm text-secondary-900">
                        {currentWorkspace.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-secondary-500">
                        Eslogan
                      </dt>
                      <dd className="text-sm text-secondary-900">
                        {currentWorkspace.branding.slogan}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-secondary-500">
                        Descripción
                      </dt>
                      <dd className="text-sm text-secondary-900">
                        {currentWorkspace.branding.description}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-secondary-500">
                        WhatsApp
                      </dt>
                      <dd className="text-sm text-secondary-900">
                        {currentWorkspace.branding.whatsapp}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-4">
                    Colores de Marca
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-full border border-secondary-300"
                        style={{
                          backgroundColor:
                            currentWorkspace.branding.primaryColor,
                        }}
                      ></div>
                      <div>
                        <p className="text-sm font-medium text-secondary-900">
                          Color Primario
                        </p>
                        <p className="text-sm text-secondary-500">
                          {currentWorkspace.branding.primaryColor}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-full border border-secondary-300"
                        style={{
                          backgroundColor:
                            currentWorkspace.branding.secondaryColor,
                        }}
                      ></div>
                      <div>
                        <p className="text-sm font-medium text-secondary-900">
                          Color Secundario
                        </p>
                        <p className="text-sm text-secondary-500">
                          {currentWorkspace.branding.secondaryColor}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Development Notice */}
          <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              ✅ Layout del Workspace Implementado
            </h3>
            <p className="text-blue-700 text-sm">
              El sistema de navegación y breadcrumbs está funcionando
              correctamente. Las funcionalidades específicas de cada sección se
              implementarán en las siguientes tareas.
            </p>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
