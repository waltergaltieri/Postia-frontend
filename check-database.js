const Database = require('better-sqlite3');
const path = require('path');

try {
  // Conectar a la base de datos
  const dbPath = path.join(__dirname, 'data', 'postia.db');
  console.log('📍 Conectando a:', dbPath);
  
  const db = new Database(dbPath);
  
  // Verificar si existen las tablas de análisis
  console.log('\n🔍 Verificando tablas existentes...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📋 Tablas encontradas:', tables.map(t => t.name));
  
  const hasResourceAnalyses = tables.some(t => t.name === 'resource_analyses');
  const hasTemplateAnalyses = tables.some(t => t.name === 'template_analyses');
  
  console.log('\n📊 Estado de tablas de análisis:');
  console.log('   resource_analyses:', hasResourceAnalyses ? '✅ Existe' : '❌ No existe');
  console.log('   template_analyses:', hasTemplateAnalyses ? '✅ Existe' : '❌ No existe');
  
  if (hasResourceAnalyses) {
    console.log('\n🔍 Revisando análisis de recursos...');
    const resourceAnalyses = db.prepare("SELECT * FROM resource_analyses").all();
    console.log(`📊 Total análisis de recursos: ${resourceAnalyses.length}`);
    
    if (resourceAnalyses.length > 0) {
      console.log('\n📋 Análisis de recursos encontrados:');
      resourceAnalyses.forEach((analysis, index) => {
        console.log(`\n${index + 1}. Análisis ID: ${analysis.id}`);
        console.log(`   Resource ID: ${analysis.resource_id}`);
        console.log(`   Workspace ID: ${analysis.workspace_id}`);
        console.log(`   Versión: ${analysis.analysis_version}`);
        console.log(`   Creado: ${analysis.created_at}`);
        
        if (analysis.visual_analysis) {
          try {
            const visualAnalysis = JSON.parse(analysis.visual_analysis);
            console.log(`   🤖 Descripción IA: ${visualAnalysis.description?.substring(0, 100)}...`);
            console.log(`   🎯 Usos sugeridos: ${visualAnalysis.suggestedUse?.join(', ')}`);
            console.log(`   🎨 Mood: ${visualAnalysis.mood}`);
          } catch (e) {
            console.log('   ⚠️ Error parseando visual_analysis');
          }
        }
        
        if (analysis.semantic_analysis) {
          try {
            const semanticAnalysis = JSON.parse(analysis.semantic_analysis);
            console.log(`   🧠 Compatibilidad marca: ${semanticAnalysis.brandCompatibility?.level}`);
          } catch (e) {
            console.log('   ⚠️ Error parseando semantic_analysis');
          }
        }
      });
    }
  }
  
  if (hasTemplateAnalyses) {
    console.log('\n🔍 Revisando análisis de plantillas...');
    const templateAnalyses = db.prepare("SELECT * FROM template_analyses").all();
    console.log(`📊 Total análisis de plantillas: ${templateAnalyses.length}`);
    
    if (templateAnalyses.length > 0) {
      console.log('\n📋 Análisis de plantillas encontrados:');
      templateAnalyses.forEach((analysis, index) => {
        console.log(`\n${index + 1}. Análisis ID: ${analysis.id}`);
        console.log(`   Template ID: ${analysis.template_id}`);
        console.log(`   Workspace ID: ${analysis.workspace_id}`);
        console.log(`   Versión: ${analysis.analysis_version}`);
        console.log(`   Creado: ${analysis.created_at}`);
        
        if (analysis.semantic_analysis) {
          try {
            const semanticAnalysis = JSON.parse(analysis.semantic_analysis);
            console.log(`   🎨 Fortalezas: ${semanticAnalysis.layoutStrengths?.join(', ')}`);
            console.log(`   📝 Capacidad texto: ${JSON.stringify(semanticAnalysis.textCapacity)}`);
          } catch (e) {
            console.log('   ⚠️ Error parseando semantic_analysis');
          }
        }
      });
    }
  }
  
  // Verificar recursos y plantillas recientes
  console.log('\n🔍 Revisando recursos recientes...');
  const recentResources = db.prepare("SELECT * FROM resources ORDER BY created_at DESC LIMIT 5").all();
  console.log(`📊 Recursos recientes: ${recentResources.length}`);
  recentResources.forEach(resource => {
    console.log(`   - ${resource.name} (${resource.type}) - ${resource.created_at}`);
  });
  
  console.log('\n🔍 Revisando plantillas recientes...');
  const recentTemplates = db.prepare("SELECT * FROM templates ORDER BY created_at DESC LIMIT 5").all();
  console.log(`📊 Plantillas recientes: ${recentTemplates.length}`);
  recentTemplates.forEach(template => {
    console.log(`   - ${template.name} (${template.type}) - ${template.created_at}`);
  });
  
  db.close();
  console.log('\n✅ Revisión completada');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}