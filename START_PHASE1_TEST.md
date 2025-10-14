# 🚀 Iniciar Prueba de Fase 1

## Pasos para probar la implementación:

### 1. Iniciar el servidor de desarrollo
```bash
cd postia-frontend
npm run dev
```

### 2. Abrir la página de prueba
Una vez que el servidor esté corriendo (normalmente en http://localhost:3000), navega a:

```
http://localhost:3000/test/phase1
```

### 3. Ejecutar la prueba
1. En la página verás un botón **"🚀 Ejecutar Fase 1"**
2. Haz clic para ejecutar la prueba completa
3. El sistema procesará:
   - ✅ Validación de insumos
   - 🔍 Análisis semántico de recursos y templates
   - 📅 Planificación temporal de slots
   - 🎨 Generación de ideas de contenido
   - 📊 Compilación del plan consolidado
   - ✅ Control de calidad

### 4. Revisar resultados
La página mostrará:
- **Resumen ejecutivo** con métricas clave
- **Control de calidad** con validaciones
- **Plan consolidado** con ideas por slot
- **Análisis semántico** de recursos y templates
- **Plan temporal** con estadísticas

## 📊 Datos de Prueba Incluidos

La prueba utiliza datos realistas:
- **Campaña**: "Campaña de Lanzamiento Producto"
- **Duración**: 7 días con publicaciones cada 8 horas
- **Redes**: Instagram, Facebook, LinkedIn
- **Recursos**: 3 recursos (imágenes y video)
- **Templates**: 3 templates (single y carousel)
- **Restricciones**: 3 restricciones de marca
- **Objetivos**: 3 objetivos de negocio

## 🎯 Qué Esperar

La Fase 1 debería generar:
- **~21 slots** de publicación (7 días × 3 publicaciones/día)
- **Ideas de contenido** específicas por slot
- **Score de calidad** entre 70-100%
- **Tiempo de procesamiento** < 10 segundos
- **Validaciones** todas en verde ✅

## 🔧 Troubleshooting

Si encuentras algún problema:

1. **Error de compilación**: Verifica que todas las dependencias estén instaladas
2. **Error de Gemini AI**: Verifica que la API key esté configurada en `.env.local`
3. **Timeout**: La primera ejecución puede tardar más mientras se inicializa Gemini
4. **Fallback activado**: Si Gemini no responde, el sistema usará algoritmos determinísticos

## 📝 Logs de Debug

Abre las DevTools del navegador (F12) para ver logs detallados:
- `🚀 CampaignPlannerService.generateContentPlan STARTED`
- `🔍 SemanticResourceAnalyzerAgent: Analyzing resources...`
- `📅 TemporalPlannerService: Calculating publication slots...`
- `🎨 ContentIdeationOrchestratorAgent: Generating content ideas...`
- `✅ Fase 1 completada`

¡Listo para probar! 🎉