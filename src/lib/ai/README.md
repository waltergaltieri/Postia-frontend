# Sistema de Agentes AI - Postia

Este sistema proporciona una arquitectura robusta y escalable para múltiples agentes de inteligencia artificial especializados en marketing digital y gestión de contenido.

## 🚀 Características Principales

- **Múltiples Agentes Especializados**: Cada agente está optimizado para tareas específicas
- **Gestión de Concurrencia**: Control inteligente de solicitudes simultáneas
- **Sistema de Métricas**: Monitoreo completo del rendimiento de cada agente
- **Tareas Asíncronas**: Ejecución de tareas en background con seguimiento de estado
- **Configuración Flexible**: Agentes personalizables y configurables
- **Health Monitoring**: Verificación automática del estado del sistema

## 🤖 Agentes Disponibles

### 1. Content Creator Agent (`content-creator`)
Especializado en creación de contenido para redes sociales.

**Capacidades:**
- Generación de publicaciones
- Creación de hashtags
- Optimización de contenido
- Generación de ideas
- Adaptación cross-platform
- Creación de captions

### 2. Brand Strategist Agent (`brand-strategist`)
Experto en estrategia de marca y posicionamiento.

**Capacidades:**
- Análisis SWOT de marca
- Desarrollo de estrategias
- Análisis competitivo
- Generación de guías de marca
- Evaluación de salud de marca
- Creación de positioning statements

### 3. Campaign Optimizer Agent (`campaign-optimizer`)
Especializado en optimización y análisis de campañas.

**Capacidades:**
- Análisis de rendimiento
- Optimización de campañas
- Análisis de datos
- Predicción de performance

### 4. Visual Content Advisor Agent (`visual-content-advisor`)
Experto en contenido visual y diseño.

**Capacidades:**
- Planificación visual
- Descripción de imágenes
- Guía de diseño
- Optimización visual

### 5. Analytics Interpreter Agent (`analytics-interpreter`)
Especializado en interpretación de métricas y analytics.

**Capacidades:**
- Interpretación de datos
- Generación de insights
- Creación de reportes
- Análisis de tendencias

## 📦 Instalación y Configuración

### 1. Variables de Entorno

Asegúrate de tener configuradas las siguientes variables en tu archivo `.env.local`:

```env
# API Keys
GEMINI_API_KEY=tu_api_key_aqui

# Modelos Gemini
GEMINI_DEFAULT_MODEL=gemini-1.5-flash
GEMINI_PRO_MODEL=gemini-1.5-pro
GEMINI_VISION_MODEL=gemini-1.5-flash

# Configuración de Agentes
AI_AGENTS_ENABLED=true
AI_MAX_CONCURRENT_REQUESTS=5
AI_REQUEST_TIMEOUT=30000
```

### 2. Uso Básico

```typescript
import { getAIAgentService } from '@/lib/ai'

// Obtener instancia del servicio
const aiService = getAIAgentService()

// Generar contenido
const post = await aiService.generatePost({
  topic: 'Marketing digital para PyMEs',
  platform: 'linkedin',
  tone: 'profesional',
  length: 1500
})

// Analizar marca
const analysis = await aiService.analyzeBrand(brandData)
```

## 🔧 API Reference

### AIAgentService

#### Métodos de Gestión de Agentes

```typescript
// Listar agentes disponibles
getAvailableAgents(): AgentConfig[]

// Listar agentes habilitados
getEnabledAgents(): AgentConfig[]

// Obtener agente específico
getAgent(agentId: string): AgentConfig | undefined

// Habilitar/deshabilitar agente
toggleAgent(agentId: string, enabled: boolean): boolean

// Registrar agente personalizado
registerCustomAgent(config: AgentConfig): void
```

#### Métodos del Content Creator Agent

```typescript
// Generar publicación
generatePost(params: {
  topic: string
  platform: string
  tone: string
  length: number
}): Promise<string>

// Generar hashtags
generateHashtags(content: string, platform: string): Promise<string[]>

// Optimizar contenido
optimizeContent(content: string, platform: string): Promise<string>

// Generar ideas de contenido
generateContentIdeas(params: {
  topic: string
  platform: string
  count: number
  audience?: string
}): Promise<string[]>
```

#### Métodos del Brand Strategist Agent

```typescript
// Analizar marca
analyzeBrand(brandData: any): Promise<{
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  recommendations: string[]
}>

// Desarrollar estrategia
developStrategy(objectives: string[], timeframe: string): Promise<{
  strategy: string
  tactics: string[]
  kpis: string[]
}>
```

#### Gestión de Tareas Asíncronas

```typescript
// Crear tarea
createTask(agentId: string, type: string, input: any): Promise<string>

// Obtener estado de tarea
getTask(taskId: string): AgentTask | undefined

// Listar todas las tareas
getAllTasks(): AgentTask[]

// Listar tareas por agente
getTasksByAgent(agentId: string): AgentTask[]
```

#### Métricas y Monitoreo

```typescript
// Obtener métricas de agente
getAgentMetrics(agentId: string): AgentMetrics | undefined

// Obtener todas las métricas
getAllMetrics(): AgentMetrics[]

// Obtener estadísticas del sistema
getSystemStats(): SystemStats

// Verificar salud del sistema
healthCheck(): Promise<HealthStatus>
```

## 📊 Tipos de Datos

### AgentConfig

```typescript
interface AgentConfig {
  id: string
  name: string
  description: string
  model: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  capabilities: string[]
  enabled: boolean
}
```

### AgentTask

```typescript
interface AgentTask {
  id: string
  agentId: string
  type: string
  input: any
  output?: any
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  error?: string
  metadata?: Record<string, any>
}
```

### AgentMetrics

