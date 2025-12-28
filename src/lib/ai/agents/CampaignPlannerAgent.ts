import { AgentManager } from './AgentManager'
import { VisualAnalyzerAgent } from './VisualAnalyzerAgent'
import { SemanticResourceAnalyzerAgent } from './SemanticResourceAnalyzerAgent'
import { getClientResourceAnalysisService } from '../services/ClientResourceAnalysisService'
import type {
  CampaignPlannerAgent as ICampaignPlannerAgent,
  CampaignData,
  WorkspaceData,
  ResourceData,
  TemplateData,
  ContentPlanItem
} from './types'

// Tipos extendidos para incluir análisis de IA
interface ResourceWithAnalysis extends ResourceData {
  aiAnalysis?: {
    description: string
    suggestedUse: string[]
    compatibleNetworks: string[]
    mood: string
    colors: string[]
    elements: string[]
  } | null
}

interface TemplateWithAnalysis extends TemplateData {
  aiAnalysis?: {
    layoutStrengths: string[]
    textCapacity: {
      headline: string
      subhead: string
      cta: string
    }
    networkAptitude: Record<string, string>
    businessObjectiveSuitability: Record<string, string>
  } | null
}

export class CampaignPlannerAgent implements ICampaignPlannerAgent {
  private agentManager: AgentManager
  private visualAnalyzer: VisualAnalyzerAgent
  private semanticAnalyzer: SemanticResourceAnalyzerAgent

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager
    this.visualAnalyzer = new VisualAnalyzerAgent(agentManager)
    this.semanticAnalyzer = new SemanticResourceAnalyzerAgent(agentManager)
  }

  async planCampaignContent(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
  }): Promise<ContentPlanItem[]> {
    const { campaign, workspace, resources, templates } = params

    console.log('� AOPTIMIZED: Using pre-computed analyses instead of generating new ones')

    // PASO 1: Obtener análisis pre-computados (mucho más rápido)
    const analysisService = getClientResourceAnalysisService()

    console.log('📊 Looking up cached resource analyses...')
    const cachedResourceAnalyses = await analysisService.getCachedResourceAnalyses(
      resources.map(r => r.id),
      workspace.id
    )

    console.log('🎨 Looking up cached template analyses...')
    const cachedTemplateAnalyses = await analysisService.getCachedTemplateAnalyses(
      templates.map(t => t.id),
      workspace.id
    )

    // PASO 1.5: Solo analizar recursos/plantillas que no tienen análisis previo
    const resourcesNeedingAnalysis = resources.filter(r => !cachedResourceAnalyses[r.id])
    const templatesNeedingAnalysis = templates.filter(t => !cachedTemplateAnalyses[t.id])

    console.log(`📊 Analysis status:`)
    console.log(`   ✅ Resources with cached analysis: ${Object.keys(cachedResourceAnalyses).length}/${resources.length}`)
    console.log(`   🔄 Resources needing analysis: ${resourcesNeedingAnalysis.length}`)
    console.log(`   ✅ Templates with cached analysis: ${Object.keys(cachedTemplateAnalyses).length}/${templates.length}`)
    console.log(`   🔄 Templates needing analysis: ${templatesNeedingAnalysis.length}`)

    // Generar análisis solo para elementos nuevos (si los hay)
    let newResourceAnalyses: any[] = []
    let newSemanticAnalysis: any = { resources: [], templates: [] }

    if (resourcesNeedingAnalysis.length > 0 || templatesNeedingAnalysis.length > 0) {
      console.log('🔍 Analyzing new resources/templates...')

      if (resourcesNeedingAnalysis.length > 0) {
        newResourceAnalyses = await this.visualAnalyzer.analyzeResources(resourcesNeedingAnalysis)
      }

      if (resourcesNeedingAnalysis.length > 0 || templatesNeedingAnalysis.length > 0) {
        newSemanticAnalysis = await this.semanticAnalyzer.analyzeResourcesAndTemplates({
          resources: resourcesNeedingAnalysis,
          templates: templatesNeedingAnalysis,
          workspace,
          restrictions: [],
          campaignId: campaign.id
        })
      }
    }

    // Calcular el número total de publicaciones basado en las fechas y el intervalo
    const startDate = new Date(campaign.startDate)
    const endDate = new Date(campaign.endDate)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalPosts = Math.ceil((totalDays * 24) / campaign.intervalHours)

    // PASO 2: Filtrar plantillas según las seleccionadas en la campaña
    console.log('🔍 DEBUG: Campaign templateIds:', campaign.templateIds)
    console.log('🔍 DEBUG: Available templates:', templates.map(t => `${t.id}: ${t.name}`))

    let selectedTemplates = templates
    if (campaign.templateIds && campaign.templateIds.length > 0) {
      selectedTemplates = templates.filter(t => campaign.templateIds!.includes(t.id))
      console.log('🎯 Using campaign-specific templates:', campaign.templateIds)
      console.log('🎯 Filtered templates:', selectedTemplates.map(t => `${t.id}: ${t.name}`))
    } else {
      console.log('⚠️ No specific templates selected, using all available templates')
      console.log('📋 All available templates:', templates.map(t => `${t.id}: ${t.name}`))
    }

    // Combinar análisis cached + nuevos para crear análisis completos
    const allResourceAnalyses = [
      ...Object.values(cachedResourceAnalyses).map(cached => cached.visualAnalysis),
      ...newResourceAnalyses
    ]

    const allSemanticAnalysis = {
      resources: [
        ...Object.values(cachedResourceAnalyses).map(cached => cached.semanticAnalysis).filter(Boolean),
        ...newSemanticAnalysis.resources
      ],
      templates: [
        ...Object.values(cachedTemplateAnalyses).map(cached => cached.semanticAnalysis).filter(Boolean),
        ...newSemanticAnalysis.templates
      ],
      campaignId: campaign.id,
      analysisTimestamp: new Date().toISOString()
    }

    // � CLAAVE: Crear mapeo de recursos con sus análisis detallados para el prompt
    const resourcesWithAnalysis: ResourceWithAnalysis[] = resources.map(resource => {
      const cachedAnalysis = cachedResourceAnalyses[resource.id]
      const newAnalysis = newResourceAnalyses.find(analysis => analysis.id === resource.id)

      const analysis = cachedAnalysis?.visualAnalysis || newAnalysis

      return {
        ...resource,
        aiAnalysis: analysis ? {
          description: analysis.description,
          suggestedUse: analysis.suggestedUse,
          compatibleNetworks: analysis.compatibleNetworks,
          mood: analysis.mood,
          colors: analysis.colors,
          elements: analysis.elements
        } : null
      }
    })

    // 🎨 CLAVE: Crear mapeo de plantillas con sus análisis detallados para el prompt
    const templatesWithAnalysis: TemplateWithAnalysis[] = selectedTemplates.map(template => {
      const cachedAnalysis = cachedTemplateAnalyses[template.id]
      const newAnalysis = newSemanticAnalysis.templates.find((analysis: any) => analysis.templateId === template.id)

      const analysis = cachedAnalysis?.semanticAnalysis || newAnalysis

      return {
        ...template,
        aiAnalysis: analysis ? {
          layoutStrengths: analysis.layoutStrengths,
          textCapacity: analysis.textCapacity,
          networkAptitude: analysis.networkAptitude,
          businessObjectiveSuitability: analysis.businessObjectiveSuitability
        } : null
      }
    })

    console.log('⚡ PERFORMANCE BOOST: Using cached analyses reduced processing time significantly!')
    console.log('📊 Final analysis counts:', {
      resourceAnalyses: allResourceAnalyses.length,
      semanticResources: allSemanticAnalysis.resources.length,
      semanticTemplates: allSemanticAnalysis.templates.length
    })

    // PASO 3: Validar disponibilidad de recursos y plantillas
    console.log('🔍 Validating resources and templates...')
    console.log(`📊 Available resources: ${resources.length}`)
    console.log(`🎨 Total templates: ${templates.length}`)
    console.log(`🎯 Selected templates: ${selectedTemplates.length}`)

    if (resources.length > 0) {
      console.log('📋 Resources:', resources.map(r => `${r.name} (${r.type})`).join(', '))
    }

    if (selectedTemplates.length > 0) {
      console.log('🎨 Selected Templates:', selectedTemplates.map(t => `${t.name} (${t.type}) - ${t.socialNetworks.join(', ')}`).join(', '))
      console.log('🎨 Template IDs:', selectedTemplates.map(t => `${t.id}: ${t.name}`).join(', '))
    } else {
      console.warn('⚠️ No templates selected for this campaign')
    }

    // PASO 4: Generar plan con análisis de recursos incluido
    console.log('🚀 Sending to prompt generation with templates:', selectedTemplates.map(t => `${t.id}: ${t.name} (${t.type})`))

    const prompt = this.buildEnhancedCampaignPlanPrompt({
      campaign,
      workspace,
      resources: resourcesWithAnalysis, // 🎯 Recursos con análisis detallados
      templates: templatesWithAnalysis, // 🎨 Plantillas con análisis detallados
      totalPosts,
      resourceAnalyses: allResourceAnalyses,
      semanticAnalysis: allSemanticAnalysis
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
          templates: selectedTemplates.map(t => ({ id: t.id, name: t.name, type: t.type, socialNetworks: t.socialNetworks })),
          resourceAnalyses: allResourceAnalyses,
          totalPosts
        }
      })

      const contentPlan = this.parseContentPlanResponse(response.response, campaign, totalPosts)

      // PASO 5: Validar el plan generado
      this.validateGeneratedPlan(contentPlan, resources, selectedTemplates)

      return contentPlan
    } catch (error) {
      console.error('Error planning campaign content:', error)
      throw new Error('No se pudo generar el plan de contenido de la campaña')
    }
  }

  private validateGeneratedPlan(contentPlan: ContentPlanItem[], resources: ResourceData[], templates: TemplateData[]): void {
    console.log('🔍 Validating generated content plan...')

    const stats = {
      textOnly: 0,
      textWithImage: 0,
      textWithCarousel: 0,
      templatesUsed: new Set<string>(),
      resourcesUsed: new Set<string>(),
      designLibre: 0
    }

    contentPlan.forEach((item, index) => {
      // Contar tipos de contenido
      if (item.contentType === 'text-only') stats.textOnly++
      else if (item.contentType === 'text-with-image') stats.textWithImage++
      else if (item.contentType === 'text-with-carousel') stats.textWithCarousel++

      // Contar plantillas usadas
      if (item.templateId) {
        stats.templatesUsed.add(item.templateId)
      } else {
        stats.designLibre++
      }

      // Contar recursos usados
      item.resourceIds?.forEach(resourceId => {
        if (resourceId) stats.resourcesUsed.add(resourceId)
      })

      // Validar consistencia
      if (item.contentType === 'text-only' && item.resourceIds && item.resourceIds.length > 0) {
        console.warn(`⚠️ Item ${index + 1}: text-only no debería tener recursos`)
      }

      if (item.contentType === 'text-with-image' && item.resourceIds && item.resourceIds.length > 1) {
        console.warn(`⚠️ Item ${index + 1}: text-with-image debería tener máximo 1 recurso`)
      }

      if (item.contentType === 'text-with-carousel' && item.resourceIds && item.resourceIds.length < 2) {
        console.warn(`⚠️ Item ${index + 1}: text-with-carousel debería tener al menos 2 recursos`)
      }
    })

    console.log('📊 Plan validation results:')
    console.log(`   📝 Text-only: ${stats.textOnly} (${Math.round(stats.textOnly / contentPlan.length * 100)}%)`)
    console.log(`   🖼️ Text-with-image: ${stats.textWithImage} (${Math.round(stats.textWithImage / contentPlan.length * 100)}%)`)
    console.log(`   🎠 Text-with-carousel: ${stats.textWithCarousel} (${Math.round(stats.textWithCarousel / contentPlan.length * 100)}%)`)
    console.log(`   🎨 Templates used: ${stats.templatesUsed.size}/${templates.length}`)
    console.log(`   📷 Resources used: ${stats.resourcesUsed.size}/${resources.length}`)
    console.log(`   🎨 Diseño libre: ${stats.designLibre}`)

    // Mostrar detalles de cada item para debug
    console.log('📋 Detailed plan breakdown:')
    contentPlan.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.title}`)
      console.log(`      Type: ${item.contentType}`)
      console.log(`      Template: ${item.templateId || 'DISEÑO LIBRE'}`)
      console.log(`      Resources: ${item.resourceIds?.length || 0}`)
    })

    // Alertas si hay problemas
    if (stats.textOnly === 0) {
      console.warn('⚠️ No se generó contenido text-only')
    }

    if (stats.templatesUsed.size === 0 && templates.length > 0) {
      console.warn('⚠️ No se usaron plantillas disponibles')
    }

    if (stats.resourcesUsed.size === 0 && resources.length > 0) {
      console.warn('⚠️ No se usaron recursos disponibles')
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

    // Crear mapeo de compatibilidad plantilla-red social
    const templateCompatibility = templates.map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      networks: t.socialNetworks,
      compatibleContentTypes: t.type === 'carousel' ? ['text-with-carousel'] : ['text-only', 'text-with-image']
    }))

    // Crear ejemplos dinámicos con IDs reales
    const singleTemplate = templates.find(t => t.type === 'single')
    const firstResource = resources[0]

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
- Instrucciones específicas del usuario: "${campaign.prompt}"

RECURSOS DISPONIBLES PARA USAR:
${resources.length > 0 ? resources.map((r, index) => `${index + 1}. ID: "${r.id}" | Nombre: "${r.name}" | Tipo: ${r.type} | URL: ${r.url}`).join('\n') : 'No hay recursos específicos disponibles'}

PLANTILLAS DISPONIBLES CON COMPATIBILIDAD:
${templateCompatibility.length > 0 ? templateCompatibility.map((t, index) => `
${index + 1}. PLANTILLA: "${t.name}" (ID: ${t.id})
   - Tipo: ${t.type}
   - Compatible con redes: ${t.networks.join(', ')}
   - Tipos de contenido compatibles: ${t.compatibleContentTypes.join(', ')}
