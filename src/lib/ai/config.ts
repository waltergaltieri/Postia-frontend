/**
 * Configuración central del sistema de agentes AI
 */

export const AI_CONFIG = {
  // Configuración de API
  GEMINI: {
    API_KEY: process.env.GEMINI_API_KEY,
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
    DEFAULT_MODEL: process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash-001',
    PRO_MODEL: process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro-001',
    VISION_MODEL: process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash-001'
  },

  // Configuración de agentes
  AGENTS: {
    ENABLED: process.env.AI_AGENTS_ENABLED === 'true',
    MAX_CONCURRENT_REQUESTS: parseInt(process.env.AI_MAX_CONCURRENT_REQUESTS || '5'),
    REQUEST_TIMEOUT: parseInt(process.env.AI_REQUEST_TIMEOUT || '30000'),
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },

  // Configuración de modelos por tipo de tarea
  MODEL_MAPPING: {
    'content-generation': process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash-001',
    'brand-analysis': process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro-001',
    'strategy-development': process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro-001',
    'campaign-optimization': process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash-001',
    'visual-analysis': process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash-001',
    'data-interpretation': process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro-001'
  },

  // Configuración de temperatura por tipo de agente
  TEMPERATURE_MAPPING: {
    'content-creator': 0.7,
    'brand-strategist': 0.4,
    'campaign-optimizer': 0.3,
    'visual-content-advisor': 0.6,
    'analytics-interpreter': 0.2
  },

  // Límites de tokens por tipo de tarea
  TOKEN_LIMITS: {
    'short-content': 1024,
    'medium-content': 2048,
    'long-content': 4096,
    'analysis': 6144,
    'strategy': 8192
  },

  // Configuración de plataformas
  PLATFORMS: {
    TWITTER: {
      name: 'twitter',
      maxLength: 280,
      supportsHashtags: true,
      supportsImages: true,
      tone: 'casual'
    },
    INSTAGRAM: {
      name: 'instagram',
      maxLength: 2200,
      supportsHashtags: true,
      supportsImages: true,
      tone: 'visual'
    },
    LINKEDIN: {
      name: 'linkedin',
      maxLength: 3000,
      supportsHashtags: true,
      supportsImages: true,
      tone: 'professional'
    },
    FACEBOOK: {
      name: 'facebook',
      maxLength: 63206,
      supportsHashtags: false,
      supportsImages: true,
      tone: 'friendly'
    }
  },

  // Configuración de tipos de contenido
  CONTENT_TYPES: {
    TEXT_SIMPLE: 'text_simple',
    TEXT_IMAGE_SIMPLE: 'text_image_simple',
    TEXT_IMAGE_TEMPLATE: 'text_image_template',
    CAROUSEL: 'carousel',
    VIDEO: 'video',
    STORY: 'story'
  },

  // Configuración de tonos de voz
  VOICE_TONES: {
    PROFESSIONAL: 'profesional',
    CASUAL: 'casual',
    FRIENDLY: 'amigable',
    AUTHORITATIVE: 'autoritativo',
    CREATIVE: 'creativo',
    EDUCATIONAL: 'educativo',
    INSPIRATIONAL: 'inspiracional',
    HUMOROUS: 'humorístico'
  }
} as const

/**
 * Valida la configuración del sistema
 */
export function validateAIConfig(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Verificar API key de Gemini
  if (!AI_CONFIG.GEMINI.API_KEY) {
    errors.push('GEMINI_API_KEY no está configurada')
  }

  // Verificar que los agentes estén habilitados
  if (!AI_CONFIG.AGENTS.ENABLED) {
    warnings.push('Los agentes AI están deshabilitados')
  }

  // Verificar límites de concurrencia
  if (AI_CONFIG.AGENTS.MAX_CONCURRENT_REQUESTS < 1) {
    errors.push('MAX_CONCURRENT_REQUESTS debe ser mayor a 0')
  }

  if (AI_CONFIG.AGENTS.MAX_CONCURRENT_REQUESTS > 20) {
    warnings.push('MAX_CONCURRENT_REQUESTS muy alto, puede causar problemas de rate limiting')
  }

  // Verificar timeout
  if (AI_CONFIG.AGENTS.REQUEST_TIMEOUT < 5000) {
    warnings.push('REQUEST_TIMEOUT muy bajo, puede causar timeouts prematuros')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Obtiene la configuración para un agente específico
 */
export function getAgentConfig(agentId: string): {
  model: string
  temperature: number
  maxTokens: number
} {
  const model = AI_CONFIG.MODEL_MAPPING[agentId as keyof typeof AI_CONFIG.MODEL_MAPPING] || 
                AI_CONFIG.GEMINI.DEFAULT_MODEL

  const temperature = AI_CONFIG.TEMPERATURE_MAPPING[agentId as keyof typeof AI_CONFIG.TEMPERATURE_MAPPING] || 
                     0.7

  const maxTokens = AI_CONFIG.TOKEN_LIMITS['medium-content']

  return { model, temperature, maxTokens }
}

/**
 * Obtiene la configuración para una plataforma específica
 */
export function getPlatformConfig(platform: string) {
  const platformKey = platform.toUpperCase() as keyof typeof AI_CONFIG.PLATFORMS
  return AI_CONFIG.PLATFORMS[platformKey] || AI_CONFIG.PLATFORMS.LINKEDIN
}

/**
 * Obtiene el límite de tokens para un tipo de contenido
 */
export function getTokenLimit(contentType: string): number {
  const typeKey = contentType.replace('-', '_').toUpperCase() as keyof typeof AI_CONFIG.TOKEN_LIMITS
  return AI_CONFIG.TOKEN_LIMITS[typeKey] || AI_CONFIG.TOKEN_LIMITS['medium-content']
}

/**
 * Configuración de desarrollo/debug
 */
export const DEBUG_CONFIG = {
  ENABLED: process.env.NODE_ENV === 'development',
  LOG_REQUESTS: true,
  LOG_RESPONSES: false, // Puede ser muy verboso
  LOG_METRICS: true,
  MOCK_RESPONSES: false // Para testing sin usar API real
}

/**
 * Configuración de caché (para futuras implementaciones)
 */
export const CACHE_CONFIG = {
  ENABLED: false, // Deshabilitado por ahora
  TTL: 3600, // 1 hora en segundos
  MAX_SIZE: 100, // Máximo número de respuestas en caché
  CACHE_KEYS: {
    CONTENT_GENERATION: 'content_gen',
    BRAND_ANALYSIS: 'brand_analysis',
    HASHTAGS: 'hashtags'
  }
}

export default AI_CONFIG