# Fix: Selección de Plantillas en Campaign Planner

## Problema Identificado

El sistema no estaba usando las plantillas seleccionadas en la configuración de la campaña. Siempre generaba contenido con "diseño libre" (templateId: null).

## Causa Raíz

El problema estaba en los **template literals dentro de strings** en los prompts. El código tenía:

```typescript
"templateId": "${templates.find(t => t.type === 'single')?.id || null}"
```

Esto se enviaba **literalmente** al AI como texto, no como código JavaScript evaluado. El AI veía exactamente esa cadena de texto en lugar de un ID real.

## Solución Implementada

### 1. **Pre-evaluación de Template Literals**

Antes del prompt, ahora se evalúan las plantillas:

```typescript
// Crear ejemplos dinámicos con IDs reales
const singleTemplate = templates.find(t => t.type === 'single' && t.socialNetworks.includes('instagram'))
const carouselTemplate = templates.find(t => t.type === 'carousel')
const firstResource = resources[0]
const secondResource = resources[1]
```

### 2. **Uso de Variables Pre-evaluadas en el Prompt**

En lugar de:
```typescript
"templateId": "${templates.find(t => t.type === 'single')?.id || null}"
```

Ahora usa:
```typescript
"templateId": "${singleTemplate?.id || null}"
```

### 3. **Logging Mejorado para Debug**

Agregué logging detallado para identificar problemas:

```typescript
console.log('🎨 Template IDs:', templates.map(t => `${t.id}: ${t.name}`).join(', '))

// Mostrar detalles de cada item para debug
console.log('📋 Detailed plan breakdown:')
contentPlan.forEach((item, index) => {
  console.log(`   ${index + 1}. ${item.title}`)
  console.log(`      Type: ${item.contentType}`)
  console.log(`      Template: ${item.templateId || 'DISEÑO LIBRE'}`)
  console.log(`      Resources: ${item.resourceIds?.length || 0}`)
})
```

## Archivos Modificados

- `src/lib/ai/agents/CampaignPlannerAgent.ts`
  - `buildEnhancedCampaignPlanPrompt()`: Pre-evaluación de plantillas
  - `buildCampaignPlanPrompt()`: Mismo fix aplicado
  - `validateGeneratedPlan()`: Logging detallado agregado
  - `planCampaignContent()`: Logging de plantillas disponibles

## Resultado Esperado

Ahora el sistema debería:

1. **Usar plantillas específicas** cuando están disponibles
2. **Respetar la compatibilidad** plantilla-red social-tipo de contenido
3. **Mostrar logging detallado** para debug
4. **Generar variedad** en tipos de contenido (text-only, text-with-image, text-with-carousel)

## Testing

Para verificar el fix:

1. Ejecutar `Phase1TestComponent`
2. Revisar la consola para ver:
   - `🎨 Template IDs: template-001: Single Post Moderno, template-002: Carrusel Educativo`
   - `📋 Detailed plan breakdown:` con templates específicos
3. Verificar que algunos items tengan `Template: template-001` en lugar de `DISEÑO LIBRE`

## Próximos Pasos

Si el problema persiste, revisar:

1. **Datos de entrada**: ¿Se están pasando plantillas al agente?
2. **Respuesta del AI**: ¿Gemini está siguiendo las instrucciones del prompt?
3. **Parsing**: ¿El parsing está manteniendo los templateIds correctos?

El logging detallado ahora debería mostrar exactamente dónde está fallando el proceso.