`).join('\n') : 'No hay plantillas específicas disponibles'}

FECHAS PROGRAMADAS:
${scheduledDates.map((date, index) => `Publicación ${index + 1}: ${new Date(date).toLocaleString('es-ES')}`).join('\n')}

REGLAS CRÍTICAS PARA SELECCIÓN DE CONTENIDO:
1. TIPOS DE CONTENIDO OBLIGATORIOS A VARIAR:
   - "text-only": Solo texto, sin imágenes (30% del contenido)
   - "text-with-image": Texto con UNA imagen (50% del contenido)  
   - "text-with-carousel": Texto con MÚLTIPLES imágenes (20% del contenido)

2. SELECCIÓN DE PLANTILLAS:
   - Si contentType es "text-only" → templateId debe ser null (diseño libre)
   - Si contentType es "text-with-image" → usar plantillas tipo "single"
   - Si contentType es "text-with-carousel" → usar plantillas tipo "carousel"
   - VERIFICAR compatibilidad con la red social

3. SELECCIÓN DE RECURSOS:
   - Si contentType es "text-only" → resourceIds debe ser array vacío []
   - Si contentType es "text-with-image" → usar EXACTAMENTE 1 recurso
   - Si contentType es "text-with-carousel" → usar 2-5 recursos

INSTRUCCIONES ESPECÍFICAS:
1. Crea exactamente ${totalPosts} elementos de contenido únicos
2. OBLIGATORIO: Varía los tipos de contenido según las reglas arriba
3. Para cada elemento, especifica EXACTAMENTE qué recursos usar (por ID) y qué plantilla usar (por ID)
4. Distribuye el contenido entre las redes sociales: ${campaign.socialNetworks.join(', ')}
5. Cada elemento debe incluir: nombre/título, idea del contenido, red social, fecha programada, template específico, recursos específicos
6. Asigna recursos de manera inteligente según el tipo de contenido
7. Usa las plantillas disponibles de manera apropiada según la red social
8. Establece prioridades realistas: high, medium, low
9. Considera el objetivo: ${campaign.objective}
10. Sigue las instrucciones: "${campaign.prompt}"

EJEMPLO DE RESPUESTA CORRECTA:
{
  "contentPlan": [
    {
      "title": "Reflexión sobre Innovación",
      "description": "Compartir insights profundos sobre las tendencias que están transformando nuestra industria.",
      "socialNetwork": "linkedin",
      "templateId": null,
      "resourceIds": [],
      "contentType": "text-only",
      "priority": "medium",
      "tags": ["reflexion", "innovacion", "industria"],
      "notes": "Contenido puramente textual para generar debate profesional."
    },
    {
      "title": "Lanzamiento Especial Pizza Margherita",
      "description": "Presentamos nuestra pizza estrella con ingredientes frescos importados de Italia.",
      "socialNetwork": "instagram",
      "templateId": "${singleTemplate?.id || null}",
      "resourceIds": ["${firstResource?.id || ''}"],
      "contentType": "text-with-image",
      "priority": "high",
      "tags": ["pizza", "margherita", "artesanal"],
      "notes": "Usar plantilla single con imagen de producto."
    }
  ]
}

IMPORTANTE:
- USA EXACTAMENTE los IDs de recursos y plantillas proporcionados arriba
- RESPETA las reglas de tipos de contenido
- Si no hay recursos/plantillas disponibles, usa null o array vacío
- Cada elemento debe ser único y seguir el objetivo: ${campaign.objective}
- Considera las instrucciones específicas: "${campaign.prompt}"

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.
`
  }

  private buildEnhancedCampaignPlanPrompt(params: {
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceWithAnalysis[]
    templates: TemplateWithAnalysis[]
    totalPosts: number
    resourceAnalyses: any[]
    semanticAnalysis: any
  }): string {
    const { campaign, workspace, resources, templates, totalPosts, resourceAnalyses, semanticAnalysis } = params

    // Calcular fechas programadas
    const startDate = new Date(campaign.startDate)
    const scheduledDates: Array<{
      index: number
      date: string
      formatted: string
    }> = []
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

    // Crear mapeo de compatibilidad plantilla-red social USANDO SOLO LAS PLANTILLAS SELECCIONADAS
    const templateCompatibility = templates.map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      networks: t.socialNetworks,
      compatibleContentTypes: t.type === 'carousel' ? ['text-with-carousel'] : ['text-only', 'text-with-image']
    }))

    // Determinar tipos de contenido disponibles basándose en plantillas SELECCIONADAS
    const availableTemplateTypes = Array.from(new Set(templates.map(t => t.type)))
    const availableContentTypes: string[] = []

    // Siempre disponible
    availableContentTypes.push('text-only')

    // IMPORTANTE: Si hay plantillas seleccionadas, SIEMPRE permitir contenido con imágenes
    if (templates.length > 0) {
      // Si hay plantillas single, permitir text-with-image
      if (availableTemplateTypes.includes('single')) {
        availableContentTypes.push('text-with-image')
      }

      // Si hay plantillas carousel, permitir text-with-carousel
      if (availableTemplateTypes.includes('carousel')) {
        availableContentTypes.push('text-with-carousel')
      }

      // Si no hay plantillas single pero sí hay otras plantillas, aún permitir text-with-image
      // usando las plantillas disponibles (esto es más flexible)
      if (!availableTemplateTypes.includes('single') && templates.length > 0) {
        availableContentTypes.push('text-with-image')
      }
    }

    console.log('📋 Available template types:', availableTemplateTypes)
    console.log('📋 Available content types:', availableContentTypes)

    // Crear ejemplos dinámicos con IDs reales DE LAS PLANTILLAS SELECCIONADAS
    const singleTemplate = templates.find(t => t.type === 'single' && t.socialNetworks.includes('instagram'))
    const carouselTemplate = templates.find(t => t.type === 'carousel')
    const firstResource = resources[0]
    const secondResource = resources[1]

    console.log('🎨 Templates being used for examples:')
    console.log('   Single template:', singleTemplate ? `${singleTemplate.name} (${singleTemplate.id})` : 'None available')
    console.log('   Carousel template:', carouselTemplate ? `${carouselTemplate.name} (${carouselTemplate.id})` : 'None available')

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

