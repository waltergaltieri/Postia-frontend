'use client'

import React, { useState } from 'react'
import { ContentOrchestrationService } from '@/lib/ai/services/ContentOrchestrationService'
import type { 
  ContentOrchestrationParams, 
  ContentOrchestrationResult 
} from '@/lib/ai/services/ContentOrchestrationService'
import type { 
  CampaignData, 
  WorkspaceData, 
  ResourceData, 
  TemplateData 
} from '@/lib/ai/agents/types'

export default function Phase1TestComponent() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ContentOrchestrationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Datos de prueba
  const testCampaign: CampaignData = {
    id: 'test-campaign-001',
    name: 'Campaña de Lanzamiento Producto',
    objective: 'Generar awareness y conversiones para nuevo producto',
    startDate: '2024-12-15T09:00:00Z',
    endDate: '2024-12-22T18:00:00Z',
    socialNetworks: ['instagram', 'facebook', 'linkedin'],
    intervalHours: 8,
    contentType: 'optimized',
    prompt: 'Crear contenido atractivo que destaque los beneficios únicos del producto, dirigido a profesionales jóvenes interesados en tecnología e innovación.'
  }

  const testWorkspace: WorkspaceData = {
    id: 'workspace-001',
    name: 'TechInnovate',
    branding: {
      primaryColor: '#2563EB',
      secondaryColor: '#F59E0B',
      slogan: 'Innovación que transforma',
      description: 'Empresa líder en soluciones tecnológicas innovadoras para empresas modernas.',
      whatsapp: '+54911234567'
    }
  }

  const testResources: ResourceData[] = [
    {
      id: 'resource-001',
      name: 'Producto Hero Image',
      url: '/images/product-hero.jpg',
      type: 'image',
      mimeType: 'image/jpeg'
    },
    {
      id: 'resource-002',
      name: 'Team Behind Scenes',
      url: '/images/team-work.jpg',
      type: 'image',
      mimeType: 'image/jpeg'
    },
    {
      id: 'resource-003',
      name: 'Product Demo Video',
      url: '/videos/demo.mp4',
      type: 'video',
      mimeType: 'video/mp4'
    }
  ]

  const testTemplates: TemplateData[] = [
    {
      id: 'template-001',
      name: 'Single Post Moderno',
      type: 'single',
      socialNetworks: ['instagram', 'facebook'],
      images: ['/templates/single-modern.jpg']
    },
    {
      id: 'template-002',
      name: 'Carrusel Educativo',
      type: 'carousel',
      socialNetworks: ['instagram', 'linkedin'],
      images: ['/templates/carousel-1.jpg', '/templates/carousel-2.jpg']
    },
    {
      id: 'template-003',
      name: 'Post Profesional LinkedIn',
      type: 'single',
      socialNetworks: ['linkedin'],
      images: ['/templates/linkedin-professional.jpg']
    }
  ]

  const testRestrictions = [
    'No mencionar competidores directos',
    'Evitar claims médicos o de salud',
    'No usar imágenes con copyright'
  ]

  const testBusinessObjectives = [
    'Aumentar awareness de marca en 25%',
    'Generar 100 leads cualificados',
    'Incrementar engagement rate a 4.5%'
  ]

  const executePhase1Test = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🧪 Iniciando test de Fase 1...')
      
      const orchestrationService = new ContentOrchestrationService()
      
      const params: ContentOrchestrationParams = {
        campaign: testCampaign,
        workspace: testWorkspace,
        resources: testResources,
        templates: testTemplates,
        restrictions: testRestrictions,
        businessObjectives: testBusinessObjectives
      }

      const orchestrationResult = await orchestrationService.executePhase1(params)
      
      console.log('✅ Fase 1 completada:', orchestrationResult)
      setResult(orchestrationResult)

    } catch (err) {
      console.error('❌ Error en test de Fase 1:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🧪 Test Fase 1 - Orquestación de Ideas de Contenido
        </h1>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Parámetros de Prueba:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Campaña:</strong> {testCampaign.name}<br/>
              <strong>Duración:</strong> {formatDate(testCampaign.startDate)} - {formatDate(testCampaign.endDate)}<br/>
              <strong>Intervalo:</strong> {testCampaign.intervalHours} horas<br/>
              <strong>Redes:</strong> {testCampaign.socialNetworks.join(', ')}
            </div>
            <div>
              <strong>Workspace:</strong> {testWorkspace.name}<br/>
              <strong>Recursos:</strong> {testResources.length}<br/>
              <strong>Templates:</strong> {testTemplates.length}<br/>
              <strong>Restricciones:</strong> {testRestrictions.length}
            </div>
          </div>
        </div>

        <button
          onClick={executePhase1Test}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {isLoading ? '⏳ Ejecutando Fase 1...' : '🚀 Ejecutar Fase 1'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">❌ Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Resumen Ejecutivo */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-green-800 mb-4">✅ Fase 1 Completada</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold text-green-600">{result.consolidatedPlan.totalSlots}</div>
                <div className="text-sm text-green-700">Ideas de Contenido</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{result.qualityControl.overallScore}%</div>
                <div className="text-sm text-green-700">Score de Calidad</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{result.processingTimeMs}ms</div>
                <div className="text-sm text-green-700">Tiempo de Procesamiento</div>
              </div>
            </div>
          </div>

          {/* Control de Calidad */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🔍 Control de Calidad</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className={`p-3 rounded text-center ${result.qualityControl.templateConsistency ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <div className="font-semibold">Templates</div>
                <div className="text-sm">{result.qualityControl.templateConsistency ? '✅' : '❌'}</div>
              </div>
              <div className={`p-3 rounded text-center ${result.qualityControl.resourceAvailability ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <div className="font-semibold">Recursos</div>
                <div className="text-sm">{result.qualityControl.resourceAvailability ? '✅' : '❌'}</div>
              </div>
              <div className={`p-3 rounded text-center ${result.qualityControl.restrictionsCompliance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <div className="font-semibold">Restricciones</div>
                <div className="text-sm">{result.qualityControl.restrictionsCompliance ? '✅' : '❌'}</div>
              </div>
              <div className={`p-3 rounded text-center ${result.qualityControl.legibilitySignals ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <div className="font-semibold">Legibilidad</div>
                <div className="text-sm">{result.qualityControl.legibilitySignals ? '✅' : '❌'}</div>
              </div>
              <div className={`p-3 rounded text-center ${result.qualityControl.brandAlignment ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <div className="font-semibold">Marca</div>
                <div className="text-sm">{result.qualityControl.brandAlignment ? '✅' : '❌'}</div>
              </div>
            </div>

            {result.qualityControl.criticalIssues.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-red-800 mb-2">⚠️ Problemas Críticos:</h4>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {result.qualityControl.criticalIssues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.qualityControl.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">💡 Recomendaciones:</h4>
                <ul className="list-disc list-inside text-blue-700 text-sm space-y-1">
                  {result.qualityControl.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Plan Consolidado */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📋 Plan de Contenido Consolidado</h3>
            
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <h4 className="font-semibold mb-2">Distribución por Red</h4>
                {Object.entries(result.consolidatedPlan.summary.networkDistribution).map(([network, count]) => (
                  <div key={network} className="flex justify-between text-sm">
                    <span className="capitalize">{network}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Distribución por Formato</h4>
                {Object.entries(result.consolidatedPlan.summary.formatDistribution).map(([format, count]) => (
                  <div key={format} className="flex justify-between text-sm">
                    <span className="capitalize">{format}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Uso de Templates</h4>
                {Object.entries(result.consolidatedPlan.summary.templateUsage).map(([template, count]) => (
                  <div key={template} className="flex justify-between text-sm">
                    <span className="text-xs">{template}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lista de Slots */}
            <div className="space-y-3">
              <h4 className="font-semibold">Ideas de Contenido por Slot:</h4>
              {result.consolidatedPlan.slots.slice(0, 5).map((slot) => (
                <div key={slot.slotId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="font-semibold">Slot {slot.order + 1}</h5>
                      <p className="text-sm text-gray-600">{formatDate(slot.scheduledDate)}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      slot.validationStatus === 'passed' ? 'bg-green-100 text-green-800' :
                      slot.validationStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {slot.validationStatus}
                    </div>
                  </div>
                  
                  <p className="text-sm mb-2"><strong>Idea:</strong> {slot.ideaSummary}</p>
                  <p className="text-sm mb-2"><strong>Template:</strong> {slot.templateSummary}</p>
                  <p className="text-sm mb-2"><strong>Redes:</strong> {slot.socialNetworks.join(', ')}</p>
                  
                  {slot.validationNotes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600"><strong>Notas:</strong></p>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {slot.validationNotes.map((note, index) => (
                          <li key={index}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              
              {result.consolidatedPlan.slots.length > 5 && (
                <div className="text-center text-gray-500 text-sm">
                  ... y {result.consolidatedPlan.slots.length - 5} slots más
                </div>
              )}
            </div>
          </div>

          {/* Análisis Semántico */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🔍 Análisis Semántico</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Recursos Analizados ({result.semanticAnalysis.resources.length})</h4>
                {result.semanticAnalysis.resources.map((resource) => (
                  <div key={resource.resourceId} className="border rounded p-3 mb-2">
                    <h5 className="font-medium">{resource.name}</h5>
                    <p className="text-sm text-gray-600 mb-1">{resource.visualSummary}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded ${
                        resource.brandCompatibility.level === 'high' ? 'bg-green-100 text-green-800' :
                        resource.brandCompatibility.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {resource.brandCompatibility.level} compatibilidad
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Templates Analizados ({result.semanticAnalysis.templates.length})</h4>
                {result.semanticAnalysis.templates.map((template) => (
                  <div key={template.templateId} className="border rounded p-3 mb-2">
                    <h5 className="font-medium">{template.name}</h5>
                    <p className="text-sm text-gray-600 mb-1">
                      Fortalezas: {template.layoutStrengths.slice(0, 2).join(', ')}
                    </p>
                    <div className="text-xs text-gray-500">
                      Capacidad de texto: H:{template.textCapacity.headline} S:{template.textCapacity.subhead} C:{template.textCapacity.cta}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Plan Temporal */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📅 Plan Temporal</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-lg font-bold">{result.temporalPlan.totalSlots}</div>
                <div className="text-sm text-gray-600">Total Slots</div>
              </div>
              <div>
                <div className="text-lg font-bold">{result.temporalPlan.intervalHours}h</div>
                <div className="text-sm text-gray-600">Intervalo</div>
              </div>
              <div>
                <div className="text-lg font-bold">
                  {Math.round((new Date(result.temporalPlan.endDate).getTime() - new Date(result.temporalPlan.startDate).getTime()) / (1000 * 60 * 60 * 24))}d
                </div>
                <div className="text-sm text-gray-600">Duración</div>
              </div>
              <div>
                <div className="text-lg font-bold">{result.temporalPlan.timezone.split('/').pop()}</div>
                <div className="text-sm text-gray-600">Zona Horaria</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}