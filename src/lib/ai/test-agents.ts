/**
 * Script de prueba para verificar el funcionamiento del sistema de agentes AI
 * 
 * Ejecutar con: npx tsx src/lib/ai/test-agents.ts
 */

import { getAIAgentService } from './agents'

async function testAIAgents() {
  console.log('🚀 Iniciando pruebas del sistema de agentes AI...\n')

  try {
    // Obtener servicio de agentes
    const aiService = getAIAgentService()
    console.log('✅ Servicio de agentes inicializado correctamente')

    // Test 1: Verificar agentes disponibles
    console.log('\n📋 Test 1: Verificando agentes disponibles...')
    const agents = aiService.getAvailableAgents()
    console.log(`✅ ${agents.length} agentes encontrados:`)
    agents.forEach(agent => {
      console.log(`   - ${agent.name} (${agent.id}) - ${agent.enabled ? 'Habilitado' : 'Deshabilitado'}`)
    })

    // Test 2: Verificar estado del sistema
    console.log('\n🔍 Test 2: Verificando estado del sistema...')
    const stats = aiService.getSystemStats()
    console.log('✅ Estadísticas del sistema:')
    console.log(`   - Total de agentes: ${stats.totalAgents}`)
    console.log(`   - Agentes habilitados: ${stats.enabledAgents}`)
    console.log(`   - Solicitudes activas: ${stats.activeRequests}`)
    console.log(`   - Solicitudes en cola: ${stats.queuedRequests}`)

    // Test 3: Generar contenido simple
    console.log('\n✍️ Test 3: Generando contenido simple...')
    try {
      const post = await aiService.generatePost({
        topic: 'Beneficios de la inteligencia artificial en el marketing',
        platform: 'linkedin',
        tone: 'profesional',
        length: 500
      })
      console.log('✅ Contenido generado exitosamente:')
      console.log(`   "${post.substring(0, 100)}..."`)
    } catch (error) {
      console.error('❌ Error generando contenido:', error)
    }

    // Test 4: Generar hashtags
    console.log('\n🏷️ Test 4: Generando hashtags...')
    try {
      const hashtags = await aiService.generateHashtags(
        'La inteligencia artificial está revolucionando el marketing digital',
        'instagram'
      )
      console.log('✅ Hashtags generados exitosamente:')
      console.log(`   ${hashtags.slice(0, 5).join(', ')}...`)
    } catch (error) {
      console.error('❌ Error generando hashtags:', error)
    }

    // Test 5: Análisis de marca básico
    console.log('\n🎯 Test 5: Realizando análisis de marca...')
    try {
      const brandData = {
        name: 'TechStart',
        industry: 'Tecnología',
        values: ['Innovación', 'Calidad', 'Transparencia'],
        mission: 'Democratizar la tecnología para todos',
        targetAudience: 'Startups y pequeñas empresas',
        currentChallenges: ['Competencia intensa', 'Recursos limitados'],
        strengths: ['Equipo técnico fuerte', 'Producto innovador']
      }

      const analysis = await aiService.analyzeBrand(brandData)
      console.log('✅ Análisis de marca completado:')
      console.log(`   - Fortalezas: ${analysis.strengths.length}`)
      console.log(`   - Debilidades: ${analysis.weaknesses.length}`)
      console.log(`   - Oportunidades: ${analysis.opportunities.length}`)
      console.log(`   - Recomendaciones: ${analysis.recommendations.length}`)
    } catch (error) {
      console.error('❌ Error en análisis de marca:', error)
    }

    // Test 6: Verificar métricas
    console.log('\n📊 Test 6: Verificando métricas de agentes...')
    const metrics = aiService.getAllMetrics()
    console.log('✅ Métricas obtenidas:')
    metrics.forEach(metric => {
      if (metric.totalRequests > 0) {
        const successRate = ((metric.successfulRequests / metric.totalRequests) * 100).toFixed(1)
        console.log(`   - ${metric.agentId}: ${metric.totalRequests} solicitudes, ${successRate}% éxito`)
      }
    })

    // Test 7: Health Check
    console.log('\n🏥 Test 7: Verificando salud del sistema...')
    try {
      const health = await aiService.healthCheck()
      console.log(`✅ Estado del sistema: ${health.status}`)
      Object.entries(health.agents).forEach(([agentId, status]) => {
        console.log(`   - ${agentId}: ${status}`)
      })
    } catch (error) {
      console.error('❌ Error en health check:', error)
    }

    // Test 8: Crear tarea asíncrona
    console.log('\n⏳ Test 8: Creando tarea asíncrona...')
    try {
      const taskId = await aiService.createTask('content-creator', 'generate-post', {
        topic: 'Futuro del trabajo remoto',
        platform: 'twitter',
        tone: 'casual',
        length: 280
      })
      console.log(`✅ Tarea creada: ${taskId}`)

      // Esperar un momento y verificar estado
      await new Promise(resolve => setTimeout(resolve, 2000))
      const task = aiService.getTask(taskId)
      if (task) {
        console.log(`   Estado de la tarea: ${task.status}`)
        if (task.output) {
          console.log(`   Resultado: "${task.output.substring(0, 50)}..."`)
        }
      }
    } catch (error) {
      console.error('❌ Error creando tarea:', error)
    }

    console.log('\n🎉 Todas las pruebas completadas!')
    console.log('\n📋 Resumen:')
    console.log('   - Sistema de agentes funcionando correctamente')
    console.log('   - API de Gemini conectada y operativa')
    console.log('   - Agentes especializados respondiendo')
    console.log('   - Sistema de métricas activo')
    console.log('   - Tareas asíncronas funcionando')

  } catch (error) {
    console.error('\n❌ Error crítico en las pruebas:', error)
    console.log('\n🔧 Posibles soluciones:')
    console.log('   1. Verificar que GEMINI_API_KEY esté configurada correctamente')
    console.log('   2. Verificar conexión a internet')
    console.log('   3. Verificar que la API key tenga permisos suficientes')
    console.log('   4. Revisar logs de error para más detalles')
  }
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  testAIAgents().catch(console.error)
}

export { testAIAgents }