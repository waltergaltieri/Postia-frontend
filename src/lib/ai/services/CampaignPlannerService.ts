import { CampaignPlannerAgent } from '../agents/CampaignPlannerAgent'
import { AgentManager } from '../agents/AgentManager'
import { GeminiService, createGeminiService } from '../GeminiService'
import type {
  CampaignData,
  WorkspaceData,
  ResourceData,
  TemplateData,
  ContentPlanItem
} from '../agents/types'

export interface GenerateContentPlanParams {
  campaign: CampaignData
  workspace: WorkspaceData
  resources?: ResourceData[]
  templates?: TemplateData[]
}

export interface RegenerateContentPlanParams extends GenerateContentPlanParams {
  previousPlan?: ContentPlanItem[]
}

export interface RegenerateContentItemParams extends GenerateContentPlanParams {
  itemIndex: number
  previousPlan: ContentPlanItem[]
}

export class CampaignPlannerService {
  private agentManager: AgentManager
  private campaignAgent: CampaignPlannerAgent

  constructor() {
    try {
      const geminiService = createGeminiService()
      this.agentManager = new AgentManager(geminiService)
      this.campaignAgent = new CampaignPlannerAgent(this.agentManager)
      console.log('✅ CampaignPlannerService inicializado correctamente')
    } catch (error) {
      console.error('❌ Error inicializando CampaignPlannerService:', error)
      throw error
    }
  }

  private generateContentItem(params: {
    index: number
    totalPosts: number
    scheduledDate: Date
    socialNetwork: string
    campaign: CampaignData
    workspace: WorkspaceData
    resources: ResourceData[]
    templates: TemplateData[]
    regenerate?: boolean
  }): ContentPlanItem {
    const { index, scheduledDate, socialNetwork, campaign, workspace, resources, templates, regenerate = false } = params

    // Content themes and ideas based on campaign objective
    const contentThemes = this.generateContentThemes(campaign, workspace)
    const theme = contentThemes[index % contentThemes.length]

    // Content types based on social network
    const contentTypes = this.getContentTypesForNetwork(socialNetwork)
    const contentType = contentTypes[index % contentTypes.length]

    // Priority based on timing and content type
    const priority = this.calculatePriority(index, scheduledDate, contentType)

    // Select appropriate resources and templates
    const selectedResources = this.selectResourcesForContent(resources, socialNetwork, contentType)
    const selectedTemplate = this.selectTemplateForContent(templates, socialNetwork, contentType)

    // Generate tags based on campaign and content
    const tags = this.generateTags(campaign, theme, socialNetwork)

    // Generate title and description
    const baseContent = this.generateContentText(theme, campaign, workspace, socialNetwork, contentType, regenerate)
    const enhancedContent = this.incorporateBrandingIntoContent(baseContent, workspace, campaign)

    // Generate detailed notes including resources and templates
    const detailedNotes = this.generateDetailedNotes(
      theme,
      socialNetwork,
      contentType,
      selectedResources,
      selectedTemplate,
      workspace.branding
    )

    return {
      id: `content-${Date.now()}-${index}`,
      title: enhancedContent.title,
      description: enhancedContent.description,
      socialNetwork: socialNetwork as 'instagram' | 'linkedin' | 'tiktok',
      scheduledDate: scheduledDate.toISOString(),
      templateId: selectedTemplate?.id,
      resourceIds: selectedResources.map(r => r.id),
      contentType: contentType as 'text-only' | 'text-with-image' | 'text-with-carousel',
      priority: priority as 'high' | 'medium' | 'low',
      tags,
      notes: detailedNotes
    }
  }