ANÁLISIS DETALLADO DE RECURSOS DISPONIBLES (PRE-COMPUTADO POR IA):
${resources.length > 0 ? resources.map((resource, index) => {
      const analysis = resource.aiAnalysis
      return `
${index + 1}. RECURSO: "${resource.name}" (ID: ${resource.id})
   - Tipo: ${resource.type}
   - URL: ${resource.url}
   ${analysis ? `
   - 🤖 DESCRIPCIÓN IA: ${analysis.description}
   - 🎯 USOS SUGERIDOS: ${analysis.suggestedUse.join(', ')}
   - 📱 REDES COMPATIBLES: ${analysis.compatibleNetworks.join(', ')}
   - 🎨 MOOD/AMBIENTE: ${analysis.mood}
   - 🌈 COLORES: ${analysis.colors.join(', ')}
   - 🔍 ELEMENTOS: ${analysis.elements.join(', ')}` : '   - ⚠️ Sin análisis IA disponible'}
`
    }).join('\n') : 'No hay recursos específicos disponibles'}

PLANTILLAS DISPONIBLES CON ANÁLISIS DETALLADO (PRE-COMPUTADO POR IA):
${templates.length > 0 ? templates.map((template, index) => {
      const analysis = template.aiAnalysis
      return `
${index + 1}. PLANTILLA: "${template.name}" (ID: ${template.id})
   - Tipo: ${template.type}
   - Compatible con redes: ${template.socialNetworks.join(', ')}
   - Tipos de contenido compatibles: ${template.type === 'carousel' ? ['text-with-carousel'] : ['text-only', 'text-with-image']}
   ${analysis ? `
   - 🤖 FORTALEZAS DE DISEÑO: ${analysis.layoutStrengths.join(', ')}
   - 📝 CAPACIDAD DE TEXTO: Título ${analysis.textCapacity.headline}, Subtítulo ${analysis.textCapacity.subhead}, CTA ${analysis.textCapacity.cta}
   - 📱 APTITUD POR RED: ${Object.entries(analysis.networkAptitude).map(([net, apt]: [string, any]) => `${net}: ${apt}`).join(', ')}
   - 🎯 IDEAL PARA: ${Object.entries(analysis.businessObjectiveSuitability).map(([obj, suit]: [string, any]) => `${obj}: ${suit}`).join(', ')}` : '   - ⚠️ Sin análisis IA disponible'}
`
    }).join('\n') : 'No hay plantillas específicas disponibles'}

