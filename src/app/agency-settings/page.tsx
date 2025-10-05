'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AgencyLayout } from '@/layouts'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Input, MetricCard } from '@/components/common'
import { toast } from 'react-hot-toast'
import {
  HiUser,
  HiCreditCard,
  HiChartBar,
  HiCog,
  HiSave,
  HiRefresh,
  HiExclamationCircle,
  HiCheckCircle,
  HiCurrencyDollar,
  HiTrendingUp,
  HiCalendar,
  HiGlobe,
  HiBell,
  HiMail,
} from 'react-icons/hi'
import type { Agency, AgencySettings } from '@/types'

const agencyProfileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  settings: z.object({
    notifications: z.boolean(),
    timezone: z.string(),
    language: z.string(),
  }),
})

type AgencyProfileFormData = z.infer<typeof agencyProfileSchema>

// Mock agency data - in a real app this would come from an API
const mockAgencyData: Agency = {
  id: 'agency_1',
  name: 'Mi Agencia Digital',
  email: 'admin@postia.com',
  credits: 2500,
  plan: 'pro',
  settings: {
    notifications: true,
    timezone: 'America/Mexico_City',
    language: 'es',
  },
}

// Mock usage data
const mockUsageData = {
  currentMonth: {
    publicationsGenerated: 145,
    creditsUsed: 1250,
    campaignsCreated: 8,
    workspacesActive: 5,
  },
  lastMonth: {
    publicationsGenerated: 132,
    creditsUsed: 1100,
    campaignsCreated: 6,
    workspacesActive: 4,
  },
  creditHistory: [
    {
      date: '2024-01-01',
      amount: 5000,
      type: 'purchase',
      description: 'Compra de créditos - Plan Pro',
    },
    {
      date: '2024-01-15',
      amount: -450,
      type: 'usage',
      description: 'Generación de contenido - Campaña "Verano 2024"',
    },
    {
      date: '2024-01-20',
      amount: -320,
      type: 'usage',
      description: 'Generación de contenido - Campaña "Promoción Especial"',
    },
    {
      date: '2024-02-01',
      amount: -480,
      type: 'usage',
      description: 'Generación de contenido - Múltiples campañas',
    },
  ],
}

const timezoneOptions = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
]

const languageOptions = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
]