  private generateContentThemes(campaign: CampaignData, workspace: WorkspaceData): string[] {
    const baseThemes = [
      'Presentación de producto/servicio',
      'Beneficios y características',
      'Testimonios de clientes',
      'Behind the scenes',
      'Educativo/Tips',
      'Inspiracional/Motivacional',
      'Promocional/Ofertas',
      'Contenido de valor',
      'Interacción con audiencia',
      'Tendencias del sector'
    ]

    // Customize themes based on campaign objective
    const customThemes = []
    if (campaign.objective.toLowerCase().includes('venta')) {
      customThemes.push('Llamada a la acción de venta', 'Urgencia y escasez', 'Comparación de productos')
    }
    if (campaign.objective.toLowerCase().includes('brand')) {
      customThemes.push('Historia de la marca', 'Valores corporativos', 'Misión y visión')
    }
    if (campaign.objective.toLowerCase().includes('engagement')) {
      customThemes.push('Preguntas a la audiencia', 'Concursos y sorteos', 'Contenido viral')
    }

    return [...baseThemes, ...customThemes]
  }

  private getContentTypesForNetwork(socialNetwork: string): string[] {
    const networkTypes: Record<string, string[]> = {
      'instagram': ['text-only', 'text-with-image', 'text-with-carousel'],
      'tiktok': ['text-only', 'text-with-image'], // TikTok principalmente video, pero puede tener texto
      'linkedin': ['text-only', 'text-with-image', 'text-with-carousel']
    }

    return networkTypes[socialNetwork.toLowerCase()] || ['text-only']
  }

  private calculatePriority(index: number, scheduledDate: Date, contentType: string): string {
    const hour = scheduledDate.getHours()
    const dayOfWeek = scheduledDate.getDay()

    // High priority for peak hours and visual content types
    if ((hour >= 18 && hour <= 21) || (hour >= 12 && hour <= 14)) {
      if (contentType === 'text-with-image' || contentType === 'text-with-carousel') {
        return 'high'
      }
    }

    // Medium priority for weekdays and regular content
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return 'medium'
    }

