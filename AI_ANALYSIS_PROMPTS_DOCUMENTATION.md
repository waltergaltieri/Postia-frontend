# Prompts de los Agentes de Análisis de IA

## 🎯 Resumen
Los agentes de análisis generan descripciones extremadamente detalladas de recursos y plantillas que luego se reutilizan en el planificador de campañas.

## 🤖 **1. VisualAnalyzerAgent - Análisis Visual de Recursos**

### **Propósito:**
Analiza visualmente imágenes y videos para generar descripciones detalladas, identificar mood, colores, elementos y usos sugeridos.

### **Prompt Completo:**
```
Eres un experto analista de contenido visual para marketing digital. Tu tarea es analizar un recurso visual y proporcionar información detallada para su uso en campañas de redes sociales.

RECURSO A ANALIZAR:
- Nombre: [nombre_del_recurso]
- Tipo: [image/video]
- URL: [url_del_recurso]

INSTRUCCIONES:
1. Analiza el contenido visual del recurso
2. Describe qué se ve en la imagen/video
3. Identifica el mood/ambiente que transmite
4. Sugiere usos apropiados para redes sociales
5. Recomienda tipos de contenido compatibles
6. Identifica colores predominantes
7. Lista elementos visuales importantes

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido:
{
  "description": "Descripción detallada de lo que se ve en el recurso",
  "suggestedUse": ["uso1", "uso2", "uso3"],
  "compatibleNetworks": ["instagram", "facebook", "linkedin"],
  "contentTypes": ["post", "story", "carousel"],
  "mood": "profesional|casual|elegante|divertido|serio|creativo",
  "colors": ["#color1", "#color2", "#color3"],
  "elements": ["elemento1", "elemento2", "elemento3"]
}

EJEMPLO:
{
  "description": "Logo corporativo con tipografía moderna sobre fondo blanco, incluye símbolo geométrico en color azul",
  "suggestedUse": ["branding", "watermark", "header", "footer"],
  "compatibleNetworks": ["instagram", "facebook", "linkedin", "twitter"],
  "contentTypes": ["post", "story", "carousel", "reel"],
  "mood": "profesional",
  "colors": ["#ffffff", "#0066cc", "#333333"],
  "elements": ["logo", "tipografia", "simbolo", "fondo_limpio"]
}

NO incluyas texto adicional, solo el JSON.
```

### **Ejemplo de Respuesta:**
```json
{
  "description": "Imagen de producto con fondo limpio y iluminación profesional, enfoque nítido en el objeto principal con sombras suaves",
  "suggestedUse": ["hero", "post", "story", "carousel-main"],
  "compatibleNetworks": ["instagram", "facebook", "linkedin"],
  "contentTypes": ["post", "story", "carousel"],
  "mood": "profesional",
  "colors": ["#FFFFFF", "#3B82F6", "#1F2937"],
  "elements": ["producto", "fondo_limpio", "iluminacion_profesional", "sombras_suaves"]
}
```

## 🧠 **2. SemanticResourceAnalyzerAgent - Análisis Semántico**

### **Propósito:**
Analiza recursos y plantillas en el contexto de la marca, evaluando compatibilidad, riesgos, y adecuación para diferentes objetivos de negocio.

### **Prompt Completo:**
```
Eres un analista visual senior especializado en branding y creatividad para redes sociales. 

CONTEXTO DE MARCA:
- Nombre: [nombre_workspace]
- Colores: Primario [color_primario], Secundario [color_secundario]
- Slogan: "[slogan]"
- Descripción: [descripcion_marca]

RESTRICCIONES A EVITAR:
[restricciones_especificas o "Ninguna restricción específica"]

RECURSOS A ANALIZAR ([cantidad]):
- [nombre_recurso] ([tipo]): [url]
- [nombre_recurso] ([tipo]): [url]
...

TEMPLATES A ANALIZAR ([cantidad]):
- [nombre_template] ([tipo]): Redes [redes_sociales]
- [nombre_template] ([tipo]): Redes [redes_sociales]
...

INSTRUCCIONES:
1. Para cada recurso, describe: composición, iluminación, ángulo, fondo, textura, colores predominantes
2. Evalúa compatibilidad con la paleta de marca (alto/medio/bajo) con justificación
3. Propón usos específicos (hero de single, primer slot de carrusel, etc.)
4. Identifica riesgos (legibilidad, contraste, elementos problemáticos)
5. Para cada template, analiza jerarquía visual, capacidad de texto, adecuación por red
6. Evita suposiciones técnicas no presentes

Responde en formato JSON estructurado con análisis detallado y práctico.
```