CALENDARIO DE PUBLICACIONES:
${scheduledDates.map(slot => `Publicación ${slot.index}: ${slot.formatted}`).join('\n')}

REGLAS CRÍTICAS PARA SELECCIÓN DE CONTENIDO:
1. TIPOS DE CONTENIDO DISPONIBLES (basado en plantillas configuradas):
${availableContentTypes.map(type => {
      if (type === 'text-only') return '   - "text-only": Solo texto, sin imágenes (diseño libre)'
      if (type === 'text-with-image') return '   - "text-with-image": Texto con UNA imagen (usar plantillas "single")'
      if (type === 'text-with-carousel') return '   - "text-with-carousel": Texto con MÚLTIPLES imágenes (usar plantillas "carousel")'
      return ''
    }).join('\n')}

2. RESTRICCIONES IMPORTANTES:
   - SOLO usar los tipos de contenido listados arriba
   - NO generar contenido "text-with-carousel" si no hay plantillas carousel disponibles
   - NO generar contenido "text-with-image" si no hay plantillas single disponibles
   - Distribuir equitativamente entre los tipos disponibles

3. SELECCIÓN DE PLANTILLAS (OBLIGATORIO USAR LAS PLANTILLAS PROPORCIONADAS):
   - Si contentType es "text-only" → templateId debe ser null (diseño libre)
