/**
 * Script de prueba para el Campaign Planner Agent
 * 
 * Este archivo permite probar el sistema de planificación de campañas
 * de forma independiente para verificar su funcionamiento.
 */

import { getCampaignPlannerService } from './services/CampaignPlannerService'
import { getAIAgentService } from './agents/AIAgentService'
import type { 
  CampaignData, 
  WorkspaceData, 
  ResourceData, 
  TemplateData 
} from './agents/types'

// Datos de prueba
const testCampaign: CampaignData = {
  id: 'test-campaign-001',
  name: 'Campaña de Prueba - Café Artesanal',
  objective: 'Promocionar nuestra nueva línea de cafés especiales, educar sobre el proceso de tostado artesanal y aumentar las ventas online',
  startDate: '2024-12-01T08:00:00Z',
  endDate: '2024-12-07T20:00:00Z',
  socialNetworks: ['instagram', 'facebook'],
  intervalHours: 12, // 2 publicaciones por día
  contentType: 'optimized',
  prompt: 'Crea contenido educativo y atractivo sobre café artesanal, proceso de tostado, origen de los granos y experiencias sensoriales. El tono debe ser cálido, acogedor y experto, dirigido a amantes del café que valoran la calidad.'
}

const testWorkspace: WorkspaceData = {
  id: 'test-workspace-001',
  name: 'Café Luna',
  branding: {
    primaryColor: '#8B4513',
    secondaryColor: '#D2691E',
    slogan: 'Cada taza cuenta una historia',
    description: 'Tostadores de café artesanal especializado en granos de origen único. Ofrecemos una experiencia sensorial única con cafés cuidadosamente seleccionados y tostados a la perfección.',
    whatsapp: '+1234567890'
  }
}

const testResources: ResourceData[] = [
  {
    id: 'res-001',
    name: 'Granos de café tostándose',
    url: '/images/coffee-roasting.jpg',
    type: 'image',
    mimeType: 'image/jpeg'
  },
  {
    id: 'res-002',
    name: 'Barista preparando café',
    url: '/images/barista-brewing.jpg',
    type: 'image',
    mimeType: 'image/jpeg'
  }
]

const testTemplates: TemplateData[] = [
  {
    id: 'tpl-001',
    name: 'Post educativo sobre café',
    type: 'single',
    socialNetworks: ['instagram', 'facebook'],
    images: ['/templates/coffee-education.png']
  },
  {
    id: 'tpl-002',
    name: 'Carousel proceso de tostado',
    type: 'carousel',
    socialNetworks: ['instagram'],
    images: ['/templates/roasting-process-1.png', '/templates/roasting-process-2.png']
  }
]

/**
 * Prueba básica de generación de contenido
 */
