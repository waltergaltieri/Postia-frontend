/**
 * Ejemplos de uso del sistema de agentes AI
 * 
 * Este archivo contiene ejemplos prácticos de cómo usar los diferentes agentes
 * disponibles en el sistema.
 */

import { getAIAgentService } from '../agents'

// Obtener instancia del servicio de agentes
const aiService = getAIAgentService()

/**
 * EJEMPLO 1: Generar contenido para redes sociales
 */
export async function exampleGeneratePost() {
  try {
    const post = await aiService.generatePost({
      topic: 'Beneficios del marketing digital para pequeñas empresas',
      platform: 'linkedin',
      tone: 'profesional',
      length: 1500
    })
    
    console.log('Publicación generada:', post)
    return post
  } catch (error) {
    console.error('Error generando publicación:', error)
    throw error
  }
}

/**
 * EJEMPLO 2: Generar hashtags para contenido
 */
export async function exampleGenerateHashtags() {
  const content = "El marketing digital ha revolucionado la forma en que las empresas se conectan con sus clientes. Descubre las estrategias más efectivas para 2024."
  
  try {
    const hashtags = await aiService.generateHashtags(content, 'instagram')
    console.log('Hashtags generados:', hashtags)
    return hashtags
  } catch (error) {
    console.error('Error generando hashtags:', error)
    throw error
  }
}

/**
 * EJEMPLO 3: Optimizar contenido existente
 */
export async function exampleOptimizeContent() {
  const originalContent = "Nuestro producto es bueno. Cómpralo ahora."
  
  try {
    const optimizedContent = await aiService.optimizeContent(originalContent, 'facebook')
    console.log('Contenido optimizado:', optimizedContent)
    return optimizedContent
  } catch (error) {
    console.error('Error optimizando contenido:', error)
    throw error
  }
}

/**
 * EJEMPLO 4: Generar ideas de contenido
 */
export async function exampleGenerateContentIdeas() {
  try {
    const ideas = await aiService.generateContentIdeas({
      topic: 'Sostenibilidad empresarial',
      platform: 'linkedin',
      count: 5,
      audience: 'Ejecutivos y empresarios'
    })
    
    console.log('Ideas de contenido:', ideas)
    return ideas
  } catch (error) {
    console.error('Error generando ideas:', error)
    throw error
  }
}

/**
 * EJEMPLO 5: Análisis de marca
 */
export async function exampleBrandAnalysis() {
  const brandData = {
    name: 'EcoTech Solutions',
    industry: 'Tecnología sostenible',
    values: ['Innovación', 'Sostenibilidad', 'Transparencia'],
    mission: 'Crear tecnología que proteja el medio ambiente',
    targetAudience: 'Empresas conscientes del medio ambiente',
    currentChallenges: ['Competencia intensa', 'Educación del mercado'],
    strengths: ['Tecnología innovadora', 'Equipo experto'],
    socialMediaPresence: {
      platforms: ['LinkedIn', 'Twitter', 'Instagram'],
      followers: { linkedin: 5000, twitter: 3000, instagram: 8000 },
      engagement: { linkedin: 0.05, twitter: 0.03, instagram: 0.07 }
    }
  }
  
  try {
    const analysis = await aiService.analyzeBrand(brandData)
    console.log('Análisis de marca:', analysis)
    return analysis
  } catch (error) {
    console.error('Error analizando marca:', error)
    throw error
  }
}

/**
 * EJEMPLO 6: Desarrollo de estrategia
 */
export async function exampleDevelopStrategy() {
  const objectives = [
    'Aumentar el reconocimiento de marca en un 40%',
    'Generar 500 leads cualificados por mes',
    'Posicionarse como líder de opinión en sostenibilidad',
    'Incrementar el engagement en redes sociales en un 60%'
  ]
  
  try {
    const strategy = await aiService.developStrategy(objectives, '6 meses')
    console.log('Estrategia desarrollada:', strategy)
    return strategy
  } catch (error) {
    console.error('Error desarrollando estrategia:', error)
    throw error
  }
}

/**
 * EJEMPLO 7: Uso de tareas asíncronas
 */
export async function exampleAsyncTasks() {
  try {
    // Crear múltiples tareas
    const taskIds = await Promise.all([
      aiService.createTask('content-creator', 'generate-post', {
        topic: 'Inteligencia Artificial en el marketing',
        platform: 'twitter',
        tone: 'casual',
        length: 280
      }),
      aiService.createTask('content-creator', 'generate-hashtags', {
        content: 'La IA está transformando el marketing digital',
        platform: 'instagram'
      }),
      aiService.createTask('brand-strategist', 'analyze-brand', {
        name: 'TechStart',
        industry: 'Tecnología'
      })
    ])
    
    console.log('Tareas creadas:', taskIds)
    
    // Monitorear progreso
    const checkTasks = setInterval(() => {
      taskIds.forEach(taskId => {
        const task = aiService.getTask(taskId)
        if (task) {
          console.log(`Tarea ${taskId}: ${task.status}`)
          if (task.status === 'completed') {
            console.log('Resultado:', task.output)
          } else if (task.status === 'failed') {
            console.log('Error:', task.error)
          }
        }
      })
      
      // Verificar si todas las tareas están completas
      const allCompleted = taskIds.every(taskId => {
        const task = aiService.getTask(taskId)
        return task && (task.status === 'completed' || task.status === 'failed')
      })
      
      if (allCompleted) {
        clearInterval(checkTasks)
        console.log('Todas las tareas completadas')
      }
    }, 1000)
    
    return taskIds
  } catch (error) {
    console.error('Error con tareas asíncronas:', error)
    throw error
  }
}