    // Low priority for weekends and off-peak hours
    return 'low'
  }

  private selectResourcesForContent(resources: ResourceData[], socialNetwork: string, contentType: string): ResourceData[] {
    if (resources.length === 0) return []

    // Select resources based on content type
    let maxResources = 0
    if (contentType === 'text-only') {
      maxResources = 0 // No necesita recursos visuales
    } else if (contentType === 'text-with-image') {
      maxResources = 1 // Una sola imagen
    } else if (contentType === 'text-with-carousel') {
      maxResources = 5 // Hasta 5 imágenes para carrusel
    }

    if (maxResources === 0) return []

    const shuffled = [...resources].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(maxResources, resources.length))
  }

  private selectTemplateForContent(templates: TemplateData[], socialNetwork: string, contentType: string): TemplateData | undefined {
    const compatibleTemplates = templates.filter(template =>
      template.socialNetworks.includes(socialNetwork) &&
      ((contentType === 'text-with-carousel' && template.type === 'carousel') ||
        (contentType !== 'text-with-carousel' && template.type === 'single'))
    )

    if (compatibleTemplates.length === 0) return undefined

    return compatibleTemplates[Math.floor(Math.random() * compatibleTemplates.length)]
  }

  private generateTags(campaign: CampaignData, theme: string, socialNetwork: string): string[] {
    const baseTags = []

    // Add campaign-related tags
    if (campaign.name) {
      baseTags.push(campaign.name.toLowerCase().replace(/\s+/g, ''))
    }

    // Add theme-related tags
    if (theme.includes('producto')) baseTags.push('producto', 'calidad')
    if (theme.includes('testimonios')) baseTags.push('testimonios', 'clientes')
    if (theme.includes('educativo')) baseTags.push('tips', 'educacion')
    if (theme.includes('inspiracional')) baseTags.push('motivacion', 'inspiracion')

    // Add social network specific tags
    if (socialNetwork === 'instagram') baseTags.push('instagram', 'visual', 'engagement')
    if (socialNetwork === 'linkedin') baseTags.push('profesional', 'business', 'networking')
    if (socialNetwork === 'tiktok') baseTags.push('viral', 'trending', 'creative')

    return baseTags.slice(0, 5) // Limit to 5 tags
  }

  private generateContentText(
    theme: string,
    campaign: CampaignData,
    workspace: WorkspaceData,
    socialNetwork: string,
    contentType: string,
    regenerate: boolean = false
  ): { title: string; description: string } {
    const variation = regenerate ? Math.floor(Math.random() * 3) + 1 : 0

    const titles = this.getTitlesForTheme(theme, campaign, variation)
    const descriptions = this.getDescriptionsForTheme(theme, campaign, workspace, socialNetwork, contentType, variation)

    return {
      title: titles[Math.floor(Math.random() * titles.length)],
      description: descriptions[Math.floor(Math.random() * descriptions.length)]
    }
  }

  private incorporateBrandingIntoContent(
    content: { title: string; description: string },
    workspace: WorkspaceData,
    campaign: CampaignData
  ): { title: string; description: string } {
    const branding = workspace.branding

    // Incorporar slogan si existe
    let enhancedDescription = content.description
    if (branding.slogan) {
      enhancedDescription += `\n\n"${branding.slogan}" - ${workspace.name}`
    }

    // Mencionar colores de marca si están definidos
    if (branding.primaryColor && branding.primaryColor !== '#3B82F6') {
      enhancedDescription += `\n\n🎨 Usar colores de marca: ${branding.primaryColor}`
    }

    return {
      title: content.title,
      description: enhancedDescription
    }
  }

  private getTitlesForTheme(theme: string, campaign: CampaignData, variation: number): string[] {
    const baseTitle = theme.charAt(0).toUpperCase() + theme.slice(1)

    const variations = [
      `${baseTitle} - ${campaign.name}`,
      `Descubre: ${baseTitle}`,
      `${baseTitle} que necesitas conocer`,
      `Todo sobre ${baseTitle.toLowerCase()}`
    ]

    return [variations[variation] || baseTitle]
  }

  private getDescriptionsForTheme(
    theme: string,
    campaign: CampaignData,
    workspace: WorkspaceData,
    socialNetwork: string,
    contentType: string,
    variation: number
  ): string[] {
    const brandName = workspace.name
    const objective = campaign.objective

    const baseDescriptions = [
      `En ${brandName}, nos enfocamos en ${objective.toLowerCase()}. ${theme} es fundamental para lograr nuestros objetivos y brindar el mejor servicio a nuestros clientes.`,
      `¿Sabías que ${theme.toLowerCase()} puede transformar tu experiencia? En ${brandName} te mostramos cómo ${objective.toLowerCase()} de manera efectiva.`,
      `${theme} es más que una estrategia, es nuestra pasión. Descubre cómo ${brandName} está revolucionando la forma de ${objective.toLowerCase()}.`
    ]

    // Add social network specific adaptations
    if (socialNetwork === 'linkedin') {
      baseDescriptions.push(`Desde una perspectiva profesional, ${theme.toLowerCase()} representa una oportunidad única para ${objective.toLowerCase()}. En ${brandName}, implementamos las mejores prácticas del sector.`)
    }

    if (socialNetwork === 'instagram') {
      baseDescriptions.push(`✨ ${theme} ✨\n\n${brandName} te trae contenido visual increíble sobre ${objective.toLowerCase()}. ¡No te lo pierdas! 📸`)
    }

    if (socialNetwork === 'tiktok') {
      baseDescriptions.push(`🔥 ${theme} 🔥\n\n${brandName} presenta ${objective.toLowerCase()} de forma creativa y auténtica. ¡Síguenos para más! 🚀`)
    }

    return [baseDescriptions[variation] || baseDescriptions[0]]
  }

  private generateNotes(theme: string, socialNetwork: string, contentType: string): string {
    const notes = []

    if (contentType === 'story') {
      notes.push('Contenido temporal de 24 horas')
    }

    if (contentType === 'reel') {
      notes.push('Incluir música trending y efectos visuales')
    }

    if (socialNetwork === 'linkedin') {
      notes.push('Mantener tono profesional')
    }

    if (theme.includes('promocional')) {
      notes.push('Incluir llamada a la acción clara')
    }

    return notes.join('. ')
  }

  private generateDetailedNotes(
    theme: string,
    socialNetwork: string,
    contentType: string,
    selectedResources: ResourceData[],
    selectedTemplate: TemplateData | undefined,
    branding: any
  ): string {
    const notes = []

    // Notas básicas de contenido
    if (contentType === 'text-only') {
      notes.push('� Conteenido basado únicamente en texto')
    }

    if (contentType === 'text-with-image') {
      notes.push('🖼️ Incluir una imagen de apoyo al mensaje')
    }

    if (contentType === 'text-with-carousel') {
      notes.push('🎠 Crear secuencia visual con múltiples imágenes')
    }

    if (socialNetwork === 'linkedin') {
      notes.push('� Mantenrer tono profesional y educativo')
    }

    if (socialNetwork === 'tiktok') {
      notes.push('🎵 Contenido auténtico y creativo')
    }

    if (theme.includes('promocional')) {
      notes.push('📢 Incluir llamada a la acción clara')
    }

    // Información de recursos
    if (selectedResources.length > 0) {
      const resourceTypes = selectedResources.map(r => r.type).join(', ')
      notes.push(`🖼️ Recursos: ${selectedResources.length} ${resourceTypes}(s) - ${selectedResources.map(r => r.name).join(', ')}`)
    } else {
      notes.push('📷 Sin recursos específicos asignados')
    }

    // Información de template
    if (selectedTemplate) {
      notes.push(`🎨 Template: "${selectedTemplate.name}" (${selectedTemplate.type})`)
    } else {
      notes.push('🎨 Template: Diseño libre')
    }

    // Información de branding
    if (branding.primaryColor && branding.primaryColor !== '#3B82F6') {
      notes.push(`🎨 Color principal: ${branding.primaryColor}`)
    }

    if (branding.slogan) {
      notes.push(`💬 Incluir slogan: "${branding.slogan}"`)
    }

    return notes.join(' • ')
  }

  async generateContentPlan(params: GenerateContentPlanParams): Promise<ContentPlanItem[]> {
    console.log('🚀 CampaignPlannerService.generateContentPlan STARTED - USING GEMINI AI ONLY')

    const { campaign, workspace, resources = [], templates = [] } = params

    console.log('📊 Sending to Gemini AI:', {
      name: campaign.name,
      objective: campaign.objective,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      intervalHours: campaign.intervalHours,
      socialNetworks: campaign.socialNetworks,
      prompt: campaign.prompt
    })

    // USAR AGENTE DE GEMINI PARA GENERAR EL PLAN - SIN FALLBACKS
    console.log('🤖 Calling Gemini AI Agent to generate content plan...')

    const aiGeneratedPlan = await this.campaignAgent.planCampaignContent({
      campaign,
      workspace,
      resources,
      templates
    })

    console.log('✅ Gemini AI generated plan with', aiGeneratedPlan.length, 'items')

    // Validar que el plan no esté vacío
    if (!aiGeneratedPlan || aiGeneratedPlan.length === 0) {
      throw new Error('Gemini AI no pudo generar el plan de contenido. Verifica la configuración de la campaña e intenta nuevamente.')
    }

    return aiGeneratedPlan
  }



  private generateSpecificNotes(contentType: string, title: string, platform: string): string {
    const notesByType: Record<string, string[]> = {
      'text-only': [
        'Enfocarse en copy persuasivo y claro',
        'Usar emojis estratégicamente para engagement',
        'Incluir llamada a la acción específica',
        'Optimizar longitud según plataforma'
      ],
      'text-with-image': [
        'Asegurar coherencia entre texto e imagen',
        'Imagen debe complementar el mensaje',
        'Usar texto como hook principal',
        'Optimizar imagen para cada plataforma'
      ],
      'text-with-carousel': [
        'Crear narrativa progresiva entre imágenes',
        'Primera imagen debe captar atención',
        'Incluir CTA en última slide',
        'Mantener consistencia visual en todas las imágenes'
      ]
    }

    const platformNotes: Record<string, string> = {
      instagram: 'Optimizar para feed y stories, usar hashtags relevantes',
      linkedin: 'Enfoque profesional, contenido de valor para networking',
      tiktok: 'Contenido auténtico y creativo, aprovechar tendencias'
    }

    const typeNotes = notesByType[contentType] || notesByType['text-only']
    const randomNote = typeNotes[Math.floor(Math.random() * typeNotes.length)]
    const platformNote = platformNotes[platform] || platformNotes.instagram

    return `${randomNote}. ${platformNote}.`
  }

  async regenerateContentPlan(params: RegenerateContentPlanParams): Promise<ContentPlanItem[]> {
    const { campaign, workspace, resources = [], templates = [], previousPlan } = params

    console.log('🔄 Regenerating content plan using Gemini AI...')

    try {
      // USAR AGENTE DE GEMINI PARA REGENERAR EL PLAN
      const aiRegeneratedPlan = await this.campaignAgent.regenerateContentPlan({
        campaign,
        workspace,
        resources,
        templates,
        previousPlan
      })

      console.log('✅ Gemini AI regenerated plan with', aiRegeneratedPlan.length, 'items')
      return aiRegeneratedPlan
    } catch (error) {
      console.error('❌ Error regenerating with Gemini AI:', error)

      // Si Gemini falla, propagar el error
      throw new Error(`No se pudo regenerar el plan de contenido: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  async regenerateContentItem(params: RegenerateContentItemParams): Promise<ContentPlanItem> {
    const { campaign, workspace, resources = [], templates = [], itemIndex, previousPlan } = params

    if (itemIndex < 0 || itemIndex >= previousPlan.length) {
      throw new Error('Índice de elemento inválido')
    }

    console.log(`🔄 Regenerating item ${itemIndex + 1} using Gemini AI...`)

    try {
      // USAR AGENTE DE GEMINI PARA REGENERAR UN ELEMENTO ESPECÍFICO
      const aiRegeneratedItem = await this.campaignAgent.regenerateSpecificItem({
        campaign,
        workspace,
        resources,
        templates,
        itemIndex,
        previousPlan
      })

      console.log('✅ Gemini AI regenerated item:', aiRegeneratedItem.title)
      return aiRegeneratedItem
    } catch (error) {
      console.error('❌ Error regenerating item with Gemini AI:', error)

      // Si Gemini falla, propagar el error
      throw new Error(`No se pudo regenerar el elemento ${itemIndex + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  async copyContentPlanToClipboard(contentPlan: ContentPlanItem[]): Promise<void> {
    try {
      const formattedPlan = this.formatContentPlanForClipboard(contentPlan)

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(formattedPlan)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = formattedPlan
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      throw new Error('No se pudo copiar el plan al portapapeles')
    }
  }

  private formatContentPlanForClipboard(contentPlan: ContentPlanItem[]): string {
    let formatted = '📋 PLAN DE CONTENIDO DE CAMPAÑA\n'
    formatted += '='.repeat(50) + '\n\n'

    contentPlan.forEach((item, index) => {
      const date = new Date(item.scheduledDate).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      formatted += `${index + 1}. ${item.title}\n`
      formatted += `   📅 Fecha: ${date}\n`
      formatted += `   📱 Red Social: ${this.getSocialNetworkEmoji(item.socialNetwork)} ${item.socialNetwork}\n`
      formatted += `   📝 Tipo: ${item.contentType}\n`
      formatted += `   🎯 Prioridad: ${item.priority}\n`
      formatted += `   📄 Descripción: ${item.description}\n`

      if (item.tags && item.tags.length > 0) {
        formatted += `   🏷️ Tags: ${item.tags.join(', ')}\n`
      }

      if (item.notes) {
        formatted += `   📌 Notas: ${item.notes}\n`
      }

      formatted += '\n' + '-'.repeat(40) + '\n\n'
    })

    formatted += `📊 RESUMEN:\n`
    formatted += `Total de publicaciones: ${contentPlan.length}\n`

    const socialNetworks = Array.from(new Set(contentPlan.map(item => item.socialNetwork)))
    formatted += `Redes sociales: ${socialNetworks.join(', ')}\n`

    const contentTypes = Array.from(new Set(contentPlan.map(item => item.contentType)))
    formatted += `Tipos de contenido: ${contentTypes.join(', ')}\n`

    const priorityCount = {
      high: contentPlan.filter(item => item.priority === 'high').length,
      medium: contentPlan.filter(item => item.priority === 'medium').length,
      low: contentPlan.filter(item => item.priority === 'low').length
    }
    formatted += `Prioridades: Alta (${priorityCount.high}), Media (${priorityCount.medium}), Baja (${priorityCount.low})\n`

    formatted += '\n🚀 Generado por PostIA - Sistema de Agentes de IA'

    return formatted
  }

  private getSocialNetworkEmoji(socialNetwork: string): string {
    switch (socialNetwork.toLowerCase()) {
      case 'instagram':
        return '📷'
      case 'linkedin':
        return '💼'
      case 'tiktok':
        return '🎵'
      default:
        return '📱'
    }
  }

  validateCampaignData(campaign: CampaignData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!campaign.name || campaign.name.trim().length === 0) {
      errors.push('El nombre de la campaña es requerido')
    }

    if (!campaign.objective || campaign.objective.trim().length === 0) {
      errors.push('El objetivo de la campaña es requerido')
    }

    if (!campaign.startDate) {
      errors.push('La fecha de inicio es requerida')
    }

    if (!campaign.endDate) {
      errors.push('La fecha de fin es requerida')
    }

    if (campaign.startDate && campaign.endDate) {
      const startDate = new Date(campaign.startDate)
      const endDate = new Date(campaign.endDate)

      if (startDate >= endDate) {
        errors.push('La fecha de fin debe ser posterior a la fecha de inicio')
      }
    }

    if (!campaign.socialNetworks || campaign.socialNetworks.length === 0) {
      errors.push('Debe seleccionar al menos una red social')
    }

    if (!campaign.intervalHours || campaign.intervalHours <= 0) {
      errors.push('El intervalo de publicación debe ser mayor a 0 horas')
    }

    if (!campaign.prompt || campaign.prompt.trim().length === 0) {
      errors.push('El prompt personalizado es requerido')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  calculatePlanStatistics(contentPlan: ContentPlanItem[]): {
    totalPosts: number
    postsByNetwork: Record<string, number>
    postsByType: Record<string, number>
    postsByPriority: Record<string, number>
    dateRange: { start: string; end: string }
    averagePostsPerDay: number
  } {
    const postsByNetwork: Record<string, number> = {}
    const postsByType: Record<string, number> = {}
    const postsByPriority: Record<string, number> = {}

    contentPlan.forEach(item => {
      postsByNetwork[item.socialNetwork] = (postsByNetwork[item.socialNetwork] || 0) + 1
      postsByType[item.contentType] = (postsByType[item.contentType] || 0) + 1
      postsByPriority[item.priority] = (postsByPriority[item.priority] || 0) + 1
    })

    const dates = contentPlan.map(item => new Date(item.scheduledDate)).sort((a, b) => a.getTime() - b.getTime())
    const startDate = dates[0]
    const endDate = dates[dates.length - 1]

    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1
    const averagePostsPerDay = contentPlan.length / daysDifference

    return {
      totalPosts: contentPlan.length,
      postsByNetwork,
      postsByType,
      postsByPriority,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      averagePostsPerDay: Math.round(averagePostsPerDay * 100) / 100
    }
  }
}

let campaignPlannerServiceInstance: CampaignPlannerService | null = null

export function getCampaignPlannerService(): CampaignPlannerService {
  if (!campaignPlannerServiceInstance) {
    campaignPlannerServiceInstance = new CampaignPlannerService()
  }
  return campaignPlannerServiceInstance
}

export function createCampaignPlannerService(): CampaignPlannerService {
  return new CampaignPlannerService()
}
