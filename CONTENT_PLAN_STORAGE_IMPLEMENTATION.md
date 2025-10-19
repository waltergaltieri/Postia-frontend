# Implementación del Guardado del Plan de Contenido

## 🎯 Problema Actual
El plan de contenido generado por la IA en el paso 4 **NO se está guardando** como publicaciones individuales en la base de datos. Solo se guarda la información básica de la campaña.

## 📊 Estado Actual vs Estado Deseado

### ❌ **Estado Actual**
1. Usuario completa pasos 1-3 del formulario
2. IA genera plan de contenido en paso 4
3. Usuario hace clic en "Crear Campaña"
4. **Solo se guarda la campaña básica**
5. **El plan de contenido se pierde**

### ✅ **Estado Deseado**
1. Usuario completa pasos 1-3 del formulario
2. IA genera plan de contenido en paso 4
3. Usuario hace clic en "Crear Campaña"
4. **Se guarda la campaña básica**
5. **Se crean publicaciones individuales** para cada elemento del plan
6. **Las publicaciones aparecen en el calendario**

## 🔧 Cambios Implementados

### 1. Modificación de `CampaignContentPlanStep.tsx`
- ✅ Cambiado `onNext: () => void` a `onNext: (contentPlan: ContentPlanItem[]) => void`
- ✅ El botón "Crear Campaña" ahora pasa el plan de contenido: `onClick={() => onNext(contentPlan)}`

### 2. Modificación de `CampaignCreationForm.tsx`
- ✅ Agregado estado para almacenar el plan: `const [generatedContentPlan, setGeneratedContentPlan] = useState<ContentPlanItem[]>([])`
- ✅ Modificado `handleCreateCampaignWithPlan` para recibir el plan: `async (contentPlan: ContentPlanItem[])`
- ✅ El plan se almacena temporalmente y se registra en consola

## 🚧 Implementación Pendiente

### 1. Crear API para Publicaciones
**Archivo:** `postia-frontend/src/app/api/publications/route.ts`

```typescript
/**
 * POST /api/publications
 * Create multiple publications from content plan
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { campaignId, contentPlan } = body
    
    // Validate campaign exists
    // Create individual publications
    // Return created publications
    
  } catch (error) {
    // Handle error
  }
}
```

### 2. Crear Servicio para Publicaciones Masivas
**Archivo:** `postia-frontend/src/lib/database/services/PublicationService.ts`

Agregar método:
```typescript
public createPublicationsFromPlan(
  campaignId: string,
  contentPlan: ContentPlanItem[],
  agencyId: string
): Publication[] {
  // Validate campaign access
  // Create publications from plan
  // Return created publications
}
```

### 3. Actualizar API de Campañas
**Archivo:** `postia-frontend/src/store/api/campaignsApi.ts`

Agregar endpoint:
```typescript
createCampaignWithPublications: builder.mutation<
  ApiResponse<{ campaign: Campaign; publications: Publication[] }>,
  CampaignFormData & { workspaceId: string; contentPlan: ContentPlanItem[] }
>({
  query: campaignData => ({
    url: '/with-publications',
    method: 'POST',
    body: campaignData,
  }),
  invalidatesTags: ['Campaign'],
}),
```

### 4. Completar el Guardado en el Formulario
**Archivo:** `postia-frontend/src/components/campaigns/CampaignCreationForm.tsx`

```typescript
// 2. Create publications from content plan
const publicationsResponse = await fetch('/api/publications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    campaignId: createdCampaign.data.id,
    contentPlan: contentPlan
  })
})

const publications = await publicationsResponse.json()
console.log('✅ Publications created:', publications)
```

## 📋 Estructura de Datos

### ContentPlanItem → Publication
```typescript
// ContentPlanItem (generado por IA)
{
  id: string
  title: string
  description: string
  socialNetwork: 'instagram' | 'tiktok' | 'linkedin'
  scheduledDate: string
  templateId?: string
  resourceIds: string[]
  contentType: 'text-only' | 'text-with-image' | 'text-with-carousel'
  priority: 'high' | 'medium' | 'low'
  tags: string[]
  notes?: string
}

// Publication (guardado en BD)
{
  id: string
  campaignId: string
  content: string          // description del plan
  imageUrl: string         // URL del primer recurso
  socialNetwork: SocialNetwork
  scheduledDate: Date      // convertir de string
  status: 'scheduled'      // siempre scheduled al crear
  templateId: string       // del plan
  resourceId: string       // primer recurso del array
  createdAt: Date
}
```

## 🎯 Próximos Pasos

1. **Crear endpoint POST /api/publications**
2. **Implementar servicio de creación masiva**
3. **Actualizar el formulario para llamar al nuevo endpoint**
4. **Probar el flujo completo**
5. **Verificar que las publicaciones aparezcan en el calendario**

## 🔍 Verificación

Para verificar que funciona correctamente:

1. Crear una campaña con plan de contenido
2. Ir al calendario del workspace
3. **Deberían aparecer las publicaciones programadas**
4. Cada publicación debería tener:
   - Contenido específico generado por IA
   - Recurso asignado
   - Plantilla asignada
   - Fecha programada
   - Red social específica

## 📝 Notas Importantes

- **Los recursos múltiples**: Si un elemento del plan tiene múltiples `resourceIds`, usar el primero como `resourceId` principal
- **Contenido**: Usar el `description` del plan como `content` de la publicación
- **Estado inicial**: Todas las publicaciones se crean con status `'scheduled'`
- **Validaciones**: Verificar que los recursos y plantillas existan y pertenezcan al workspace