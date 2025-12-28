'use client'

import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Settings,
  Download,
  Eye
} from 'lucide-react'
import { errorHandlingService } from '../../lib/ai/monitoring/ErrorHandlingIntegrationService'
import { metricsService } from '../../lib/ai/monitoring/MetricsService'
import { loggingService } from '../../lib/ai/monitoring/LoggingService'

interface SystemHealthDashboardProps {
  refreshInterval?: number
  showDetailedMetrics?: boolean
}

export function SystemHealthDashboard({ 
  refreshInterval = 30000, // 30 segundos
  showDetailedMetrics = false 
}: SystemHealthDashboardProps) {
  const [healthData, setHealthData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [selectedTab, setSelectedTab] = useState<'overview' | 'apis' | 'agents' | 'errors'>('overview')

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        setIsLoading(true)
        
        // Obtener datos de salud del sistema
        const healthReport = errorHandlingService.generateHealthReport()
        const performanceReport = metricsService.generatePerformanceReport()
        const errorReport = loggingService.generateErrorReport()
        const apiMetrics = metricsService.getAPIMetrics()
        const agentMetrics = metricsService.getAgentMetrics()
        const recoveryStates = errorHandlingService.getAllRecoveryStates()

        setHealthData({
          health: healthReport,
          performance: performanceReport,
          errors: errorReport,
          apis: apiMetrics,
          agents: agentMetrics,
          recoveries: recoveryStates
        })
        
        setLastUpdate(new Date())
      } catch (error) {
        console.error('Error fetching health data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Cargar datos iniciales
    fetchHealthData()

    // Configurar actualización automática
    const interval = setInterval(fetchHealthData, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  const handleRefresh = () => {
    setIsLoading(true)
    // Trigger refresh
    setTimeout(() => setIsLoading(false), 1000)
  }

  const handleExportLogs = () => {
    const logs = loggingService.exportLogs()
    const blob = new Blob([logs], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100'
      case 'critical':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5" />
      case 'degraded':
      case 'critical':
        return <AlertTriangle className="w-5 h-5" />
      default:
        return <Activity className="w-5 h-5" />
    }
  }

  if (isLoading && !healthData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando datos del sistema...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Monitor del Sistema
            </h2>
            {healthData && (
              <div className={`
                inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                ${getHealthStatusColor(healthData.health.systemHealth)}
              `}>
                {getHealthIcon(healthData.health.systemHealth)}
                <span className="ml-1 capitalize">{healthData.health.systemHealth}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Actualizado: {lastUpdate.toLocaleTimeString()}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportLogs}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Exportar logs"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 mt-4">
          {[
            { id: 'overview', label: 'Resumen' },
            { id: 'apis', label: 'APIs' },
            { id: 'agents', label: 'Agentes' },
            { id: 'errors', label: 'Errores' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`
                pb-2 text-sm font-medium border-b-2 transition-colors
                ${selectedTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedTab === 'overview' && (
          <OverviewTab healthData={healthData} />
        )}
        {selectedTab === 'apis' && (
          <APIsTab apiMetrics={healthData?.apis || []} />
        )}
        {selectedTab === 'agents' && (
          <AgentsTab agentMetrics={healthData?.agents || []} />
        )}
        {selectedTab === 'errors' && (
          <ErrorsTab errorData={healthData?.errors} />
        )}
      </div>
    </div>
  )
}

function OverviewTab({ healthData }: { healthData: any }) {
  if (!healthData) return null

  const { health, performance } = healthData

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tasa de Éxito"
          value={`${(100 - health.errorRate).toFixed(1)}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          trend={health.errorRate < 5 ? 'up' : 'down'}
          color={health.errorRate < 5 ? 'green' : 'red'}
        />
        
        <MetricCard
          title="Tiempo de Respuesta"
          value={`${(health.averageResponseTime / 1000).toFixed(1)}s`}
          icon={<Clock className="w-5 h-5" />}
          trend={health.averageResponseTime < 30000 ? 'up' : 'down'}
          color={health.averageResponseTime < 30000 ? 'green' : 'yellow'}
        />
        
        <MetricCard
          title="Operaciones Totales"
          value={performance.summary.totalGenerations.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          trend="up"
          color="blue"
        />
        
        <MetricCard
          title="Recuperaciones Activas"
          value={health.activeRecoveries.toString()}
          icon={<RefreshCw className="w-5 h-5" />}
          trend={health.activeRecoveries === 0 ? 'up' : 'down'}
          color={health.activeRecoveries === 0 ? 'green' : 'yellow'}
        />
      </div>

      {/* Recomendaciones */}
      {health.recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Recomendaciones del Sistema
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {health.recommendations.map((rec: string, index: number) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Estado de recuperaciones */}
      {healthData.recoveries.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-3">
            Recuperaciones en Progreso
          </h3>
          <div className="space-y-2">
            {healthData.recoveries.map((recovery: any) => (
              <div key={recovery.publicationId} className="flex items-center justify-between text-sm">
                <span className="text-blue-700">
                  {recovery.publicationId.slice(-8)} ({recovery.agentType})
                </span>
                <span className="text-blue-600">
                  Intento {recovery.recoveryAttempts}/3
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function APIsTab({ apiMetrics }: { apiMetrics: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Métricas de APIs</h3>
      
      <div className="grid gap-4">
        {apiMetrics.map((api) => (
          <div key={`${api.service}_${api.endpoint}`} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                {api.service.toUpperCase()} - {api.endpoint}
              </h4>
              <span className={`
                px-2 py-1 text-xs rounded-full
                ${api.errorCount === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
              `}>
                {api.errorCount === 0 ? 'Saludable' : `${api.errorCount} errores`}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Requests</span>
                <div className="font-medium">{api.requestCount}</div>
              </div>
              <div>
                <span className="text-gray-500">Éxito</span>
                <div className="font-medium text-green-600">{api.successCount}</div>
              </div>
              <div>
                <span className="text-gray-500">Latencia</span>
                <div className="font-medium">{api.averageLatency.toFixed(0)}ms</div>
              </div>
              <div>
                <span className="text-gray-500">Último uso</span>
                <div className="font-medium">{new Date(api.lastUsed).toLocaleTimeString()}</div>
              </div>
            </div>
            
            {api.totalCost && (
              <div className="mt-2 text-sm text-gray-600">
                Costo total: ${api.totalCost.toFixed(4)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AgentsTab({ agentMetrics }: { agentMetrics: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Rendimiento de Agentes</h3>
      
      <div className="grid gap-4">
        {agentMetrics.map((agent) => (
          <div key={agent.agentType} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 capitalize">
                {agent.agentType.replace('-', ' ')}
              </h4>
              <span className="text-sm text-gray-500">
                {((agent.successfulGenerations / agent.totalGenerations) * 100).toFixed(1)}% éxito
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total</span>
                <div className="font-medium">{agent.totalGenerations}</div>
              </div>
              <div>
                <span className="text-gray-500">Exitosas</span>
                <div className="font-medium text-green-600">{agent.successfulGenerations}</div>
              </div>
              <div>
                <span className="text-gray-500">Tiempo promedio</span>
                <div className="font-medium">{(agent.averageGenerationTime / 1000).toFixed(1)}s</div>
              </div>
              <div>
                <span className="text-gray-500">Reintentos promedio</span>
                <div className="font-medium">{agent.averageRetryCount.toFixed(1)}</div>
              </div>
            </div>
            
            {agent.qualityScore && (
              <div className="mt-2 text-sm text-gray-600">
                Puntuación de calidad: {agent.qualityScore.toFixed(2)}/5.0
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorsTab({ errorData }: { errorData: any }) {
  if (!errorData) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Análisis de Errores</h3>
      
      {/* Resumen de errores */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-red-600">Total de errores</span>
            <div className="font-medium text-red-800">{errorData.summary.totalErrors}</div>
          </div>
          <div>
            <span className="text-red-600">Tasa de error</span>
            <div className="font-medium text-red-800">{errorData.summary.errorRate.toFixed(1)}%</div>
          </div>
          <div>
            <span className="text-red-600">Error más común</span>
            <div className="font-medium text-red-800">{errorData.summary.mostCommonError}</div>
          </div>
          <div>
            <span className="text-red-600">Agente problemático</span>
            <div className="font-medium text-red-800">{errorData.summary.mostProblematicAgent}</div>
          </div>
        </div>
      </div>

      {/* Detalles de errores */}
      <div className="space-y-3">
        {errorData.details.map((detail: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">
                Errores por tipo
              </h4>
              <span className="text-sm text-gray-500">
                Total: {detail.totalErrors}
              </span>
            </div>
            
            <div className="space-y-2">
              {Object.entries(detail.errorsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{type}</span>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend: 'up' | 'down'
  color: 'green' | 'red' | 'yellow' | 'blue'
}

function MetricCard({ title, value, icon, trend, color }: MetricCardProps) {
  const colorClasses = {
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    blue: 'text-blue-600 bg-blue-100'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{title}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center">
        {trend === 'up' ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
        <span className={`ml-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? 'Mejorando' : 'Degradando'}
        </span>
      </div>
    </div>
  )
}

export default SystemHealthDashboard