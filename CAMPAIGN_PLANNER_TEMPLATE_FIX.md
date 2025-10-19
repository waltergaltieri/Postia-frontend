# Fix: Uso de Plantillas y Variación de Tipos de Contenido

## Problema Identificado

El sistema de planificación de campañas tenía dos problemas principales:

1. **No usaba las plantillas seleccionadas** - siempre generaba contenido con "diseño libre"
2. **Solo generaba contenido "text-with-image"** - nunca generaba contenido solo texto o carrusel

## Análisis de la Causa

### 1. Problema en el Prompt
- El prompt no tenía reglas claras sobre cuándo usar cada tipo de contenido
- La selección de plantillas era aleatoria o siempre usaba la primera disponible
- No había validación de compatibilidad entre tipo de contenido y plantilla

### 2. Problema en el Parsing
- No había validación de consistencia en los datos generados
- No se aplicaban reglas de negocio para corregir inconsistencias

### 3. Falta de Logging
- No había suficiente información de debug para identificar el problema

## Solución Implementada

### 1. Mejoras en el Prompt (`buildEnhancedCampaignPlanPrompt`)

#### Reglas Claras de Tipos de Contenido:
```
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
```

#### Mapeo de Compatibilidad:
```typescript
const templateCompatibility = templates.map(t => ({
  id: t.id,
  name: t.name,
  type: t.type,
  networks: t.socialNetworks,
  compatibleContentTypes: t.type === 'carousel' ? ['text-with-carousel'] : ['text-only', 'text-with-image']
}))
```

### 2. Mejoras en el Parsing (`parseContentPlanResponse`)

#### Validación y Corrección Automática:
```typescript
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
```

### 3. Sistema de Validación (`validateGeneratedPlan`)

#### Logging Detallado:
- Cuenta tipos de contenido generados
- Verifica uso de plantillas y recursos
- Identifica inconsistencias
- Proporciona estadísticas de distribución

#### Alertas de Problemas:
```typescript
if (stats.textOnly === 0) {
  console.warn('⚠️ No se generó contenido text-only')
}

if (stats.templatesUsed.size === 0 && templates.length > 0) {
  console.warn('⚠️ No se usaron plantillas disponibles')
}
```

### 4. Mejoras en el Logging

#### Información de Debug:
```typescript
console.log('📊 Resource analyses completed:', resourceAnalyses.length)
console.log(`📊 Available resources: ${resources.length}`)
console.log(`🎨 Available templates: ${templates.length}`)
```

#### Estadísticas de Validación:
```typescript
console.log('📊 Plan validation results:')
console.log(`   📝 Text-only: ${stats.textOnly} (${Math.round(stats.textOnly/contentPlan.length*100)}%)`)
console.log(`   🖼️ Text-with-image: ${stats.textWithImage} (${Math.round(stats.textWithImage/contentPlan.length*100)}%)`)
console.log(`   🎠 Text-with-carousel: ${stats.textWithCarousel} (${Math.round(stats.textWithCarousel/contentPlan.length*100)}%)`)
```

## Resultados Esperados

### 1. Variación de Tipos de Contenido
- **30% text-only**: Contenido puramente textual, ideal para reflexiones y debates
- **50% text-with-image**: Contenido con una imagen de apoyo
- **20% text-with-carousel**: Contenido con múltiples imágenes para storytelling

### 2. Uso Correcto de Plantillas
- **text-only**: Sin plantilla (diseño libre)
- **text-with-image**: Plantillas tipo "single"
- **text-with-carousel**: Plantillas tipo "carousel"
- Validación de compatibilidad con redes sociales

### 3. Uso Inteligente de Recursos
- **text-only**: Sin recursos
- **text-with-image**: Exactamente 1 recurso
- **text-with-carousel**: Entre 2-5 recursos

## Testing

Para probar los cambios:

1. **Ejecutar el componente de prueba**: `Phase1TestComponent`
2. **Verificar en la consola** los logs de validación
3. **Revisar el plan generado** para confirmar:
   - Variación en tipos de contenido
   - Uso de plantillas específicas (no siempre diseño libre)
   - Asignación correcta de recursos

## Archivos Modificados

- `src/lib/ai/agents/CampaignPlannerAgent.ts`
  - `buildEnhancedCampaignPlanPrompt()`: Reglas claras y mapeo de compatibilidad
  - `buildCampaignPlanPrompt()`: Consistencia con el prompt mejorado
  - `parseContentPlanResponse()`: Validación y corrección automática
  - `planCampaignContent()`: Logging mejorado y validación
  - `validateGeneratedPlan()`: Nuevo método de validación

## Próximos Pasos

1. **Probar con diferentes configuraciones** de campañas
2. **Verificar compatibilidad** con diferentes redes sociales
3. **Ajustar porcentajes** de distribución si es necesario
4. **Mejorar el análisis visual** de recursos para mejor selección