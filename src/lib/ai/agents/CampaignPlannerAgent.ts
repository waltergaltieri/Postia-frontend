import { AgentManager } from './AgentManager'
import { VisualAnalyzerAgent } from './VisualAnalyzerAgent'
import type { 
  CampaignPlannerAgent as ICampaignPlannerAgent,
  CampaignData,
  WorkspaceData,
  ResourceData,
  TemplateData,
  ContentPlanItem
} from './types'

export class CampaignPlannerAgent implements ICampaignPlannerAgent {
  private agentManager: AgentManager
  private visualAnalyzer: VisualAnalyzerAgent

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager
    this.visualAnalyzer = new VisualAnalyzerAgent(agentManager)
  }

  async planCampaignContent(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
  }): Promise<ContentPlanItem[]> {
    const { campaign, workspace, resources, templates } = params

    console.log('🔍 Analyzing resources with Visual AI...')
    
    // PASO 1: Analizar recursos visuales con IA
    const resourceAnalyses = await this.visualAnalyzer.analyzeResources(resources)
    
    console.log('📊 Resource analyses completed:', resourceAnalyses.length)

    // Calcular el número total de publicaciones basado en las fechas y el intervalo
    const startDate = new Date(campaign.startDate)
    const endDate = new Date(campaign.endDate)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalPosts = Math.ceil((totalDays * 24) / campaign.intervalHours)

    // PASO 2: Generar plan con análisis de recursos incluido
    const prompt = this.buildEnhancedCampaignPlanPrompt({
      campaign,
      workspace,
      resources,
      templates,
      totalPosts,
      resourceAnalyses
    })

    try {
      console.log('🤖 Generating campaign plan with Gemini AI...')
      
      const response = await this.agentManager.executeAgentRequest({
        agentId: 'campaign-planner',
        prompt,
        context: {
          campaign,
          workspace,
          resources: resources.map(r => ({ id: r.id, name: r.name, type: r.type })),
          templates: templates.map(t => ({ id: t.id, name: t.name, type: t.type, socialNetworks: t.socialNetworks })),
          resourceAnalyses,
          totalPosts
        }
      })

      return this.parseContentPlanResponse(response.response, campaign, totalPosts)
    } catch (error) {
      console.error('Error planning campaign content:', error)
      throw new Error('No se pudo generar el plan de contenido de la campaña')
    }
  }

  async regenerateContentPlan(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    previousPlan?: ContentPlanItem[]
  }): Promise<ContentPlanItem[]> {
    const { campaign, workspace, resources, templates, previousPlan } = params

    const startDate = new Date(campaign.startDate)
    const endDate = new Date(campaign.endDate)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalPosts = Math.ceil((totalDays * 24) / campaign.intervalHours)

    const prompt = this.buildRegeneratePlanPrompt({
      campaign,
      workspace,
      resources,
      templates,
      totalPosts,
      previousPlan
    })

    try {
      const response = await this.agentManager.executeAgentRequest({
        agentId: 'campaign-planner',
        prompt,
        context: {
          campaign,
          workspace,
          resources: resources.map(r => ({ id: r.id, name: r.name, type: r.type })),
          templates: templates.map(t => ({ id: t.id, name: t.name, type: t.type, socialNetworks: t.socialNetworks })),
          totalPosts,
          previousPlan: previousPlan?.map(p => ({ title: p.title, description: p.description, socialNetwork: p.socialNetwork }))
        }
      })

      return this.parseContentPlanResponse(response.response, campaign, totalPosts)
    } catch (error) {
      console.error('Error regenerating campaign content plan:', error)
      throw new Error('No se pudo regenerar el plan de contenido de la campaña')
    }
  }

  async regenerateSpecificItem(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    itemIndex: number
    previousPlan: ContentPlanItem[]
  }): Promise<ContentPlanItem> {
    const { campaign, workspace, resources, templates, itemIndex, previousPlan } = params

    if (itemIndex < 0 || itemIndex >= previousPlan.length) {
      throw new Error('Índice de elemento inválido')
    }

    const itemToRegenerate = previousPlan[itemIndex]
    
    const prompt = this.buildRegenerateItemPrompt({
      campaign,
      workspace,
      resources,
      templates,
      itemToRegenerate,
      itemIndex,
      previousPlan
    })

    try {
      const response = await this.agentManager.executeAgentRequest({
        agentId: 'campaign-planner',
        prompt,
        context: {
          campaign,
          workspace,
          itemToRegenerate,
          itemIndex,
          previousPlan: previousPlan.map(p => ({ title: p.title, description: p.description, socialNetwork: p.socialNetwork }))
        }
      })

      const newItems = this.parseContentPlanResponse(response.response, campaign, 1)
      if (newItems.length === 0) {
        throw new Error('No se pudo generar el nuevo elemento')
      }

      // Mantener la fecha programada original
      newItems[0].scheduledDate = itemToRegenerate.scheduledDate
      newItems[0].id = itemToRegenerate.id

      return newItems[0]
    } catch (error) {
      console.error('Error regenerating specific content item:', error)
      throw new Error('No se pudo regenerar el elemento específico')
    }
  }

  private buildCampaignPlanPrompt(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    totalPosts: number
  }): string {
    const { campaign, workspace, resources, templates, totalPosts } = params

    // Calcular fechas programadas
    const startDate = new Date(campaign.startDate)
    const scheduledDates = []
    for (let i = 0; i < totalPosts; i++) {
      const date = new Date(startDate)
      date.setHours(date.getHours() + (i * campaign.intervalHours))
      scheduledDates.push(date.toISOString())
    }

    return `
Eres un experto planificador de campañas de marketing digital. Tu tarea es crear un plan detallado de contenido para una campaña de redes sociales.

INFORMACIÓN DE LA MARCA:
- Nombre: ${workspace.name}
- Slogan: "${workspace.branding.slogan}"
- Descripción: ${workspace.branding.description}
- Colores de marca: Primario ${workspace.branding.primaryColor}, Secundario ${workspace.branding.secondaryColor}
- WhatsApp: ${workspace.branding.whatsapp || 'No disponible'}

CONFIGURACIÓN DE LA CAMPAÑA:
- Nombre: "${campaign.name}"
- Objetivo principal: ${campaign.objective}
- Redes sociales objetivo: ${campaign.socialNetworks.join(', ')}
- Intervalo de publicación: cada ${campaign.intervalHours} horas
- Tipo de contenido: ${campaign.contentType}
- Instrucciones específicas del usuario: "${campaign.prompt}"

RECURSOS DISPONIBLES PARA USAR:
${resources.length > 0 ? resources.map((r, index) => `${index + 1}. ID: "${r.id}" | Nombre: "${r.name}" | Tipo: ${r.type} | URL: ${r.url}`).join('\n') : 'No hay recursos específicos disponibles'}

PLANTILLAS DISPONIBLES PARA USAR:
${templates.length > 0 ? templates.map((t, index) => `${index + 1}. ID: "${t.id}" | Nombre: "${t.name}" | Tipo: ${t.type} | Compatible con: ${t.socialNetworks.join(', ')}`).join('\n') : 'No hay plantillas específicas disponibles'}

FECHAS PROGRAMADAS:
${scheduledDates.map((date, index) => `Publicación ${index + 1}: ${new Date(date).toLocaleString('es-ES')}`).join('\n')}

INSTRUCCIONES ESPECÍFICAS:
1. Crea exactamente ${totalPosts} elementos de contenido
2. Para cada elemento, especifica EXACTAMENTE qué recursos usar (por ID) y qué plantilla usar (por ID)
3. Distribuye el contenido entre las redes sociales: ${campaign.socialNetworks.join(', ')}
4. Cada elemento debe incluir: nombre/título, idea del contenido, red social, fecha programada, template específico, recursos específicos
5. Asigna recursos de manera inteligente según el tipo de contenido
6. Usa las plantillas disponibles de manera apropiada según la red social
7. Varía los tipos de contenido: text-only, text-with-image, text-with-carousel
8. Establece prioridades realistas: high, medium, low

EJEMPLO DE RESPUESTA ESPERADA:
{
  "contentPlan": [
    {
      "title": "Lanzamiento Especial Pizza Margherita",
      "description": "Presentamos nuestra pizza estrella con ingredientes frescos importados de Italia. Mostrar el proceso de preparación artesanal y los ingredientes premium que hacen única nuestra Margherita.",
      "socialNetwork": "instagram",
      "templateId": "template-promocional-123",
      "resourceIds": ["recurso-logo-456", "recurso-pizza-789"],
      "contentType": "text-with-carousel",
      "priority": "high",
      "tags": ["pizza", "margherita", "artesanal", "italia", "premium"],
      "notes": "Usar colores de marca ${workspace.branding.primaryColor}. Incluir slogan '${workspace.branding.slogan}'. Destacar ingredientes premium."
    }
  ]
}

IMPORTANTE:
- USA EXACTAMENTE los IDs de recursos y plantillas proporcionados arriba
- Si no hay recursos/plantillas disponibles, usa null o array vacío
- Cada elemento debe ser único y seguir el objetivo: ${campaign.objective}
- Considera las instrucciones específicas: "${campaign.prompt}"

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.
`
  }

  private buildEnhancedCampaignPlanPrompt(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    totalPosts: number
    resourceAnalyses: any[]
  }): string {
    const { campaign, workspace, resources, templates, totalPosts, resourceAnalyses } = params

    // Calcular fechas programadas
    const startDate = new Date(campaign.startDate)
    const scheduledDates = []
    for (let i = 0; i < totalPosts; i++) {
      const date = new Date(startDate)
      date.setHours(date.getHours() + (i * campaign.intervalHours))
      scheduledDates.push({
        index: i + 1,
        date: date.toISOString(),
        formatted: date.toLocaleString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      })
    }

    return `
Eres un experto planificador de campañas de marketing digital. Tu tarea es crear un plan detallado y específico de contenido para una campaña de redes sociales.

INFORMACIÓN DE LA MARCA:
- Nombre: ${workspace.name}
- Slogan: "${workspace.branding.slogan}"
- Descripción: ${workspace.branding.description}
- Colores de marca: Primario ${workspace.branding.primaryColor}, Secundario ${workspace.branding.secondaryColor}

CONFIGURACIÓN DE LA CAMPAÑA:
- Nombre: "${campaign.name}"
- Objetivo principal: ${campaign.objective}
- Redes sociales objetivo: ${campaign.socialNetworks.join(', ')}
- Intervalo de publicación: cada ${campaign.intervalHours} horas
- Instrucciones específicas: "${campaign.prompt}"

ANÁLISIS DETALLADO DE RECURSOS DISPONIBLES:
${resourceAnalyses.length > 0 ? resourceAnalyses.map((analysis, index) => `
${index + 1}. RECURSO: "${analysis.name}" (ID: ${analysis.id})
   - Tipo: ${analysis.type}
   - Descripción: ${analysis.description}
   - Usos sugeridos: ${analysis.suggestedUse.join(', ')}
   - Compatible con: ${analysis.compatibleNetworks.join(', ')}
   - Tipos de contenido: ${analysis.contentTypes.join(', ')}
   - Mood/Ambiente: ${analysis.mood}
   - Elementos visuales: ${analysis.elements.join(', ')}
`).join('\n') : 'No hay recursos específicos disponibles'}

PLANTILLAS DISPONIBLES:
${templates.length > 0 ? templates.map((t, index) => `
${index + 1}. PLANTILLA: "${t.name}" (ID: ${t.id})
   - Tipo: ${t.type}
   - Compatible con redes: ${t.socialNetworks.join(', ')}
`).join('\n') : 'No hay plantillas específicas disponibles'}

CALENDARIO DE PUBLICACIONES:
${scheduledDates.map(slot => `Publicación ${slot.index}: ${slot.formatted}`).join('\n')}

INSTRUCCIONES ESPECÍFICAS:
1. Crea exactamente ${totalPosts} elementos de contenido únicos
2. Para cada elemento especifica:
   - Nombre/título atractivo
   - Idea detallada del contenido
   - Red social específica (${campaign.socialNetworks.join(' o ')})
   - Fecha y hora programada (usar las fechas del calendario)
   - Template específico a usar (ID exacto)
   - Recursos específicos a usar (IDs exactos)
3. Usa INTELIGENTEMENTE los recursos basándote en su análisis
4. Asigna plantillas según compatibilidad con red social
5. Varía tipos de contenido: text-only, text-with-image, text-with-carousel
6. Distribuye equitativamente entre redes sociales
7. Considera el objetivo: ${campaign.objective}
8. Sigue las instrucciones: "${campaign.prompt}"

EJEMPLO DE RESPUESTA REQUERIDA:
{
  "contentPlan": [
    {
      "title": "Presentación Especial: Pizza Artesanal Argentina",
      "description": "Mostrar el proceso artesanal de preparación de nuestra pizza estrella, destacando ingredientes locales premium y la técnica tradicional que nos hace únicos en Argentina. Incluir close-ups del proceso y resultado final.",
      "socialNetwork": "instagram",
      "templateId": "${templates[0]?.id || null}",
      "resourceIds": ["${resources[0]?.id || ''}", "${resources[1]?.id || ''}"],
      "contentType": "text-with-carousel",
      "priority": "high",
      "tags": ["pizza", "artesanal", "argentina", "premium", "tradicional"],
      "notes": "Usar ${workspace.branding.primaryColor} como color principal. Incluir slogan '${workspace.branding.slogan}'. Mostrar proceso paso a paso."
    }
  ]
}

REGLAS IMPORTANTES:
- USA EXACTAMENTE los IDs proporcionados arriba
- Cada elemento debe ser completamente único
- Asigna recursos basándote en su análisis de IA
- Considera compatibilidad de plantillas con redes sociales
- Incluye fechas del calendario proporcionado
- Sigue el objetivo: ${campaign.objective}

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.
`
  }

  private buildRegeneratePlanPrompt(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    totalPosts: number
    previousPlan?: ContentPlanItem[]
  }): string {
    const basePrompt = this.buildCampaignPlanPrompt(params)
    
    if (params.previousPlan && params.previousPlan.length > 0) {
      return basePrompt + `

PLAN ANTERIOR (para referencia y mejora):
${params.previousPlan.map((item, index) => 
  `${index + 1}. ${item.title} - ${item.socialNetwork} - ${item.description.substring(0, 100)}...`
).join('\n')}

Genera un plan completamente nuevo y mejorado, evitando repetir exactamente las mismas ideas del plan anterior.
`
    }

    return basePrompt
  }

  private buildRegenerateItemPrompt(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    itemToRegenerate: ContentPlanItem
    itemIndex: number
    previousPlan: ContentPlanItem[]
  }): string {
    const { campaign, workspace, resources, templates, itemToRegenerate, itemIndex, previousPlan } = params

    return `
Eres un experto planificador de campañas de marketing digital. Tu tarea es regenerar UN SOLO elemento específico de un plan de contenido.

INFORMACIÓN DE LA MARCA:
- Nombre: ${workspace.name}
- Slogan: ${workspace.branding.slogan}
- Descripción: ${workspace.branding.description}
- Colores: Primario ${workspace.branding.primaryColor}, Secundario ${workspace.branding.secondaryColor}

CONFIGURACIÓN DE LA CAMPAÑA:
- Nombre: ${campaign.name}
- Objetivo: ${campaign.objective}
- Redes sociales: ${campaign.socialNetworks.join(', ')}
- Tipo de contenido: ${campaign.contentType}
- Prompt personalizado: ${campaign.prompt}

ELEMENTO A REGENERAR (posición ${itemIndex + 1}):
- Título actual: ${itemToRegenerate.title}
- Descripción actual: ${itemToRegenerate.description}
- Red social: ${itemToRegenerate.socialNetwork}
- Tipo: ${itemToRegenerate.contentType}

CONTEXTO DEL PLAN COMPLETO:
${previousPlan.map((item, index) => 
  `${index + 1}. ${item.title} - ${item.socialNetwork}${index === itemIndex ? ' [ESTE ELEMENTO]' : ''}`
).join('\n')}

RECURSOS DISPONIBLES:
${resources.map(r => `- ${r.name} (${r.type})`).join('\n')}

PLANTILLAS DISPONIBLES:
${templates.map(t => `- ${t.name} (${t.type}) - Redes: ${t.socialNetworks.join(', ')}`).join('\n')}

INSTRUCCIONES:
1. Genera UN SOLO elemento de contenido nuevo y diferente
2. Mantén la red social original: ${itemToRegenerate.socialNetwork}
3. Asegúrate de que sea coherente con el resto del plan
4. Haz que sea único y no repetitivo respecto a los otros elementos
5. Considera la posición en la secuencia de la campaña

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido:
{
  "contentPlan": [
    {
      "title": "Nuevo título del contenido",
      "description": "Nueva descripción detallada del contenido",
      "socialNetwork": "${itemToRegenerate.socialNetwork}",
      "templateId": "id_de_plantilla_o_null",
      "resourceIds": ["id1", "id2"],
      "contentType": "text-only|text-with-image|text-with-carousel",
      "priority": "high|medium|low",
      "tags": ["tag1", "tag2", "tag3"],
      "notes": "Notas adicionales opcionales"
    }
  ]
}

NO incluyas texto adicional, solo el JSON.
`
  }

  private parseContentPlanResponse(response: string, campaign: CampaignData, totalPosts: number): ContentPlanItem[] {
    try {
      // Limpiar la respuesta para extraer solo el JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      if (!parsed.contentPlan || !Array.isArray(parsed.contentPlan)) {
        throw new Error('Formato de respuesta inválido')
      }

      const startDate = new Date(campaign.startDate)
      const items: ContentPlanItem[] = []

      parsed.contentPlan.forEach((item: any, index: number) => {
        // Calcular la fecha programada basada en el intervalo
        const scheduledDate = new Date(startDate)
        scheduledDate.setHours(scheduledDate.getHours() + (index * campaign.intervalHours))

        const contentItem: ContentPlanItem = {
          id: `content-${Date.now()}-${index}`,
          title: item.title || `Contenido ${index + 1}`,
          description: item.description || 'Descripción del contenido',
          socialNetwork: item.socialNetwork || campaign.socialNetworks[index % campaign.socialNetworks.length],
          scheduledDate: scheduledDate.toISOString(),
          templateId: item.templateId || undefined,
          resourceIds: Array.isArray(item.resourceIds) ? item.resourceIds : [],
          contentType: item.contentType || 'text-only',
          priority: item.priority || 'medium',
          tags: Array.isArray(item.tags) ? item.tags : [],
          notes: item.notes || undefined
        }

        items.push(contentItem)
      })

      return items.slice(0, totalPosts) // Asegurar que no excedamos el número esperado
    } catch (error) {
      console.error('Error parsing content plan response:', error)
      
      // Si falla el parsing, propagar el error
      throw new Error('No se pudo procesar la respuesta de Gemini AI. Intenta nuevamente.')
    }
  }


}