```typescript
interface AgentMetrics {
  agentId: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  totalTokensUsed: number
  lastUsed: Date
}
```

## 🎯 Ejemplos de Uso

### Ejemplo 1: Generación de Contenido Básica

```typescript
import { getAIAgentService } from '@/lib/ai'

const aiService = getAIAgentService()

async function createSocialMediaPost() {
  const post = await aiService.generatePost({
    topic: 'Beneficios del trabajo remoto',
    platform: 'linkedin',
    tone: 'profesional',
    length: 1200
  })
  
  const hashtags = await aiService.generateHashtags(post, 'linkedin')
  
  return {
    content: post,
    hashtags: hashtags
  }
}
```

### Ejemplo 2: Análisis de Marca Completo

```typescript
async function performBrandAnalysis() {
  const brandData = {
    name: 'TechStart',
    industry: 'Tecnología',
    values: ['Innovación', 'Calidad', 'Transparencia'],
    mission: 'Democratizar la tecnología',
    targetAudience: 'Startups y PyMEs'
  }
  
  const analysis = await aiService.analyzeBrand(brandData)
  
  const strategy = await aiService.developStrategy([
    'Aumentar reconocimiento de marca',
    'Generar leads cualificados',
    'Posicionarse como líder tecnológico'
  ], '6 meses')
  
  return { analysis, strategy }
}
```

### Ejemplo 3: Flujo de Trabajo con Tareas Asíncronas

```typescript
async function createCampaignContent() {
  // Crear múltiples tareas en paralelo
  const tasks = await Promise.all([
    aiService.createTask('content-creator', 'generate-post', {
      topic: 'Lanzamiento de producto',
      platform: 'instagram',
      tone: 'casual',
      length: 800
    }),
    aiService.createTask('content-creator', 'generate-post', {
      topic: 'Lanzamiento de producto',
      platform: 'linkedin',
      tone: 'profesional',
      length: 1500
    }),
    aiService.createTask('brand-strategist', 'analyze-brand', brandData)
  ])
  
  // Monitorear progreso
  const results = []
  for (const taskId of tasks) {
    let task
    do {
      await new Promise(resolve => setTimeout(resolve, 1000))
      task = aiService.getTask(taskId)
    } while (task && task.status === 'pending' || task.status === 'running')
    
    if (task?.status === 'completed') {
      results.push(task.output)
    }
  }
  
  return results
}
```

## 🔧 Configuración Avanzada

### Crear Agente Personalizado

```typescript
// Registrar un agente personalizado
aiService.registerCustomAgent({
  id: 'email-marketer',
  name: 'Email Marketing Specialist',
  description: 'Especializado en campañas de email marketing',
  model: 'gemini-1.5-pro',
  temperature: 0.6,
  maxTokens: 4096,
  systemPrompt: 'Eres un experto en email marketing...',
  capabilities: ['email-creation', 'subject-optimization', 'segmentation'],
  enabled: true
})
```

### Configurar Límites de Concurrencia

```typescript
// El límite se configura via variable de entorno
// AI_MAX_CONCURRENT_REQUESTS=10

// O al crear el servicio manualmente
const customService = new AIAgentService()
// El constructor usa la variable de entorno automáticamente
```

## 📈 Monitoreo y Métricas

### Verificar Estado del Sistema

```typescript
async function monitorSystem() {
  // Estadísticas generales
  const stats = aiService.getSystemStats()
  console.log('Agentes activos:', stats.enabledAgents)
  console.log('Solicitudes en cola:', stats.queuedRequests)
  
  // Métricas por agente
  const metrics = aiService.getAllMetrics()
  metrics.forEach(metric => {
    console.log(`${metric.agentId}: ${metric.successfulRequests}/${metric.totalRequests} exitosas`)
  })
  
  // Verificar salud
  const health = await aiService.healthCheck()
  console.log('Estado del sistema:', health.status)
}
```

## 🚨 Manejo de Errores

```typescript
try {
  const result = await aiService.generatePost(params)
} catch (error) {
  if (error.message.includes('API_ERROR')) {
    // Error de API de Gemini
    console.error('Error de API:', error)
  } else if (error.message.includes('RATE_LIMIT')) {
    // Límite de velocidad excedido
    console.error('Rate limit excedido, reintentando...')
  } else {
    // Otros errores
    console.error('Error desconocido:', error)
  }
}
```

## 🔄 Mejores Prácticas

1. **Usa el patrón Singleton**: Siempre usa `getAIAgentService()` en lugar de crear nuevas instancias
2. **Maneja errores apropiadamente**: Implementa retry logic para errores temporales
3. **Monitorea métricas**: Revisa regularmente las métricas de rendimiento
4. **Configura límites**: Ajusta los límites de concurrencia según tu uso
5. **Usa tareas asíncronas**: Para operaciones largas o múltiples solicitudes
6. **Personaliza agentes**: Crea agentes específicos para tus necesidades

## 🔮 Roadmap

- [ ] Soporte para más modelos de IA (OpenAI, Claude)
- [ ] Sistema de plugins para agentes
- [ ] Workflows automatizados
- [ ] Integración con bases de datos vectoriales
- [ ] Sistema de aprendizaje y mejora continua
- [ ] Dashboard web para monitoreo
- [ ] API REST para integración externa

## 🤝 Contribuir

Para contribuir al sistema de agentes:

1. Crea nuevos agentes en `/src/lib/ai/agents/`
2. Implementa las interfaces correspondientes
3. Añade tests en `/src/lib/ai/__tests__/`
4. Actualiza la documentación
5. Añade ejemplos de uso

## 📝 Licencia

Este sistema es parte del proyecto Postia y sigue la misma licencia del proyecto principal.