export default function AgencySettingsPage() {
  const { user } = useAuth()
  const [agencyData, setAgencyData] = useState<Agency>(mockAgencyData)
  const [usageData, setUsageData] = useState(mockUsageData)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'credits' | 'usage'>(
    'profile'
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
  } = useForm<AgencyProfileFormData>({
    resolver: zodResolver(agencyProfileSchema),
    defaultValues: {
      name: agencyData.name,
      email: agencyData.email,
      settings: agencyData.settings,
    },
  })

  // Initialize form with agency data
  useEffect(() => {
    reset({
      name: agencyData.name,
      email: agencyData.email,
      settings: agencyData.settings,
    })
  }, [agencyData, reset])

  const handleProfileSubmit = async (data: AgencyProfileFormData) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      const updatedAgency: Agency = {
        ...agencyData,
        name: data.name,
        email: data.email,
        settings: data.settings,
      }

      setAgencyData(updatedAgency)
      toast.success('Perfil de agencia actualizado exitosamente')
    } catch (error) {
      console.error('Error updating agency profile:', error)
      toast.error('Error al actualizar el perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetForm = () => {
    reset({
      name: agencyData.name,
      email: agencyData.email,
      settings: agencyData.settings,
    })
    toast('Cambios descartados', { icon: 'ℹ️' })
  }

  const handlePurchaseCredits = () => {
    toast('Funcionalidad de compra de créditos disponible próximamente', {
      icon: 'ℹ️',
    })
  }

  const calculateGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const creditUsagePercentage = Math.round(
    (usageData.currentMonth.creditsUsed / agencyData.credits) * 100
  )
  const isLowCredits = agencyData.credits < 500

  const tabs = [
    { id: 'profile', name: 'Perfil de Agencia', icon: HiUser },
    { id: 'credits', name: 'Créditos y Facturación', icon: HiCreditCard },
    { id: 'usage', name: 'Análisis de Uso', icon: HiChartBar },
  ]

  return (
    <AgencyLayout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900">
              Configuración de Agencia
            </h1>
            <p className="text-secondary-600 mt-2">
              Gestiona tu perfil, créditos y configuración de la agencia
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-secondary-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map(tab => {
                  const IconComponent = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span>{tab.name}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              {/* Profile Form */}
              <div className="bg-white rounded-xl shadow-sm border border-secondary-100 p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <HiUser className="h-5 w-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-secondary-900">
                    Información de la Agencia
                  </h2>
                </div>

                <form
                  onSubmit={handleSubmit(handleProfileSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Nombre de la Agencia"
                      placeholder="Mi Agencia Digital"
                      error={errors.name?.message}
                      {...register('name')}
                      required
                    />

                    <Input
                      label="Email de Contacto"
                      type="email"
                      placeholder="admin@miagencia.com"
                      error={errors.email?.message}
                      {...register('email')}
                      required
                    />
                  </div>

                  {/* Settings Section */}
                  <div className="border-t border-secondary-200 pt-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <HiCog className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-secondary-900">
                        Configuración General
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Zona Horaria
                        </label>
                        <select
                          className="w-full px-4 py-2.5 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm text-secondary-900"
                          {...register('settings.timezone')}
                        >
                          {timezoneOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Idioma
                        </label>
                        <select
                          className="w-full px-4 py-2.5 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm text-secondary-900"
                          {...register('settings.language')}
                        >
                          {languageOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notifications"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                          {...register('settings.notifications')}
                        />
                        <label
                          htmlFor="notifications"
                          className="ml-2 block text-sm text-secondary-900"
                        >
                          Recibir notificaciones por email sobre el estado de
                          las campañas
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-between items-center pt-6 border-t border-secondary-200">
                    <div>
                      {isDirty && (
                        <p className="text-sm text-amber-600 flex items-center">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                          Tienes cambios sin guardar
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleResetForm}
                        disabled={!isDirty || isLoading}
                      >
                        <HiRefresh className="h-4 w-4 mr-2" />
                        Descartar Cambios
                      </Button>

                      <Button
                        type="submit"
                        disabled={
                          Object.keys(errors).length > 0 ||
                          !isDirty ||
                          isLoading
                        }
                        loading={isLoading}
                      >
                        <HiSave className="h-4 w-4 mr-2" />
                        Guardar Cambios
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'credits' && (
            <div className="space-y-8">
              {/* Credit Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Créditos Disponibles"
                  value={agencyData.credits.toLocaleString()}
                  icon={<HiCurrencyDollar className="h-6 w-6 text-green-600" />}
                  trend={{
                    value: isLowCredits ? 'Créditos bajos' : 'Disponible',
                    isPositive: !isLowCredits,
                  }}
                  className={isLowCredits ? 'border-amber-200 bg-amber-50' : ''}
                />

                <MetricCard
                  title="Plan Actual"
                  value={agencyData.plan.toUpperCase()}
                  icon={<HiCheckCircle className="h-6 w-6 text-primary-600" />}
                  trend={{
                    value: 'Activo',
                    isPositive: true,
                  }}
                />

                <MetricCard
                  title="Uso Este Mes"
                  value={`${creditUsagePercentage}%`}
                  icon={<HiChartBar className="h-6 w-6 text-blue-600" />}
                  trend={{
                    value: `${usageData.currentMonth.creditsUsed} créditos`,
                    isPositive: creditUsagePercentage <= 80,
                  }}
                />
              </div>

              {/* Low Credits Warning */}
              {isLowCredits && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <HiExclamationCircle className="h-5 w-5 text-amber-600 mr-2" />
                    <p className="text-amber-800 font-medium">Créditos bajos</p>
                  </div>
                  <p className="text-amber-700 text-sm mt-1">
                    Te quedan menos de 500 créditos. Considera comprar más
                    créditos para evitar interrupciones en tus campañas.
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePurchaseCredits}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      <HiCreditCard className="h-4 w-4 mr-2" />
                      Comprar Créditos
                    </Button>
                  </div>
                </div>
              )}

              {/* Credit History */}
              <div className="bg-white rounded-xl shadow-sm border border-secondary-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <HiCreditCard className="h-5 w-5 text-primary-600" />
                    <h2 className="text-xl font-semibold text-secondary-900">
                      Historial de Créditos
                    </h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePurchaseCredits}
                  >
                    <HiCreditCard className="h-4 w-4 mr-2" />
                    Comprar Créditos
                  </Button>
                </div>

                <div className="space-y-4">
                  {mockUsageData.creditHistory.map((transaction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-secondary-100 rounded-lg hover:bg-secondary-50 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-full ${
                            transaction.type === 'purchase'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {transaction.type === 'purchase' ? (
                            <HiCurrencyDollar className="h-4 w-4" />
                          ) : (
                            <HiTrendingUp className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-secondary-500">
                            {new Date(transaction.date).toLocaleDateString(
                              'es-ES',
                              {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`text-lg font-semibold ${
                          transaction.type === 'purchase'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'purchase' ? '+' : ''}
                        {transaction.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-8">
              {/* Usage Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Publicaciones Generadas"
                  value={usageData.currentMonth.publicationsGenerated.toString()}
                  icon={<HiMail className="h-6 w-6 text-blue-600" />}
                  trend={{
                    value: `+${calculateGrowthPercentage(
                      usageData.currentMonth.publicationsGenerated,
                      usageData.lastMonth.publicationsGenerated
                    )}%`,
                    isPositive: true,
                  }}
                />

                <MetricCard
                  title="Créditos Utilizados"
                  value={usageData.currentMonth.creditsUsed.toLocaleString()}
                  icon={<HiCurrencyDollar className="h-6 w-6 text-green-600" />}
                  trend={{
                    value: `+${calculateGrowthPercentage(
                      usageData.currentMonth.creditsUsed,
                      usageData.lastMonth.creditsUsed
                    )}%`,
                    isPositive: true,
                  }}
                />

                <MetricCard
                  title="Campañas Creadas"
                  value={usageData.currentMonth.campaignsCreated.toString()}
                  icon={<HiChartBar className="h-6 w-6 text-purple-600" />}
                  trend={{
                    value: `+${calculateGrowthPercentage(
                      usageData.currentMonth.campaignsCreated,
                      usageData.lastMonth.campaignsCreated
                    )}%`,
                    isPositive: true,
                  }}
                />

                <MetricCard
                  title="Espacios Activos"
                  value={usageData.currentMonth.workspacesActive.toString()}
                  icon={<HiGlobe className="h-6 w-6 text-indigo-600" />}
                  trend={{
                    value: `+${calculateGrowthPercentage(
                      usageData.currentMonth.workspacesActive,
                      usageData.lastMonth.workspacesActive
                    )}%`,
                    isPositive: true,
                  }}
                />
              </div>

              {/* Usage Details */}
              <div className="bg-white rounded-xl shadow-sm border border-secondary-100 p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <HiChartBar className="h-5 w-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-secondary-900">
                    Análisis Detallado de Uso
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Current Month Stats */}
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                      <HiCalendar className="h-5 w-5 mr-2 text-primary-600" />
                      Mes Actual
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-lg">
                        <span className="text-secondary-700">
                          Publicaciones generadas
                        </span>
                        <span className="font-semibold text-secondary-900">
                          {usageData.currentMonth.publicationsGenerated}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-lg">
                        <span className="text-secondary-700">
                          Créditos utilizados
                        </span>
                        <span className="font-semibold text-secondary-900">
                          {usageData.currentMonth.creditsUsed.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-lg">
                        <span className="text-secondary-700">
                          Campañas creadas
                        </span>
                        <span className="font-semibold text-secondary-900">
                          {usageData.currentMonth.campaignsCreated}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary-50 rounded-lg">
                        <span className="text-secondary-700">
                          Espacios de trabajo activos
                        </span>
                        <span className="font-semibold text-secondary-900">
                          {usageData.currentMonth.workspacesActive}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Previous Month Comparison */}
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                      <HiTrendingUp className="h-5 w-5 mr-2 text-green-600" />
                      Comparación con Mes Anterior
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-secondary-700">
                          Publicaciones
                        </span>
                        <span className="font-semibold text-green-700">
                          +
                          {calculateGrowthPercentage(
                            usageData.currentMonth.publicationsGenerated,
                            usageData.lastMonth.publicationsGenerated
                          )}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-secondary-700">Créditos</span>
                        <span className="font-semibold text-green-700">
                          +
                          {calculateGrowthPercentage(
                            usageData.currentMonth.creditsUsed,
                            usageData.lastMonth.creditsUsed
                          )}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-secondary-700">Campañas</span>
                        <span className="font-semibold text-green-700">
                          +
                          {calculateGrowthPercentage(
                            usageData.currentMonth.campaignsCreated,
                            usageData.lastMonth.campaignsCreated
                          )}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-secondary-700">Espacios</span>
                        <span className="font-semibold text-green-700">
                          +
                          {calculateGrowthPercentage(
                            usageData.currentMonth.workspacesActive,
                            usageData.lastMonth.workspacesActive
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Usage Tips */}
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <HiBell className="h-4 w-4 mr-2" />
                    Consejos para Optimizar el Uso
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • Programa tus campañas con anticipación para distribuir
                      mejor el uso de créditos
                    </li>
                    <li>
                      • Utiliza templates reutilizables para reducir el tiempo
                      de generación
                    </li>
                    <li>
                      • Revisa regularmente tus métricas para identificar
                      patrones de uso
                    </li>
                    <li>
                      • Considera actualizar tu plan si necesitas más créditos
                      mensualmente
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AgencyLayout>
  )
}
