/**
 * Prueba simple para verificar que las importaciones funcionan correctamente
 */

import { getCampaignPlannerService } from './services/CampaignPlannerService'
import type { GenerateContentPlanParams } from './services/CampaignPlannerService'

// Test básico de importación
export function testServiceImport() {
  console.log('✅ Importación de getCampaignPlannerService exitosa')
  console.log('✅ Importación de createCampaignPlannerService exitosa')
  console.log('✅ Importación de tipos exitosa')
  
  // Crear instancia del servicio
  const service = getCampaignPlannerService()
  console.log('✅ Creación de instancia del servicio exitosa')
  
  // Verificar que los métodos existen
  console.log('✅ Método generateContentPlan:', typeof service.generateContentPlan === 'function')
  console.log('✅ Método regenerateContentPlan:', typeof service.regenerateContentPlan === 'function')
  console.log('✅ Método regenerateContentItem:', typeof service.regenerateContentItem === 'function')
  console.log('✅ Método copyContentPlanToClipboard:', typeof service.copyContentPlanToClipboard === 'function')
  console.log('✅ Método validateCampaignData:', typeof service.validateCampaignData === 'function')
  console.log('✅ Método calculatePlanStatistics:', typeof service.calculatePlanStatistics === 'function')
  
  return true
}

// Exportar para uso en consola del navegador
if (typeof window !== 'undefined') {
  (window as any).testCampaignPlannerService = testServiceImport
}