${availableContentTypes.includes('text-with-image') ? `   - Si contentType es "text-with-image" → OBLIGATORIO usar una plantilla de la lista arriba (preferir "single", pero usar cualquiera disponible si es necesario)` : ''}
${availableContentTypes.includes('text-with-carousel') ? `   - Si contentType es "text-with-carousel" → OBLIGATORIO usar plantillas tipo "carousel" de la lista arriba` : ''}
   - NUNCA usar templateId null para contenido con imágenes cuando hay plantillas disponibles
   - VERIFICAR compatibilidad con la red social
   - USAR EXACTAMENTE los IDs de plantillas listados arriba
   - DISTRIBUIR el uso entre TODAS las plantillas disponibles, no usar solo una

4. SELECCIÓN DE RECURSOS:
   - Si contentType es "text-only" → resourceIds debe ser array vacío []
${availableContentTypes.includes('text-with-image') ? '   - Si contentType es "text-with-image" → usar EXACTAMENTE 1 recurso' : ''}
${availableContentTypes.includes('text-with-carousel') ? '   - Si contentType es "text-with-carousel" → usar 2-5 recursos' : ''}

INSTRUCCIONES ESPECÍFICAS:
1. Crea exactamente ${totalPosts} elementos de contenido únicos
2. OBLIGATORIO: Varía los tipos de contenido según las reglas arriba
3. OBLIGATORIO: USA LAS PLANTILLAS SELECCIONADAS - NO generes todo como "text-only"
4. OBLIGATORIO: Distribuye el contenido aproximadamente así:
   - 30% text-only (sin plantillas)
   - 50% text-with-image (usando plantillas disponibles)
   - 20% text-with-carousel (si hay plantillas carousel)
