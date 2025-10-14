# Prueba del Sistema Campaign Planner

## 🎯 Objetivo
Verificar que el sistema de Campaign Planner funciona correctamente después de la integración.

## 📋 Pasos para Probar

### 1. Configuración Previa
Asegúrate de que tienes configurado:
- ✅ `GEMINI_API_KEY` en tu archivo `.env`
- ✅ Un workspace con branding configurado
- ✅ Algunos recursos (imágenes/videos) en el workspace
- ✅ Algunas plantillas en el workspace

### 2. Flujo de Prueba

1. **Navegar a crear campaña**
   - Ve a `/workspace/[id]/campaigns/new`
   - Deberías ver el formulario de 4 pasos

2. **Completar Paso 1: Datos de Campaña**
   - Nombre: "Campaña de Prueba"
   - Objetivo: "Probar el sistema de planificación automática"
   - Fechas: Selecciona un rango de 3-7 días
   - Redes sociales: Instagram, Facebook
   - Intervalo: 12 horas (2 publicaciones por día)
   - Tipo: Optimizado

3. **Completar Paso 2: Recursos**
   - Selecciona algunos recursos disponibles
   - Selecciona algunas plantillas

4. **Completar Paso 3: Prompt IA**
   - Escribe un prompt como: "Crea contenido educativo y atractivo sobre [tu tema]. El tono debe ser profesional pero accesible."

5. **Paso 4: Plan de Contenido (NUEVO)**
   - Deberías ver automáticamente el Campaign Planner
   - Se debería generar una lista de contenido planificado
   - Cada item debería tener: título, descripción, red social, fecha, tipo, prioridad

### 3. Funcionalidades a Probar

#### ✅ Generación Automática
- [ ] Se genera automáticamente al llegar al paso 4
- [ ] Muestra loading state durante la generación
- [ ] Genera el número correcto de publicaciones (basado en fechas e intervalo)
- [ ] Distribuye contenido entre las redes sociales seleccionadas

#### ✅ Regeneración
- [ ] Botón "Regenerar todo" funciona
- [ ] Botón "Regenerar" en items individuales funciona
- [ ] El contenido regenerado es diferente al original
- [ ] Mantiene coherencia con el resto del plan

#### ✅ Botón PostIA
- [ ] Copia el plan al portapapeles
- [ ] El formato copiado es legible y bien estructurado
- [ ] Incluye todos los detalles de cada publicación

#### ✅ Navegación
- [ ] Botón "Volver al Prompt" funciona
- [ ] Botón "Crear Campaña con Plan" crea la campaña
- [ ] Redirige correctamente después de crear

### 4. Casos de Error a Probar

#### ❌ Sin API Key
- [ ] Muestra error claro si no hay GEMINI_API_KEY

#### ❌ Datos Inválidos
- [ ] Valida fechas (fin debe ser después de inicio)
- [ ] Valida que haya al menos una red social
- [ ] Valida que el intervalo sea mayor a 0

#### ❌ Errores de Red
- [ ] Maneja errores de conexión con Gemini
- [ ] Muestra mensaje de error comprensible
- [ ] Permite reintentar

### 5. Verificaciones de Calidad

#### 📊 Contenido Generado
- [ ] Los títulos son atractivos y relevantes
- [ ] Las descripciones son detalladas y útiles
- [ ] Los tipos de contenido son variados (post, story, reel, carousel)
- [ ] Las prioridades están bien distribuidas
- [ ] Los tags son relevantes al contenido
- [ ] Las fechas están correctamente programadas

#### 🎨 Interfaz de Usuario
- [ ] El diseño es consistente con el resto de la app
- [ ] Los estados de loading son claros
- [ ] Los botones son accesibles y funcionales
- [ ] La información se presenta de forma organizada
- [ ] Es responsive en móvil y desktop

#### ⚡ Rendimiento
- [ ] La generación toma menos de 30 segundos
- [ ] La interfaz no se congela durante la generación
- [ ] Las regeneraciones son más rápidas que la generación inicial

## 🐛 Problemas Conocidos y Soluciones

### Problema: "No se pudo obtener la información del workspace"
**Solución**: Asegúrate de que el workspace esté correctamente cargado en el contexto.

### Problema: Error de API de Gemini
**Solución**: 
1. Verifica que `GEMINI_API_KEY` esté configurada
2. Verifica que tengas créditos en tu cuenta de Google AI
3. Verifica la conexión a internet

### Problema: El plan generado está vacío
**Solución**:
1. Verifica que las fechas y el intervalo generen al menos 1 publicación
2. Revisa el prompt - debe ser claro y específico
3. Verifica los logs del navegador para errores

### Problema: Los recursos/plantillas no aparecen
**Solución**:
1. Asegúrate de que el workspace tenga recursos y plantillas
2. Verifica que los hooks `useResources` y `useTemplates` funcionen

## 📝 Checklist de Funcionalidad Completa

- [ ] **Paso 1-3**: Formulario original funciona
- [ ] **Paso 4**: Campaign Planner se muestra automáticamente
- [ ] **Generación**: Crea plan de contenido inteligente
- [ ] **Regeneración**: Permite modificar el plan
- [ ] **PostIA**: Copia al portapapeles funciona
- [ ] **Creación**: Crea la campaña con el plan
- [ ] **Navegación**: Todos los botones funcionan
- [ ] **Errores**: Manejo robusto de errores
- [ ] **UX**: Interfaz intuitiva y responsive

## 🎉 Resultado Esperado

Al completar todas las pruebas, deberías tener:

1. **Un flujo completo** de creación de campañas con planificación automática
2. **Una lista detallada** de contenido a crear para la campaña
3. **Capacidad de regeneración** para ajustar el plan según necesidades
4. **Integración perfecta** con el sistema existente de PostIA

## 🚀 Próximos Pasos

Una vez que el Campaign Planner funcione correctamente:

1. **Integrar con otros agentes**: Content Creator, Visual Advisor, etc.
2. **Mejorar la UI**: Agregar más opciones de personalización
3. **Optimizar rendimiento**: Caché, lazy loading, etc.
4. **Agregar métricas**: Tracking de uso y efectividad

---

**Nota**: Si encuentras algún problema durante las pruebas, documenta el error exacto, los pasos para reproducirlo, y cualquier mensaje de error en la consola del navegador.