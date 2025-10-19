# Fix: Restricciones Dinámicas de Tipos de Contenido

## 🎯 **Problema Identificado**

El AI generaba tipos de contenido que no correspondían a las plantillas disponibles. Por ejemplo:
- Si solo había plantillas "single", generaba contenido "text-with-carousel"
- Si no había plantillas "carousel", seguía intentando usar ese tipo

## 🔧 **Solución Implementada**

### 1. **Detección Dinámica de Tipos Disponibles**

```typescript
// Determinar tipos de contenido disponibles basándose en plantillas
const availableTemplateTypes = [...new Set(templates.map(t => t.type))]
const availableContentTypes = []

// Siempre disponible
availableContentTypes.push('text-only')

// Solo si hay plantillas single
if (availableTemplateTypes.includes('single')) {
  availableContentTypes.push('text-with-image')
}

// Solo si hay plantillas carousel
if (availableTemplateTypes.includes('carousel')) {
  availableContentTypes.push('text-with-carousel')
}
```

### 2. **Reglas Dinámicas en el Prompt**

**Antes (Estático):**
```
1. TIPOS DE CONTENIDO OBLIGATORIOS A VARIAR:
   - "text-only": Solo texto, sin imágenes (30% del contenido)
   - "text-with-image": Texto con UNA imagen (50% del contenido)  
   - "text-with-carousel": Texto con MÚLTIPLES imágenes (20% del contenido)
```

**Ahora (Dinámico):**
```
1. TIPOS DE CONTENIDO DISPONIBLES (basado en plantillas configuradas):
   - "text-only": Solo texto, sin imágenes (diseño libre)
   - "text-with-image": Texto con UNA imagen (usar plantillas "single")
   [NO incluye carousel si no hay plantillas carousel]

2. RESTRICCIONES IMPORTANTES:
   - SOLO usar los tipos de contenido listados arriba
   - NO generar contenido "text-with-carousel" si no hay plantillas carousel disponibles
   - NO generar contenido "text-with-image" si no hay plantillas single disponibles
```

### 3. **Logging de Validación**

```typescript
console.log('📋 Available template types:', availableTemplateTypes)
console.log('📋 Available content types:', availableContentTypes)
```

## 📊 **Ejemplos de Funcionamiento**

### **Caso 1: Solo plantillas Single**
```typescript
templateIds: ['template-001', 'template-003'] // Solo single
```

**Resultado:**
- Available template types: ['single']
- Available content types: ['text-only', 'text-with-image']
- **NO genera** contenido 'text-with-carousel'

### **Caso 2: Solo plantillas Carousel**
```typescript
templateIds: ['template-002'] // Solo carousel
```

**Resultado:**
- Available template types: ['carousel']
- Available content types: ['text-only', 'text-with-carousel']
- **NO genera** contenido 'text-with-image'

### **Caso 3: Plantillas Mixtas**
```typescript
templateIds: ['template-001', 'template-002'] // Single + Carousel
```

**Resultado:**
- Available template types: ['single', 'carousel']
- Available content types: ['text-only', 'text-with-image', 'text-with-carousel']
- **Genera todos los tipos**

## ✅ **Beneficios**

1. **Consistencia**: El AI solo genera contenido que puede ser implementado
2. **Flexibilidad**: Se adapta automáticamente a cualquier configuración de plantillas
3. **Prevención de errores**: Evita generar contenido incompatible
4. **Claridad**: El prompt es explícito sobre qué puede y no puede hacer

## 🧪 **Para Probar**

1. **Modificar `templateIds` en Phase1TestComponent**:
   - Solo single: `['template-001', 'template-003']`
   - Solo carousel: `['template-002']`
   - Mixto: `['template-001', 'template-002']`

2. **Verificar en consola**:
   - Available template types
   - Available content types
   - Que el contenido generado respete las restricciones

## 🔧 **Archivos Modificados**

- `src/lib/ai/agents/CampaignPlannerAgent.ts`:
  - Detección dinámica de tipos disponibles
  - Reglas dinámicas en el prompt
  - Logging de validación

- `src/components/campaigns/Phase1TestComponent.tsx`:
  - Datos de prueba actualizados para probar restricciones

## 🎯 **Resultado Esperado**

El AI ahora **respeta completamente** la configuración de plantillas y solo genera contenido que puede ser implementado con las plantillas disponibles.