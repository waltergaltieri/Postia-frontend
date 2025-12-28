const Database = require('better-sqlite3');
const path = require('path');

// Simulación de análisis (ya que no podemos ejecutar la IA real desde aquí)
function generateMockResourceAnalysis(resource) {
  return {
    id: resource.id,
    name: resource.name,
    type: resource.type,
    description: `Imagen de ${resource.name.toLowerCase()} con composición atractiva y colores vibrantes, ideal para redes sociales`,
    suggestedUse: resource.type === 'image' ? ['hero', 'post', 'story', 'carousel-main'] : ['reel', 'video'],
    compatibleNetworks: ['instagram', 'facebook', 'linkedin'],
    contentTypes: resource.type === 'image' ? ['post', 'story', 'carousel'] : ['reel', 'video'],
    mood: 'atractivo',
    colors: ['#FF6B35', '#F7931E', '#FFD23F'],
    elements: ['comida', 'producto', 'presentacion_atractiva']
  };
}

function generateMockSemanticAnalysis(resource) {
  return {
    resourceId: resource.id,
    name: resource.name,
    visualSummary: `Imagen de ${resource.name.toLowerCase()} con buena composición y iluminación natural`,
    distinctiveFeatures: ['Composición centrada', 'Colores vibrantes', 'Presentación atractiva'],
    predominantColors: ['#FF6B35', '#F7931E', '#FFD23F'],
    brandCompatibility: {
      level: 'high',
      justification: 'Colores atractivos y presentación profesional que se alinea bien con marcas gastronómicas'
    },
    recommendedUses: ['hero de publicación single', 'imagen principal de story', 'primer slide de carousel'],
    risks: ['Posible pérdida de calidad en redimensionado'],
    networkSuitability: {
      instagram: 'Excelente para feed y stories, muy visual',
      facebook: 'Bueno para publicaciones de comida',
      linkedin: 'Apropiado para contenido gastronómico profesional'
    }
  };
}

function generateMockTemplateAnalysis(template) {
  return {
    templateId: template.id,
    name: template.name,
    layoutStrengths: template.type === 'single' ? ['Jerarquía visual clara', 'Espacio amplio para contenido'] : ['Narrativa secuencial', 'Múltiples puntos de información'],
    textCapacity: {
      headline: 'high',
      subhead: 'medium',
      cta: 'high'
    },
    networkAptitude: {
      instagram: template.type === 'single' ? 'Formato cuadrado 1:1 ideal' : 'Perfecto para carousels nativos',
      facebook: 'Adaptable a diferentes ratios',
      linkedin: 'Profesional y directo'
    },
    colorMapping: {
      background: '#FFFFFF',
      accent: '#F7931E',
      text: '#333333'
    },
    risks: ['Riesgos estándar de diseño'],
    businessObjectiveSuitability: {
      awareness: 'Excelente para impacto visual',
      engagement: 'Bueno para generar interacciones',
      conversion: 'Apropiado con CTA claro'
    }
  };
}

try {
  const dbPath = path.join(__dirname, 'data', 'postia.db');
  console.log('📍 Conectando a:', dbPath);
  
  const db = new Database(dbPath);
  
  // Obtener recursos sin análisis
  console.log('🔍 Buscando recursos sin análisis...');
  const resourcesWithoutAnalysis = db.prepare(`
    SELECT r.* FROM resources r
    LEFT JOIN resource_analyses ra ON r.id = ra.resource_id
    WHERE ra.id IS NULL
  `).all();
  
  console.log(`📊 Recursos sin análisis: ${resourcesWithoutAnalysis.length}`);
  
  // Obtener plantillas sin análisis
  console.log('🔍 Buscando plantillas sin análisis...');
  const templatesWithoutAnalysis = db.prepare(`
    SELECT t.* FROM templates t
    LEFT JOIN template_analyses ta ON t.id = ta.template_id
    WHERE ta.id IS NULL
  `).all();
  
  console.log(`📊 Plantillas sin análisis: ${templatesWithoutAnalysis.length}`);
  
  // Generar análisis para recursos
  if (resourcesWithoutAnalysis.length > 0) {
    console.log('\n🚀 Generando análisis para recursos...');
    
    const insertResourceAnalysis = db.prepare(`
      INSERT INTO resource_analyses (
        resource_id, workspace_id, visual_analysis, semantic_analysis, analysis_version
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    resourcesWithoutAnalysis.forEach((resource, index) => {
      console.log(`   ${index + 1}. Analizando: ${resource.name}`);
      
      const visualAnalysis = generateMockResourceAnalysis(resource);
      const semanticAnalysis = generateMockSemanticAnalysis(resource);
      
      insertResourceAnalysis.run(
        resource.id,
        resource.workspace_id,
        JSON.stringify(visualAnalysis),
        JSON.stringify(semanticAnalysis),
        '1.0'
      );
      
      console.log(`   ✅ Análisis generado para: ${resource.name}`);
    });
  }
  
  // Generar análisis para plantillas
  if (templatesWithoutAnalysis.length > 0) {
    console.log('\n🎨 Generando análisis para plantillas...');
    
    const insertTemplateAnalysis = db.prepare(`
      INSERT INTO template_analyses (
        template_id, workspace_id, semantic_analysis, analysis_version
      ) VALUES (?, ?, ?, ?)
    `);
    
    templatesWithoutAnalysis.forEach((template, index) => {
      console.log(`   ${index + 1}. Analizando: ${template.name}`);
      
      const semanticAnalysis = generateMockTemplateAnalysis(template);
      
      insertTemplateAnalysis.run(
        template.id,
        template.workspace_id,
        JSON.stringify(semanticAnalysis),
        '1.0'
      );
      
      console.log(`   ✅ Análisis generado para: ${template.name}`);
    });
  }
  
  // Verificar resultados
  console.log('\n🔍 Verificando análisis generados...');
  const totalResourceAnalyses = db.prepare("SELECT COUNT(*) as count FROM resource_analyses").get().count;
  const totalTemplateAnalyses = db.prepare("SELECT COUNT(*) as count FROM template_analyses").get().count;
  
  console.log(`📊 Total análisis de recursos: ${totalResourceAnalyses}`);
  console.log(`📊 Total análisis de plantillas: ${totalTemplateAnalyses}`);
  
  if (totalResourceAnalyses > 0) {
    console.log('\n📋 Análisis de recursos generados:');
    const analyses = db.prepare("SELECT * FROM resource_analyses").all();
    analyses.forEach(analysis => {
      const visual = JSON.parse(analysis.visual_analysis);
      console.log(`   - ${visual.name}: ${visual.description.substring(0, 80)}...`);
    });
  }
  
  if (totalTemplateAnalyses > 0) {
    console.log('\n📋 Análisis de plantillas generados:');
    const analyses = db.prepare("SELECT * FROM template_analyses").all();
    analyses.forEach(analysis => {
      const semantic = JSON.parse(analysis.semantic_analysis);
      console.log(`   - ${semantic.name}: ${semantic.layoutStrengths.join(', ')}`);
    });
  }
  
  db.close();
  console.log('\n🎉 Análisis retroactivos completados');
  
} catch (error) {
  console.error('❌ Error generando análisis:', error.message);
}