5. Para cada elemento especifica:
   - Nombre/título atractivo
   - Idea detallada del contenido
   - Red social específica (${campaign.socialNetworks.join(' o ')})
   - Fecha y hora programada (usar las fechas del calendario)
   - Template específico a usar (ID exacto de la lista arriba, NO null para contenido con imágenes)
   - Recursos específicos a usar (IDs exactos o array vacío)
6. Usa INTELIGENTEMENTE los recursos basándote en su análisis
7. Asigna plantillas según compatibilidad con red social Y tipo de contenido
8. Distribuye equitativamente entre redes sociales
9. Considera el objetivo: ${campaign.objective}
10. Sigue las instrucciones: "${campaign.prompt}"

EJEMPLO DE RESPUESTA CORRECTA:
{
  "contentPlan": [
    {
      "title": "Reflexión sobre Innovación Tecnológica",
      "description": "Compartir insights sobre las tendencias tecnológicas que están transformando la industria. Reflexión profunda sobre el impacto de la IA en los negocios modernos.",
      "socialNetwork": "linkedin",
      "templateId": null,
      "resourceIds": [],
      "contentType": "text-only",
      "priority": "medium",
      "tags": ["tecnologia", "innovacion", "reflexion", "negocios"],
      "notes": "Contenido puramente textual para generar debate profesional."
    },
    {
      "title": "Presentación del Producto Estrella",
      "description": "Mostrar nuestro producto principal con imagen de alta calidad que destaque sus características únicas.",
      "socialNetwork": "instagram",
      "templateId": "${singleTemplate?.id || null}",
      "resourceIds": ["${firstResource?.id || ''}"],
      "contentType": "text-with-image",
      "priority": "high",
      "tags": ["producto", "calidad", "innovacion"],
      "notes": "Usar plantilla single con imagen de producto."
    },
    {
      "title": "Proceso Completo de Desarrollo",
      "description": "Serie de imágenes mostrando el proceso completo desde la idea hasta el producto final.",
      "socialNetwork": "instagram",
      "templateId": "${carouselTemplate?.id || null}",
      "resourceIds": ["${firstResource?.id || ''}", "${secondResource?.id || ''}"],
      "contentType": "text-with-carousel",
      "priority": "high",
      "tags": ["proceso", "desarrollo", "behind-scenes"],
      "notes": "Usar plantilla carousel con múltiples imágenes del proceso."
    }
  ]
}

