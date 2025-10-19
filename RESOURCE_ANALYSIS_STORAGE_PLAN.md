# Plan de Implementación: Guardado de Análisis de IA

## 🎯 Objetivo
Guardar permanentemente los análisis extremadamente precisos generados por `VisualAnalyzerAgent` y `SemanticResourceAnalyzerAgent` para reutilización y optimización.

## 📊 Análisis Actuales que se Pierden

### VisualAnalyzerAgent
- **Descripción visual precisa** de cada recurso
- **Usos sugeridos específicos** (hero, carousel, story, etc.)
- **Redes sociales compatibles**
- **Mood/ambiente** que transmite
- **Colores predominantes** extraídos
- **Elementos visuales** identificados

### SemanticResourceAnalyzerAgent  
- **Compatibilidad con marca** (high/medium/low + justificación)
- **Características distintivas** del recurso
- **Riesgos identificados** (legibilidad, contraste, etc.)
- **Aptitud por red social** con explicación
- **Fortalezas de layout** para plantillas
- **Capacidad de texto** (headline, subhead, CTA)

## 🏗️ Arquitectura Propuesta

### 1. Nuevas Tablas de Base de Datos

```sql
-- Análisis de recursos
CREATE TABLE resource_analyses (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  campaign_id TEXT,                    -- Opcional: análisis específico para campaña
  visual_analysis JSON NOT NULL,       -- ResourceAnalysis completo
  semantic_analysis JSON,              -- SemanticResourceIndex
  analysis_version TEXT DEFAULT '1.0', -- Para versionado de análisis
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Análisis de plantillas
CREATE TABLE template_analyses (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  campaign_id TEXT,                    -- Opcional: análisis específico para campaña
  semantic_analysis JSON NOT NULL,     -- SemanticTemplateIndex completo
  analysis_version TEXT DEFAULT '1.0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Índices para optimización
CREATE INDEX idx_resource_analyses_resource_id ON resource_analyses(resource_id);
CREATE INDEX idx_resource_analyses_workspace_id ON resource_analyses(workspace_id);
CREATE INDEX idx_template_analyses_template_id ON template_analyses(template_id);
CREATE INDEX idx_template_analyses_workspace_id ON template_analyses(workspace_id);
```

### 2. Nuevos Repositorios

#### ResourceAnalysisRepository
```typescript
export class ResourceAnalysisRepository extends BaseRepository {
  async saveResourceAnalysis(
    resourceId: string,
    workspaceId: string,
    visualAnalysis: ResourceAnalysis,
    semanticAnalysis?: SemanticResourceIndex,
    campaignId?: string
  ): Promise<string>

  async getResourceAnalysis(
    resourceId: string,
    campaignId?: string
  ): Promise<ResourceAnalysisRecord | null>

  async getWorkspaceResourceAnalyses(
    workspaceId: string
  ): Promise<ResourceAnalysisRecord[]>
}
```

#### TemplateAnalysisRepository
```typescript
export class TemplateAnalysisRepository extends BaseRepository {
  async saveTemplateAnalysis(
    templateId: string,
    workspaceId: string,
    semanticAnalysis: SemanticTemplateIndex,
    campaignId?: string
  ): Promise<string>

  async getTemplateAnalysis(
    templateId: string,
    campaignId?: string
  ): Promise<TemplateAnalysisRecord | null>
}
```

### 3. Servicios Actualizados

#### ResourceAnalysisService
```typescript
export class ResourceAnalysisService {
  async analyzeAndSaveResource(
    resource: ResourceData,
    workspace: WorkspaceData,
    campaignId?: string
  ): Promise<{
    visual: ResourceAnalysis
    semantic?: SemanticResourceIndex
  }>

  async getCachedAnalysis(
    resourceId: string,
    campaignId?: string
  ): Promise<ResourceAnalysisRecord | null>

  async refreshAnalysis(
    resourceId: string,
    forceRegenerate?: boolean
  ): Promise<ResourceAnalysisRecord>
}
```

