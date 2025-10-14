/**
 * Configuración centralizada para Gemini AI
 */

export interface GeminiConfig {
  apiKey: string
  baseUrl: string
  defaultModel: string
  proModel: string
  visionModel: string
  maxRetries: number
  retryDelay: number
  timeout: number
}

/**
 * Obtiene la configuración de Gemini desde variables de entorno
 */
export function getGeminiConfig(): GeminiConfig {
  // Intentar obtener la API key desde diferentes fuentes
  let apiKey = ''
  
  if (typeof window !== 'undefined') {
    // En el cliente, usar la variable pública
    apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
  } else {
    // En el servidor, usar la variable privada
    apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
  }

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY no está configurada')
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  // Validar que la API key tenga el formato correcto
  if (!apiKey.startsWith('AIza')) {
    console.error('❌ GEMINI_API_KEY no tiene el formato correcto')
    throw new Error('Invalid GEMINI_API_KEY format')
  }

  console.log('✅ Gemini API Key configurada correctamente')

  return {
    apiKey,
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',
    proModel: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
    visionModel: process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash',
    maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.GEMINI_RETRY_DELAY || '1000'),
    timeout: parseInt(process.env.GEMINI_TIMEOUT || '30000')
  }
}

/**
 * Valida que la configuración de Gemini sea correcta
 */
export function validateGeminiConfig(config: GeminiConfig): boolean {
  try {
    if (!config.apiKey || !config.apiKey.startsWith('AIza')) {
      console.error('❌ API Key inválida')
      return false
    }

    if (!config.baseUrl || !config.baseUrl.startsWith('https://')) {
      console.error('❌ Base URL inválida')
      return false
    }

    if (!config.defaultModel) {
      console.error('❌ Modelo por defecto no especificado')
      return false
    }

    console.log('✅ Configuración de Gemini válida')
    return true
  } catch (error) {
    console.error('❌ Error validando configuración de Gemini:', error)
    return false
  }
}

/**
 * Obtiene la configuración validada de Gemini
 */
export function getValidatedGeminiConfig(): GeminiConfig {
  const config = getGeminiConfig()
  
  if (!validateGeminiConfig(config)) {
    throw new Error('Invalid Gemini configuration')
  }
  
  return config
}