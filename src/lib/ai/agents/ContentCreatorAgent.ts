import { AgentManager, AgentRequest } from './AgentManager'
import { ContentCreatorAgent as IContentCreatorAgent } from './types'

export class ContentCreatorAgent implements IContentCreatorAgent {
  private agentManager: AgentManager
  private agentId = 'content-creator'

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager
  }

  async generatePost(params: {
    topic: string
    platform: string
    tone: string
    length: number
  }): Promise<string> {
    const prompt = `
Crea una publicación para ${params.platform} sobre el tema: "${params.topic}"

ESPECIFICACIONES:
- Tono: ${params.tone}
- Longitud aproximada: ${params.length} caracteres
- Plataforma: ${params.platform}

REQUISITOS:
1. Debe ser atractivo y engaging
2. Apropiado para la plataforma especificada
3. Incluir call-to-action si es relevante
4. Usar el tono especificado consistentemente
5. Respetar las mejores prácticas de ${params.platform}

Responde únicamente con el texto de la publicación, sin formato adicional.
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        platform: params.platform,
        topic: params.topic,
        tone: params.tone,
        targetLength: params.length
      },
      options: {
        temperature: 0.7,
        maxTokens: 1024
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    return response.response.trim()
  }

  async generateHashtags(content: string, platform: string): Promise<string[]> {
    const prompt = `
Analiza el siguiente contenido y genera hashtags relevantes para ${platform}:

CONTENIDO:
"${content}"

REQUISITOS:
1. Genera entre 5-15 hashtags relevantes
2. Incluye hashtags populares y de nicho
3. Asegúrate de que sean apropiados para ${platform}
4. Evita hashtags demasiado genéricos
5. Incluye hashtags de tendencia si son relevantes

Responde únicamente con los hashtags separados por comas, sin el símbolo #.
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        platform,
        contentLength: content.length
      },
      options: {
        temperature: 0.6,
        maxTokens: 512
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    return response.response
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
  }

  async optimizeContent(content: string, platform: string): Promise<string> {
    const prompt = `
Optimiza el siguiente contenido para ${platform}:

CONTENIDO ORIGINAL:
"${content}"

TAREAS DE OPTIMIZACIÓN:
1. Mejorar el engagement y atractivo
2. Optimizar para las características específicas de ${platform}
3. Mejorar la estructura y legibilidad
4. Añadir elementos que aumenten la interacción
5. Mantener el mensaje principal intacto

PLATAFORMA: ${platform}

Responde únicamente con el contenido optimizado, sin explicaciones adicionales.
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        platform,
        originalContent: content,
        optimizationType: 'engagement'
      },
      options: {
        temperature: 0.5,
        maxTokens: 1024
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    return response.response.trim()
  }

  async generateContentIdeas(params: {
    topic: string
    platform: string
    count: number
    audience?: string
  }): Promise<string[]> {
    const prompt = `
Genera ${params.count} ideas de contenido sobre "${params.topic}" para ${params.platform}.

${params.audience ? `AUDIENCIA OBJETIVO: ${params.audience}` : ''}

REQUISITOS:
1. Ideas creativas y originales
2. Apropiadas para ${params.platform}
3. Variedad en tipos de contenido
4. Potencial de engagement alto
5. Relevantes para el tema principal

Responde con una lista numerada de ideas, una por línea.
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        topic: params.topic,
        platform: params.platform,
        audience: params.audience,
        requestedCount: params.count
      },
      options: {
        temperature: 0.8,
        maxTokens: 1024
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    return response.response
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  async adaptContentForPlatform(content: string, fromPlatform: string, toPlatform: string): Promise<string> {
    const prompt = `
Adapta el siguiente contenido de ${fromPlatform} para ${toPlatform}:

CONTENIDO ORIGINAL (${fromPlatform}):
"${content}"

TAREAS:
1. Ajustar el formato para ${toPlatform}
2. Modificar el tono si es necesario
3. Ajustar la longitud según las mejores prácticas
4. Adaptar hashtags y menciones
5. Optimizar para las características específicas de ${toPlatform}

Responde únicamente con el contenido adaptado.
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        fromPlatform,
        toPlatform,
        originalContent: content,
        adaptationType: 'cross-platform'
      },
      options: {
        temperature: 0.6,
        maxTokens: 1024
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    return response.response.trim()
  }

  async generateCaptions(params: {
    imageDescription: string
    platform: string
    tone: string
    includeHashtags?: boolean
  }): Promise<string> {
    const prompt = `
Crea un caption para una imagen en ${params.platform}.

DESCRIPCIÓN DE LA IMAGEN:
"${params.imageDescription}"

ESPECIFICACIONES:
- Tono: ${params.tone}
- Plataforma: ${params.platform}
- ${params.includeHashtags ? 'Incluir hashtags relevantes' : 'Sin hashtags'}

REQUISITOS:
1. Caption atractivo y relevante
2. Apropiado para la imagen descrita
3. Optimizado para ${params.platform}
4. Usar el tono especificado
5. Incluir call-to-action si es apropiado

Responde únicamente con el caption.
`

    const request: AgentRequest = {
      agentId: this.agentId,
      prompt,
      context: {
        platform: params.platform,
        tone: params.tone,
        imageDescription: params.imageDescription,
        includeHashtags: params.includeHashtags
      },
      options: {
        temperature: 0.7,
        maxTokens: 512
      }
    }

    const response = await this.agentManager.executeAgentRequest(request)
    return response.response.trim()
  }
}