### 4. Modificaciones en CampaignPlannerAgent

```typescript
async planCampaignContent(params: {
  campaign: CampaignData
  workspace: WorkspaceData
  resources: ResourceData[]
  templates: TemplateData[]
}): Promise<ContentPlanItem[]> {
  
  // 1. Verificar análisis existentes
  const existingAnalyses = await this.getExistingAnalyses(
    params.resources,
    params.templates,
    params.campaign.id
  )

  // 2. Analizar solo recursos/plantillas sin análisis previo
  const newResourceAnalyses = await this.analyzeNewResources(
    params.resources.filter(r => !existingAnalyses.resources[r.id])
  )

  // 3. Guardar nuevos análisis
  await this.saveAnalyses(newResourceAnalyses, params.campaign.id)

  // 4. Combinar análisis existentes + nuevos
  const allAnalyses = this.combineAnalyses(existingAnalyses, newResourceAnalyses)

  // 5. Generar plan usando análisis completos
  return this.generatePlanWithAnalyses(params, allAnalyses)
}
```

## 🚀 Beneficios de la Implementación

### 1. **Reutilización de Análisis**
- No regenerar análisis para recursos ya analizados
- Análisis consistentes entre campañas
- Reducción de llamadas a IA

### 2. **Optimización de Performance**
- Cache de análisis costosos
- Generación más rápida de campañas
- Menor uso de tokens de IA

### 3. **Mejora Continua**
- Historial de análisis por versión
- Comparación de efectividad
- Refinamiento de prompts

### 4. **Insights de Workspace**
- Dashboard de análisis de recursos
- Recomendaciones basadas en historial
- Identificación de recursos más efectivos

## 📋 Plan de Implementación

### Fase 1: Base de Datos
1. ✅ Crear migraciones para nuevas tablas
2. ✅ Implementar repositorios base
3. ✅ Crear tipos TypeScript

### Fase 2: Servicios
1. ✅ ResourceAnalysisService
2. ✅ TemplateAnalysisService  
3. ✅ Integración con agentes existentes

### Fase 3: Integración
1. ✅ Modificar CampaignPlannerAgent
2. ✅ Actualizar flujo de creación de campañas
3. ✅ Implementar cache y reutilización

### Fase 4: UI/UX
1. ✅ Dashboard de análisis de recursos
2. ✅ Vista detallada de análisis por recurso
3. ✅ Herramientas de gestión de análisis

## 🔍 Casos de Uso

### Caso 1: Primera Campaña
1. Usuario sube recursos y plantillas
2. IA analiza todo desde cero
3. **Análisis se guardan permanentemente**
4. Campaña se genera con análisis completos

### Caso 2: Segunda Campaña (mismo workspace)
1. Usuario selecciona recursos ya analizados
2. **Sistema reutiliza análisis existentes**
3. Solo analiza recursos/plantillas nuevos
4. Generación más rápida y consistente

### Caso 3: Análisis Detallado
1. Usuario ve dashboard de recursos
2. **Puede revisar análisis de IA por recurso**
3. Entiende por qué IA eligió ciertos recursos
4. Puede refinar selección basada en insights

## 📊 Métricas de Éxito

- **Reducción de tiempo** de generación de campañas (50%+)
- **Reducción de tokens** de IA utilizados (60%+)
- **Consistencia** en análisis entre campañas (95%+)
- **Satisfacción** del usuario con recomendaciones (80%+)

## 🔧 Consideraciones Técnicas

### Versionado de Análisis
- Cada análisis tiene versión para evolución de algoritmos
- Migración automática cuando se mejoran prompts
- Comparación de efectividad entre versiones

### Cache Strategy
- Análisis por recurso (global)
- Análisis por recurso + campaña (específico)
- TTL configurable para re-análisis

### Privacidad
- Análisis vinculados a workspace
- No compartir análisis entre agencias
- Opción de limpiar análisis antiguos