export async function testBasicGeneration() {
  console.log('🧪 Iniciando prueba básica de generación de contenido...')
  
  try {
    const service = getCampaignPlannerService()
    
    // Validar datos de entrada
    const validation = service.validateCampaignData(testCampaign)
    console.log('✅ Validación de datos:', validation.isValid ? 'EXITOSA' : 'FALLIDA')
    
    if (!validation.isValid) {
      console.log('❌ Errores de validación:', validation.errors)
      return false
    }

    // Generar plan de contenido
    console.log('🚀 Generando plan de contenido...')
    const contentPlan = await service.generateContentPlan({
      campaign: testCampaign,
      workspace: testWorkspace,
      resources: testResources,
      templates: testTemplates
    })

    console.log(`✅ Plan generado exitosamente: ${contentPlan.length} publicaciones`)
    
    // Mostrar resumen del plan
    contentPlan.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title} (${item.socialNetwork}) - ${item.contentType}`)
    })

    // Calcular estadísticas
    const stats = service.calculatePlanStatistics(contentPlan)
    console.log('📊 Estadísticas:', {
      totalPosts: stats.totalPosts,
      networks: Object.keys(stats.postsByNetwork),
      types: Object.keys(stats.postsByType),
      avgPerDay: stats.averagePostsPerDay
    })

    return contentPlan
  } catch (error) {
    console.error('❌ Error en prueba básica:', error)
    return false
  }
}

/**
 * Prueba de regeneración de contenido
 */
export async function testRegeneration() {
  console.log('🧪 Iniciando prueba de regeneración...')
  
  try {
    const service = getCampaignPlannerService()
    
    // Generar plan inicial
    const initialPlan = await service.generateContentPlan({
      campaign: testCampaign,
      workspace: testWorkspace,
      resources: testResources,
      templates: testTemplates
    })

    console.log(`✅ Plan inicial generado: ${initialPlan.length} publicaciones`)

    // Regenerar plan completo
    console.log('🔄 Regenerando plan completo...')
    const regeneratedPlan = await service.regenerateContentPlan({
      campaign: testCampaign,
      workspace: testWorkspace,
      resources: testResources,
      templates: testTemplates,
      previousPlan: initialPlan
    })

    console.log(`✅ Plan regenerado: ${regeneratedPlan.length} publicaciones`)

    // Regenerar elemento específico
    if (regeneratedPlan.length > 0) {
      console.log('🔄 Regenerando elemento específico (índice 0)...')
      const newItem = await service.regenerateContentItem({
        campaign: testCampaign,
        workspace: testWorkspace,
        resources: testResources,
        templates: testTemplates,
        itemIndex: 0,
        previousPlan: regeneratedPlan
      })

      console.log(`✅ Elemento regenerado: ${newItem.title}`)
    }

    return true
  } catch (error) {
    console.error('❌ Error en prueba de regeneración:', error)
    return false
  }
}

/**
 * Prueba de validación de datos
 */
export function testValidation() {
  console.log('🧪 Iniciando prueba de validación...')
  
  const service = getCampaignPlannerService()
  
  // Caso 1: Datos válidos
  const validResult = service.validateCampaignData(testCampaign)
  console.log('✅ Validación de datos válidos:', validResult.isValid ? 'EXITOSA' : 'FALLIDA')

  // Caso 2: Datos inválidos
  const invalidCampaign: CampaignData = {
    ...testCampaign,
    name: '', // Nombre vacío
    startDate: '2024-12-07T08:00:00Z',
    endDate: '2024-12-01T20:00:00Z', // Fecha fin anterior a inicio
    socialNetworks: [], // Sin redes sociales
    intervalHours: 0, // Intervalo inválido
    prompt: '' // Prompt vacío
  }

  const invalidResult = service.validateCampaignData(invalidCampaign)
  console.log('✅ Validación de datos inválidos:', !invalidResult.isValid ? 'EXITOSA' : 'FALLIDA')
  console.log('📝 Errores detectados:', invalidResult.errors)

  return validResult.isValid && !invalidResult.isValid
}

/**
 * Prueba de estadísticas
 */
export async function testStatistics() {
  console.log('🧪 Iniciando prueba de estadísticas...')
  
  try {
    const service = getCampaignPlannerService()
    
    const contentPlan = await service.generateContentPlan({
      campaign: testCampaign,
      workspace: testWorkspace,
      resources: testResources,
      templates: testTemplates
    })

    const stats = service.calculatePlanStatistics(contentPlan)
    
    console.log('📊 Estadísticas calculadas:')
    console.log('- Total de posts:', stats.totalPosts)
    console.log('- Posts por red social:', stats.postsByNetwork)
    console.log('- Posts por tipo:', stats.postsByType)
    console.log('- Posts por prioridad:', stats.postsByPriority)
    console.log('- Promedio por día:', stats.averagePostsPerDay)
    console.log('- Rango de fechas:', stats.dateRange)

    return stats.totalPosts > 0
  } catch (error) {
    console.error('❌ Error en prueba de estadísticas:', error)
    return false
  }
}

/**
 * Prueba de estado del sistema
 */
export async function testSystemHealth() {
  console.log('🧪 Iniciando prueba de estado del sistema...')
  
  try {
    const aiService = getAIAgentService()
    
    // Verificar agentes disponibles
    const agents = aiService.getAvailableAgents()
    console.log(`✅ Agentes disponibles: ${agents.length}`)
    
    const campaignPlannerAgent = agents.find(agent => agent.id === 'campaign-planner')
    if (campaignPlannerAgent) {
      console.log('✅ Campaign Planner Agent encontrado:', campaignPlannerAgent.name)
      console.log('- Habilitado:', campaignPlannerAgent.enabled)
      console.log('- Capacidades:', campaignPlannerAgent.capabilities)
    } else {
      console.log('❌ Campaign Planner Agent no encontrado')
      return false
    }

    // Verificar estado de salud
    const healthCheck = await aiService.healthCheck()
    console.log('🏥 Estado de salud del sistema:', healthCheck.status)
    console.log('- Agentes online:', Object.values(healthCheck.agents).filter(status => status === 'online').length)
    console.log('- Agentes offline:', Object.values(healthCheck.agents).filter(status => status === 'offline').length)

    return healthCheck.status !== 'unhealthy'
  } catch (error) {
    console.error('❌ Error en prueba de estado del sistema:', error)
    return false
  }
}

/**
 * Ejecutar todas las pruebas
 */
export async function runAllTests() {
  console.log('🎯 Ejecutando todas las pruebas del Campaign Planner...\n')
  
  const results = {
    systemHealth: false,
    validation: false,
    basicGeneration: false,
    regeneration: false,
    statistics: false
  }

  try {
    // Prueba 1: Estado del sistema
    console.log('1️⃣ Prueba de estado del sistema:')
    results.systemHealth = await testSystemHealth()
    console.log('')

    // Prueba 2: Validación
    console.log('2️⃣ Prueba de validación:')
    results.validation = testValidation()
    console.log('')

    // Prueba 3: Generación básica
    console.log('3️⃣ Prueba de generación básica:')
    const basicResult = await testBasicGeneration()
    results.basicGeneration = !!basicResult
    console.log('')

    // Prueba 4: Regeneración
    console.log('4️⃣ Prueba de regeneración:')
    results.regeneration = await testRegeneration()
    console.log('')

    // Prueba 5: Estadísticas
    console.log('5️⃣ Prueba de estadísticas:')
    results.statistics = await testStatistics()
    console.log('')

    // Resumen de resultados
    console.log('📋 RESUMEN DE PRUEBAS:')
    console.log('='.repeat(40))
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'EXITOSA' : 'FALLIDA'}`)
    })

    const totalPassed = Object.values(results).filter(Boolean).length
    const totalTests = Object.keys(results).length
    
    console.log('')
    console.log(`🎯 Resultado final: ${totalPassed}/${totalTests} pruebas exitosas`)
    
    if (totalPassed === totalTests) {
      console.log('🎉 ¡Todas las pruebas pasaron exitosamente!')
    } else {
      console.log('⚠️ Algunas pruebas fallaron. Revisa los errores anteriores.')
    }

    return results
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error)
    return results
  }
}

// Exportar funciones de prueba individuales
export const campaignPlannerTests = {
  basic: testBasicGeneration,
  regeneration: testRegeneration,
  validation: testValidation,
  statistics: testStatistics,
  systemHealth: testSystemHealth,
  runAll: runAllTests
}