/**
 * Ejemplos de uso del Campaign Planner Agent
 * 
 * Este archivo muestra cómo usar el sistema de planificación de campañas
 * para generar contenido automáticamente basado en la configuración de la campaña
 * y los datos de la marca.
 */

import { getCampaignPlannerService } from '../services/CampaignPlannerService'
import type { 
  CampaignData, 
  WorkspaceData, 
  ResourceData, 
  TemplateData 
} from '../agents/types'

// Ejemplo 1: Campaña básica de 7 días para una marca de fitness
export async function exampleFitnessCampaign() {
  const campaign: CampaignData = {
    id: 'campaign-fitness-001',
    name: 'Rutina de Verano 2024',
    objective: 'Promocionar rutinas de ejercicio para el verano, aumentar engagement y generar leads para el programa de entrenamiento personal',
    startDate: '2024-06-01T09:00:00Z',
    endDate: '2024-06-07T21:00:00Z',
    socialNetworks: ['instagram', 'facebook', 'tiktok'],
    intervalHours: 12, // 2 publicaciones por día
    contentType: 'optimized',
    prompt: 'Crea contenido motivacional y educativo sobre fitness, rutinas de ejercicio, nutrición saludable y bienestar. El tono debe ser energético, positivo y accesible para principiantes y avanzados.'
  }

  const workspace: WorkspaceData = {
    id: 'workspace-fitlife',
    name: 'FitLife Studio',
    branding: {
      primaryColor: '#FF6B35',
      secondaryColor: '#004E89',
      slogan: 'Tu mejor versión te espera',
      description: 'Estudio de fitness especializado en entrenamiento personalizado, clases grupales y nutrición deportiva. Ayudamos a personas de todos los niveles a alcanzar sus objetivos de salud y bienestar.',
      whatsapp: '+1234567890'
    }
  }

  const resources: ResourceData[] = [
    {
      id: 'res-001',
      name: 'Rutina de cardio matutino',
      url: '/images/cardio-morning.jpg',
      type: 'image',
      mimeType: 'image/jpeg'
    },
    {
      id: 'res-002',
      name: 'Ejercicios con pesas',
      url: '/videos/weight-training.mp4',
      type: 'video',
      mimeType: 'video/mp4'
    }
  ]

  const templates: TemplateData[] = [
    {
      id: 'tpl-001',
      name: 'Post motivacional',
      type: 'single',
      socialNetworks: ['instagram', 'facebook'],
      images: ['/templates/motivational-post.png']
    },
    {
      id: 'tpl-002',
      name: 'Carousel de ejercicios',
      type: 'carousel',
      socialNetworks: ['instagram'],
      images: ['/templates/exercise-carousel-1.png', '/templates/exercise-carousel-2.png']
    }
  ]

  const service = getCampaignPlannerService()

  try {
    console.log('🚀 Generando plan de contenido para campaña de fitness...')
    
    const contentPlan = await service.generateContentPlan({
      campaign,
      workspace,
      resources,
      templates
    })

    console.log(`✅ Plan generado exitosamente: ${contentPlan.length} publicaciones`)
    
    // Mostrar estadísticas
    const stats = service.calculatePlanStatistics(contentPlan)
    console.log('📊 Estadísticas del plan:', stats)

    return contentPlan
  } catch (error) {
    console.error('❌ Error generando plan de contenido:', error)
    throw error
  }
}

// Ejemplo 2: Campaña de e-commerce para Black Friday
export async function exampleEcommerceCampaign() {
  const campaign: CampaignData = {
    id: 'campaign-blackfriday-001',
    name: 'Black Friday 2024',
    objective: 'Maximizar ventas durante Black Friday con ofertas especiales, crear urgencia y aumentar conversiones',
    startDate: '2024-11-25T00:00:00Z',
    endDate: '2024-11-29T23:59:00Z',
    socialNetworks: ['instagram', 'facebook', 'twitter'],
    intervalHours: 8, // 3 publicaciones por día
    contentType: 'optimized',
    prompt: 'Crea contenido de ventas persuasivo para Black Friday. Enfócate en ofertas limitadas, descuentos exclusivos, testimonios de clientes y llamadas a la acción claras. El tono debe generar urgencia pero mantenerse profesional.'
  }

  const workspace: WorkspaceData = {
    id: 'workspace-techstore',
    name: 'TechStore Pro',
    branding: {
      primaryColor: '#1A1A1A',
      secondaryColor: '#FF0080',
      slogan: 'Tecnología que transforma',
      description: 'Tienda online especializada en productos tecnológicos de última generación. Ofrecemos smartphones, laptops, accesorios y gadgets con garantía y envío gratuito.',
      whatsapp: '+1987654321'
    }
  }

  const service = getCampaignPlannerService()

  try {
    console.log('🛍️ Generando plan de contenido para Black Friday...')
    
    const contentPlan = await service.generateContentPlan({
      campaign,
      workspace,
      resources: [],
      templates: []
    })

    console.log(`✅ Plan de Black Friday generado: ${contentPlan.length} publicaciones`)
    
    return contentPlan
  } catch (error) {
    console.error('❌ Error generando plan de Black Friday:', error)
    throw error
  }
}