/**
 * EJEMPLO 8: Monitoreo del sistema
 */
export async function exampleSystemMonitoring() {
  try {
    // Obtener estadísticas del sistema
    const stats = aiService.getSystemStats()
    console.log('Estadísticas del sistema:', stats)
    
    // Obtener métricas de agentes
    const metrics = aiService.getAllMetrics()
    console.log('Métricas de agentes:', metrics)
    
    // Verificar salud del sistema
    const health = await aiService.healthCheck()
    console.log('Estado de salud:', health)
    
    // Obtener agentes disponibles
    const agents = aiService.getAvailableAgents()
    console.log('Agentes disponibles:', agents.map(a => ({ id: a.id, name: a.name, enabled: a.enabled })))
    
    return { stats, metrics, health, agents }
  } catch (error) {
    console.error('Error monitoreando sistema:', error)
    throw error
  }
}

/**
 * EJEMPLO 9: Configuración personalizada de agentes
 */
export async function exampleCustomAgentConfig() {
  try {
    // Registrar un agente personalizado
    aiService.registerCustomAgent({
      id: 'social-media-scheduler',
      name: 'Programador de Redes Sociales',
      description: 'Especializado en programar y optimizar horarios de publicación',
      model: 'gemini-1.5-flash-001',
      temperature: 0.4,
      maxTokens: 2048,
      systemPrompt: 'Eres un experto en programación de contenido para redes sociales. Tu objetivo es optimizar horarios y frecuencias de publicación.',
      capabilities: ['scheduling', 'timing-optimization', 'frequency-analysis'],
      enabled: true
    })
    
    console.log('Agente personalizado registrado')
    
    // Listar todos los agentes incluyendo el nuevo
    const allAgents = aiService.getAvailableAgents()
    console.log('Todos los agentes:', allAgents.map(a => a.name))
    
    return true
  } catch (error) {
    console.error('Error configurando agente personalizado:', error)
    throw error
  }
}

/**
 * EJEMPLO 10: Flujo completo de creación de campaña
 */
export async function exampleCompleteCampaignFlow() {
  try {
    console.log('Iniciando flujo completo de campaña...')
    
    // 1. Analizar la marca
    const brandData = {
      name: 'GreenTech Innovations',
      industry: 'Tecnología verde',
      values: ['Sostenibilidad', 'Innovación', 'Impacto social']
    }
    
    const brandAnalysis = await aiService.analyzeBrand(brandData)
    console.log('1. Análisis de marca completado')
    
    // 2. Desarrollar estrategia
    const objectives = [
      'Lanzar nuevo producto eco-friendly',
      'Aumentar awareness en mercado objetivo',
      'Generar 1000 leads en 3 meses'
    ]
    
    const strategy = await aiService.developStrategy(objectives, '3 meses')
    console.log('2. Estrategia desarrollada')
    
    // 3. Generar contenido para diferentes plataformas
    const platforms = ['linkedin', 'instagram', 'twitter']
    const contentPromises = platforms.map(platform => 
      aiService.generatePost({
        topic: 'Lanzamiento de producto eco-friendly innovador',
        platform,
        tone: 'profesional',
        length: platform === 'twitter' ? 280 : 1500
      })
    )
    
    const contents = await Promise.all(contentPromises)
    console.log('3. Contenido generado para todas las plataformas')
    
    // 4. Generar hashtags para cada contenido
    const hashtagPromises = contents.map((content, index) => 
      aiService.generateHashtags(content, platforms[index])
    )
    
    const hashtags = await Promise.all(hashtagPromises)
    console.log('4. Hashtags generados')
    
    // 5. Compilar resultado final
    const campaignResult = {
      brandAnalysis,
      strategy,
      content: platforms.map((platform, index) => ({
        platform,
        content: contents[index],
        hashtags: hashtags[index]
      }))
    }
    
    console.log('Campaña completa generada:', campaignResult)
    return campaignResult
    
  } catch (error) {
    console.error('Error en flujo de campaña:', error)
    throw error
  }
}

// Exportar todos los ejemplos
export const examples = {
  generatePost: exampleGeneratePost,
  generateHashtags: exampleGenerateHashtags,
  optimizeContent: exampleOptimizeContent,
  generateContentIdeas: exampleGenerateContentIdeas,
  brandAnalysis: exampleBrandAnalysis,
  developStrategy: exampleDevelopStrategy,
  asyncTasks: exampleAsyncTasks,
  systemMonitoring: exampleSystemMonitoring,
  customAgentConfig: exampleCustomAgentConfig,
  completeCampaignFlow: exampleCompleteCampaignFlow
}