### **Ejemplo de Respuesta Esperada:**
```json
{
  "resources": [
    {
      "resourceId": "res_123",
      "visualSummary": "Imagen de producto con composición centrada, iluminación natural difusa, fondo minimalista blanco",
      "distinctiveFeatures": ["Composición centrada", "Iluminación suave", "Fondo limpio", "Alta resolución"],
      "predominantColors": ["#FFFFFF", "#3B82F6", "#1F2937"],
      "brandCompatibility": {
        "level": "high",
        "justification": "Colores perfectamente alineados con paleta de marca, estilo profesional coherente"
      },
      "recommendedUses": ["hero de publicación single", "primer slide de carousel", "imagen principal de story"],
      "risks": ["Posible pérdida de calidad en redimensionado móvil", "Contraste variable según fondo de red social"],
      "networkSuitability": {
        "instagram": "Excelente para feed y stories, formato cuadrado ideal",
        "facebook": "Bueno para publicaciones orgánicas, se adapta bien",
        "linkedin": "Apropiado con enfoque profesional, transmite confianza"
      }
    }
  ],
  "templates": [
    {
      "templateId": "tpl_456",
      "layoutStrengths": ["Jerarquía visual clara", "Espacio amplio para contenido principal", "Área destacada para CTA"],
      "textCapacity": {
        "headline": "high",
        "subhead": "medium",
        "cta": "high"
      },
      "networkAptitude": {
        "instagram": "Formato cuadrado 1:1 ideal para feed",
        "facebook": "Adaptable a diferentes ratios, buen engagement",
        "linkedin": "Profesional y directo, ideal para B2B"
      },
      "businessObjectiveSuitability": {
        "awareness": "Excelente para impacto visual inmediato",
        "engagement": "Bueno para generar interacciones",
        "conversion": "Apropiado con CTA claro y visible"
      }
    }
  ]
}
```

## 🎯 **Cómo se Usan Estos Análisis en el Planificador**

### **En el Prompt del CampaignPlannerAgent:**
```
ANÁLISIS DETALLADO DE RECURSOS DISPONIBLES (PRE-COMPUTADO POR IA):

1. RECURSO: "producto_hero.jpg" (ID: res_123)
   - Tipo: image
   - URL: /uploads/producto_hero.jpg
   - 🤖 DESCRIPCIÓN IA: Imagen de producto con fondo limpio y iluminación profesional, enfoque nítido en el objeto principal con sombras suaves
   - 🎯 USOS SUGERIDOS: hero, post, story, carousel-main
   - 📱 REDES COMPATIBLES: instagram, facebook, linkedin
   - 🎨 MOOD/AMBIENTE: profesional
   - 🌈 COLORES: #FFFFFF, #3B82F6, #1F2937
   - 🔍 ELEMENTOS: producto, fondo_limpio, iluminacion_profesional, sombras_suaves

PLANTILLAS DISPONIBLES CON ANÁLISIS DETALLADO (PRE-COMPUTADO POR IA):

1. PLANTILLA: "Instagram Single Pro" (ID: tpl_456)
   - Tipo: single
   - Compatible con redes: instagram, facebook, linkedin
   - 🤖 FORTALEZAS DE DISEÑO: Jerarquía visual clara, Espacio amplio para contenido principal
   - 📝 CAPACIDAD DE TEXTO: Título high, Subtítulo medium, CTA high
   - 📱 APTITUD POR RED: instagram: Formato cuadrado 1:1 ideal, linkedin: Profesional y directo
   - 🎯 IDEAL PARA: awareness: Excelente para impacto visual, conversion: Apropiado con CTA claro
```

## 🔄 **Flujo de Análisis**

### **1. Al subir recurso:**
```
Usuario sube imagen → VisualAnalyzerAgent analiza →
Genera descripción detallada → SemanticResourceAnalyzerAgent evalúa →
Análisis se guarda en BD → Listo para reutilizar
```

### **2. Al crear plantilla:**
```
Usuario crea plantilla → SemanticResourceAnalyzerAgent analiza →
Evalúa fortalezas de layout → Análisis se guarda en BD → Listo para reutilizar
```

### **3. Al crear campaña:**
```
CampaignPlannerAgent busca análisis → Encuentra descripciones guardadas →
Construye prompt enriquecido → IA genera plan con contexto detallado
```

## 🎨 **Tipos de Análisis Generados**

### **Para Recursos (Imágenes/Videos):**
- **Descripción visual detallada** - Qué se ve exactamente
- **Mood/ambiente** - Profesional, casual, elegante, etc.
- **Colores predominantes** - Códigos hex específicos
- **Elementos visuales** - Lista de componentes identificados
- **Usos sugeridos** - Hero, carousel, story, etc.
- **Compatibilidad con redes** - Qué plataformas funcionan mejor
- **Compatibilidad con marca** - Alto/medio/bajo + justificación
- **Riesgos identificados** - Problemas potenciales

### **Para Plantillas:**
- **Fortalezas de layout** - Qué hace bien el diseño
- **Capacidad de texto** - Cuánto texto soporta cada sección
- **Aptitud por red social** - Cómo funciona en cada plataforma
- **Adecuación por objetivo** - Awareness, engagement, conversion
- **Jerarquía visual** - Cómo guía la atención del usuario

## 🚀 **Beneficios de Estos Prompts**

### **Precisión:**
- **Análisis extremadamente detallados** - No genéricos
- **Contexto de marca específico** - Considera colores, slogan, descripción
- **Evaluación práctica** - Usos reales para campañas

### **Consistencia:**
- **Mismo formato siempre** - JSON estructurado
- **Criterios uniformes** - Mismos parámetros de evaluación
- **Versionado** - Se pueden mejorar manteniendo compatibilidad

### **Reutilización:**
- **Una vez generado, siempre disponible** - No re-analizar
- **Múltiples campañas** - Mismo análisis reutilizado
- **Escalabilidad** - Funciona con cientos de recursos

**Estos prompts son la base de la inteligencia del sistema, generando análisis que luego permiten al planificador de campañas tomar decisiones extremadamente informadas sobre qué recursos y plantillas usar en cada publicación.**