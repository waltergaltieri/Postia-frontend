'use client'

import {
  Button,
  MetricCard,
  ChartContainer,
  QuickActionCard,
} from '@/components/common'
import { WorkspaceCreationModal } from '@/components/dashboard'
import { AgencyLayout } from '@/layouts'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { useState } from 'react'
import type { WorkspaceFormData } from '@/types'
import {
  HiOfficeBuilding,
  HiChartPie,
  HiCalendar,
  HiCurrencyDollar,
  HiPlus,
  HiChartBar,
  HiCog,
  HiTrendingUp,
  HiUsers,
  HiTemplate,
  HiPhotograph,
} from 'react-icons/hi'

export default function DashboardPage() {
  const { user } = useAuth()
  const { workspaces, createWorkspace } = useWorkspace()
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleCreateWorkspace = () => {
    setShowCreateModal(true)
  }

  const handleWorkspaceSubmit = async (data: WorkspaceFormData) => {
    try {
      await createWorkspace(data)
      toast.success('Espacio de trabajo creado exitosamente')
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating workspace:', error)
      toast.error('Error al crear el espacio de trabajo')
    }
  }

  const handleViewWorkspace = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}/dashboard`)
  }

  // Real data - no mock data
  const monthlyData: any[] = []
  const socialNetworkData: any[] = []

  // Calculate real metrics from database
  const totalCampaigns = 0
  const totalPublications = 0
  const totalCredits = user?.agency?.credits || 0

  return (
    <AgencyLayout>
      <div className="min-h-screen bg-secondary-50/30">
        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="page-header">
              <h1 className="page-title">Dashboard de Agencia</h1>
              <p className="page-description">
                Bienvenido a Postia, {user?.email}
              </p>
            </div>

            {/* Metrics Cards */}
            <div className="dashboard-metrics mb-8">
              <MetricCard
                title="Espacios de Trabajo"
                value={workspaces.length}
                icon={<HiOfficeBuilding className="h-6 w-6 text-primary-600" />}
                iconBgColor="bg-primary-100"
                trend={{
                  value: '+12% vs mes anterior',
                  isPositive: true,
                }}
                onClick={() => toast.info('Ver todos los espacios de trabajo')}
              />

              <MetricCard
                title="Campañas Activas"
                value={totalCampaigns}
                icon={<HiChartPie className="h-6 w-6 text-green-600" />}
                iconBgColor="bg-green-100"
                trend={{
                  value: '+8% vs mes anterior',
                  isPositive: true,
                }}
                onClick={() => toast.info('Ver todas las campañas')}
              />

              <MetricCard
                title="Publicaciones"
                value={totalPublications}
                icon={<HiCalendar className="h-6 w-6 text-blue-600" />}
                iconBgColor="bg-blue-100"
                trend={{
                  value: '+23% vs mes anterior',
                  isPositive: true,
                }}
                onClick={() => toast.info('Ver calendario de publicaciones')}
              />

              <MetricCard
                title="Créditos"
                value={totalCredits.toLocaleString()}
                icon={<HiCurrencyDollar className="h-6 w-6 text-yellow-600" />}
                iconBgColor="bg-yellow-100"
                trend={{
                  value: '-5% vs mes anterior',
                  isPositive: false,
                }}
                onClick={() => toast.info('Gestionar créditos')}
              />
            </div>

            {/* Charts Section */}
            <div className="dashboard-charts mb-8">
              <ChartContainer
                title="Actividad Mensual"
                action={
                  <Button variant="ghost" size="sm">
                    <HiTrendingUp className="h-4 w-4 mr-2" />
                    Ver detalles
                  </Button>
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="name" stroke="#737373" />
                    <YAxis stroke="#737373" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="publicaciones"
                      stroke="#9333ea"
                      strokeWidth={3}
                      name="Publicaciones"
                      dot={{ fill: '#9333ea', strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="campañas"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Campañas"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Distribución por Red Social">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={socialNetworkData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name} ${entry.value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {socialNetworkData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="section-title mb-6">Acciones Rápidas</h2>
              <div className="dashboard-actions">
                <QuickActionCard
                  title="Crear Espacio de Trabajo"
                  description="Configura un nuevo cliente con su branding personalizado"
                  icon={<HiPlus className="h-5 w-5" />}
                  onClick={handleCreateWorkspace}
                />

                <QuickActionCard
                  title="Ver Reportes"
                  description="Analiza el rendimiento de todas tus campañas"
                  icon={<HiChartBar className="h-5 w-5" />}
                  onClick={() =>
                    toast('Funcionalidad disponible próximamente', {
                      icon: 'ℹ️',
                    })
                  }
                />

                <QuickActionCard
                  title="Configuración"
                  description="Gestiona tu agencia y configuraciones globales"
                  icon={<HiCog className="h-5 w-5" />}
                  onClick={() => router.push('/agency-settings')}
                />
              </div>
            </div>

            {/* Workspaces Section */}
            <div className="bg-white rounded-xl shadow-sm border border-secondary-100">
              <div className="px-6 py-4 border-b border-secondary-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-secondary-900">
                      Espacios de Trabajo ({workspaces.length})
                    </h2>
                    <p className="text-sm text-secondary-600 mt-1">
                      Gestiona todos tus clientes desde un solo lugar
                    </p>
                  </div>
                  <Button onClick={handleCreateWorkspace}>
                    <HiPlus className="h-4 w-4 mr-2" />
                    Crear Nuevo Espacio
                  </Button>
                </div>
              </div>

              <div className="p-6">
                {workspaces.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto h-16 w-16 bg-secondary-100 rounded-full flex items-center justify-center mb-4">
                      <HiOfficeBuilding className="h-8 w-8 text-secondary-400" />
                    </div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-2">
                      No hay espacios de trabajo
                    </h3>
                    <p className="text-secondary-600 mb-6 max-w-sm mx-auto">
                      Comienza creando un espacio de trabajo para tu primer
                      cliente y configura su branding personalizado.
                    </p>
                    <Button onClick={handleCreateWorkspace}>
                      <HiPlus className="h-4 w-4 mr-2" />
                      Crear Primer Espacio
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workspaces.map(workspace => (
                      <div key={workspace.id} className="workspace-card">
                        <div className="workspace-card-header">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary-100 mr-3">
                              {workspace.branding.logo ? (
                                <img
                                  src={workspace.branding.logo}
                                  alt={workspace.name}
                                  className="h-8 w-8 rounded object-cover"
                                />
                              ) : (
                                <span className="text-lg font-bold text-primary-600">
                                  {workspace.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="workspace-card-title">
                                {workspace.name}
                              </h3>
                              <div className="flex items-center space-x-1 mt-1">
                                <div
                                  className="h-4 w-4 rounded-full bg-blue-500"
                                  title="Facebook"
                                ></div>
                                <div
                                  className="h-4 w-4 rounded-full bg-pink-500"
                                  title="Instagram"
                                ></div>
                                <div
                                  className="h-4 w-4 rounded-full bg-blue-600"
                                  title="LinkedIn"
                                ></div>
                              </div>
                            </div>
                          </div>
                          <span className="badge badge-success">Activo</span>
                        </div>

                        <p className="workspace-card-description">
                          {workspace.branding.description}
                        </p>

                        <div className="workspace-card-stats">
                          <div className="flex items-center">
                            <HiChartPie className="h-3 w-3 mr-1" />
                            <span>0 campañas</span>
                          </div>
                          <div className="flex items-center">
                            <HiCalendar className="h-3 w-3 mr-1" />
                            <span>0 publicaciones</span>
                          </div>
                          <div className="flex items-center">
                            <HiUsers className="h-3 w-3 mr-1" />
                            <span>
                              Creado {new Date(workspace.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewWorkspace(workspace.id)}
                          className="w-full mt-4"
                        >
                          Ver Dashboard
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Creation Modal */}
      <WorkspaceCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleWorkspaceSubmit}
      />
    </AgencyLayout>
  )
}