// Ejemplo 3: Regenerar elemento específico
export async function exampleRegenerateItem() {
  // Primero generar un plan
  const contentPlan = await exampleFitnessCampaign()
  
  if (contentPlan.length === 0) {
    throw new Error('No hay contenido para regenerar')
  }

  const campaign: CampaignData = {
    id: 'campaign-fitness-001',
    name: 'Rutina de Verano 2024',
    objective: 'Promocionar rutinas de ejercicio para el verano',
    startDate: '2024-06-01T09:00:00Z',
    endDate: '2024-06-07T21:00:00Z',
    socialNetworks: ['instagram', 'facebook', 'tiktok'],
    intervalHours: 12,
    contentType: 'optimized',
    prompt: 'Crea contenido motivacional sobre fitness con un enfoque más técnico y detallado'
  }

  const workspace: WorkspaceData = {
    id: 'workspace-fitlife',
    name: 'FitLife Studio',
    branding: {
      primaryColor: '#FF6B35',
      secondaryColor: '#004E89',
      slogan: 'Tu mejor versión te espera',
      description: 'Estudio de fitness especializado en entrenamiento personalizado',
    }
  }

  const service = getCampaignPlannerService()

  try {
    console.log('🔄 Regenerando elemento específico...')
    
    // Regenerar el primer elemento (índice 0)
    const newItem = await service.regenerateContentItem({
      campaign,
      workspace,
      resources: [],
      templates: [],
      itemIndex: 0,
      previousPlan: contentPlan
    })

    console.log('✅ Elemento regenerado exitosamente:', newItem.title)
    
    return newItem
  } catch (error) {
    console.error('❌ Error regenerando elemento:', error)
    throw error
  }
}

// Ejemplo 4: Validación de datos de campaña
export function exampleValidation() {
  const invalidCampaign: Partial<CampaignData> = {
    id: 'invalid-campaign',
    name: '', // Nombre vacío - error
    objective: 'Test objective',
    startDate: '2024-06-01T09:00:00Z',
    endDate: '2024-05-01T09:00:00Z', // Fecha fin anterior a inicio - error
    socialNetworks: [], // Sin redes sociales - error
    intervalHours: 0, // Intervalo inválido - error
    contentType: 'optimized',
    prompt: '' // Prompt vacío - error
  }

  const service = getCampaignPlannerService()
  const validation = service.validateCampaignData(invalidCampaign as CampaignData)

  console.log('🔍 Resultado de validación:')
  console.log('Es válido:', validation.isValid)
  console.log('Errores:', validation.errors)

  return validation
}

// Ejemplo 5: Copiar plan al portapapeles
export async function exampleCopyToClipboard() {
  const contentPlan = await exampleFitnessCampaign()
  const service = getCampaignPlannerService()

  try {
    await service.copyContentPlanToClipboard(contentPlan)
    console.log('📋 Plan copiado al portapapeles exitosamente')
  } catch (error) {
    console.error('❌ Error copiando al portapapeles:', error)
  }
}

// Función para ejecutar todos los ejemplos
export async function runAllExamples() {
  console.log('🎯 Ejecutando ejemplos del Campaign Planner...\n')

  try {
    // Ejemplo 1: Campaña de fitness
    console.log('1️⃣ Ejemplo de campaña de fitness:')
    await exampleFitnessCampaign()
    console.log('')

    // Ejemplo 2: Campaña de e-commerce
    console.log('2️⃣ Ejemplo de campaña de e-commerce:')
    await exampleEcommerceCampaign()
    console.log('')

    // Ejemplo 3: Regenerar elemento
    console.log('3️⃣ Ejemplo de regeneración de elemento:')
    await exampleRegenerateItem()
    console.log('')

    // Ejemplo 4: Validación
    console.log('4️⃣ Ejemplo de validación:')
    exampleValidation()
    console.log('')

    // Ejemplo 5: Copiar al portapapeles
    console.log('5️⃣ Ejemplo de copia al portapapeles:')
    await exampleCopyToClipboard()
    console.log('')

    console.log('✅ Todos los ejemplos ejecutados exitosamente')
  } catch (error) {
    console.error('❌ Error ejecutando ejemplos:', error)
  }
}

// Exportar ejemplos individuales para uso en tests o desarrollo
export const campaignPlannerExamples = {
  fitness: exampleFitnessCampaign,
  ecommerce: exampleEcommerceCampaign,
  regenerateItem: exampleRegenerateItem,
  validation: exampleValidation,
  copyToClipboard: exampleCopyToClipboard,
  runAll: runAllExamples
}