REGLAS IMPORTANTES:
- USA EXACTAMENTE los IDs proporcionados arriba
- RESPETA las reglas de tipos de contenido
- VERIFICA compatibilidad plantilla-red social-tipo de contenido
- Cada elemento debe ser completamente único
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

        // Validar y corregir el tipo de contenido
        let contentType = item.contentType || 'text-only'
        let templateId = item.templateId
        let resourceIds = Array.isArray(item.resourceIds) ? item.resourceIds.filter((id: string) => id && id.trim() !== '') : []

        // Aplicar reglas de consistencia
        if (contentType === 'text-only') {
          templateId = null // Diseño libre para solo texto
          resourceIds = [] // Sin recursos para solo texto
        } else if (contentType === 'text-with-image') {
          resourceIds = resourceIds.slice(0, 1) // Máximo 1 recurso
        } else if (contentType === 'text-with-carousel') {
          if (resourceIds.length < 2) {
            // Si no hay suficientes recursos, cambiar a text-with-image
            contentType = 'text-with-image'
            resourceIds = resourceIds.slice(0, 1)
          } else {
            resourceIds = resourceIds.slice(0, 5) // Máximo 5 recursos
          }
        }

        // Validar templateId
        if (templateId === '' || templateId === 'null' || templateId === 'undefined') {
          templateId = null
        }

        const contentItem: ContentPlanItem = {
          id: `content-${Date.now()}-${index}`,
          title: item.title || `Contenido ${index + 1}`,
          description: item.description || 'Descripción del contenido',
          socialNetwork: item.socialNetwork || campaign.socialNetworks[index % campaign.socialNetworks.length],
          scheduledDate: scheduledDate.toISOString(),
          templateId: templateId || undefined,
          resourceIds: resourceIds,
          contentType: contentType as 'text-only' | 'text-with-image' | 'text-with-carousel',
          priority: item.priority || 'medium',
          tags: Array.isArray(item.tags) ? item.tags : [],
          notes: item.notes || undefined
        }

        items.push(contentItem)
      })

      // Validar distribución de tipos de contenido
      const typeDistribution = this.validateContentTypeDistribution(items)
      console.log('📊 Distribución de tipos de contenido:', typeDistribution)

      return items.slice(0, totalPosts) // Asegurar que no excedamos el número esperado
    } catch (error) {
      console.error('Error parsing content plan response:', error)

      // Si falla el parsing, propagar el error
      throw new Error('No se pudo procesar la respuesta de Gemini AI. Intenta nuevamente.')
    }
  }

  private validateContentTypeDistribution(items: ContentPlanItem[]): Record<string, number> {
    const distribution: Record<string, number> = {
      'text-only': 0,
      'text-with-image': 0,
      'text-with-carousel': 0
    }

    items.forEach(item => {
      distribution[item.contentType] = (distribution[item.contentType] || 0) + 1
    })

    return distribution
  }


}