// Test completo del flujo de análisis en el planificador de campañas

const Database = require('better-sqlite3');
const path = require('path');

async function testCampaignPlannerFlow() {
  console.log('🧪 Probando flujo completo del planificador de campañas...');
  
  try {
    const dbPath = path.join(__dirname, 'data', 'postia.db');
    const db = new Database(dbPath);
    
    // 1. Obtener datos reales de la BD
    console.log('\n1. 📊 Obteniendo datos de la base de datos...');
    
    const resources = db.prepare("SELECT * FROM resources").all();
    const templates = db.prepare("SELECT * FROM templates").all();
    const workspaces = db.prepare("SELECT * FROM workspaces").all();
    
    console.log(`   📸 Recursos: ${resources.length}`);
    console.log(`   🎨 Plantillas: ${templates.length}`);
    console.log(`   🏢 Workspaces: ${workspaces.length}`);
    
    if (resources.length === 0 || templates.length === 0 || workspaces.length === 0) {
      console.log('❌ No hay datos suficientes para probar');
      return;
    }
    
    const resource = resources[0];
    const template = templates[0];
    const workspace = workspaces[0];
    
    console.log(`   📸 Recurso de prueba: ${resource.name} (${resource.id})`);
    console.log(`   🎨 Plantilla de prueba: ${template.name} (${template.id})`);
    console.log(`   🏢 Workspace de prueba: ${workspace.name} (${workspace.id})`);
    
    // 2. Verificar análisis existentes
    console.log('\n2. 🔍 Verificando análisis existentes...');
    
    const resourceAnalysis = db.prepare("SELECT * FROM resource_analyses WHERE resource_id = ?").get(resource.id);
    const templateAnalysis = db.prepare("SELECT * FROM template_analyses WHERE template_id = ?").get(template.id);
    
    console.log(`   📸 Análisis de recurso: ${resourceAnalysis ? '✅ Existe' : '❌ No existe'}`);
    console.log(`   🎨 Análisis de plantilla: ${templateAnalysis ? '✅ Existe' : '❌ No existe'}`);
    
    if (resourceAnalysis) {
      const visual = JSON.parse(resourceAnalysis.visual_analysis);
      console.log(`   🤖 Descripción del recurso: ${visual.description?.substring(0, 100)}...`);
      console.log(`   🎯 Usos sugeridos: ${visual.suggestedUse?.join(', ')}`);
    }
    
    if (templateAnalysis) {
      const semantic = JSON.parse(templateAnalysis.semantic_analysis);
      console.log(`   🎨 Fortalezas de plantilla: ${semantic.layoutStrengths?.join(', ')}`);
    }
    
    // 3. Simular llamada a ClientResourceAnalysisService
    console.log('\n3. 🔄 Simulando flujo del ClientResourceAnalysisService...');
    
    // Simular lo que haría getCachedResourceAnalyses
    const resourceIds = [resource.id];
    const templateIds = [template.id];
    
    console.log(`   🔍 Buscando análisis para recursos: ${resourceIds}`);
    console.log(`   🔍 Buscando análisis para plantillas: ${templateIds}`);
    
    // Simular respuesta de API
    const mockResourceAnalyses = {};
    const mockTemplateAnalyses = {};
    
    if (resourceAnalysis) {
      mockResourceAnalyses[resource.id] = {
        id: resourceAnalysis.id,
        resourceId: resource.id,
        workspaceId: resource.workspace_id,
        visualAnalysis: JSON.parse(resourceAnalysis.visual_analysis),
        semanticAnalysis: resourceAnalysis.semantic_analysis ? JSON.parse(resourceAnalysis.semantic_analysis) : null,
        analysisVersion: resourceAnalysis.analysis_version,
        createdAt: new Date(resourceAnalysis.created_at),
        updatedAt: new Date(resourceAnalysis.updated_at)
      };
    }
    
    if (templateAnalysis) {
      mockTemplateAnalyses[template.id] = {
        id: templateAnalysis.id,
        templateId: template.id,
        workspaceId: template.workspace_id,
        semanticAnalysis: JSON.parse(templateAnalysis.semantic_analysis),
        analysisVersion: templateAnalysis.analysis_version,
        createdAt: new Date(templateAnalysis.created_at),
        updatedAt: new Date(templateAnalysis.updated_at)
      };
    }
    
    console.log(`   📊 Análisis de recursos encontrados: ${Object.keys(mockResourceAnalyses).length}`);
    console.log(`   📊 Análisis de plantillas encontrados: ${Object.keys(mockTemplateAnalyses).length}`);
    
    // 4. Simular creación de resourcesWithAnalysis
    console.log('\n4. 🎯 Simulando creación de resourcesWithAnalysis...');
    
    const resourcesWithAnalysis = [resource].map(res => {
      const cachedAnalysis = mockResourceAnalyses[res.id];
      const analysis = cachedAnalysis?.visualAnalysis;
      
      return {
        ...res,
        aiAnalysis: analysis ? {
          description: analysis.description,
          suggestedUse: analysis.suggestedUse,
          compatibleNetworks: analysis.compatibleNetworks,
          mood: analysis.mood,
          colors: analysis.colors,
          elements: analysis.elements
        } : null
      };
    });
    
    console.log('   📸 Recurso con análisis:');
    console.log(`     - Nombre: ${resourcesWithAnalysis[0].name}`);
    console.log(`     - Tiene análisis: ${resourcesWithAnalysis[0].aiAnalysis ? '✅ Sí' : '❌ No'}`);
    if (resourcesWithAnalysis[0].aiAnalysis) {
      console.log(`     - Descripción: ${resourcesWithAnalysis[0].aiAnalysis.description}`);
      console.log(`     - Mood: ${resourcesWithAnalysis[0].aiAnalysis.mood}`);
      console.log(`     - Usos: ${resourcesWithAnalysis[0].aiAnalysis.suggestedUse.join(', ')}`);
    }
    
    // 5. Simular creación de templatesWithAnalysis
    console.log('\n5. 🎨 Simulando creación de templatesWithAnalysis...');
    
    const templatesWithAnalysis = [template].map(tpl => {
      const cachedAnalysis = mockTemplateAnalyses[tpl.id];
      const analysis = cachedAnalysis?.semanticAnalysis;
      
      return {
        ...tpl,
        aiAnalysis: analysis ? {
          layoutStrengths: analysis.layoutStrengths,
          textCapacity: analysis.textCapacity,
          networkAptitude: analysis.networkAptitude,
          businessObjectiveSuitability: analysis.businessObjectiveSuitability
        } : null
      };
    });
    
    console.log('   🎨 Plantilla con análisis:');
    console.log(`     - Nombre: ${templatesWithAnalysis[0].name}`);
    console.log(`     - Tiene análisis: ${templatesWithAnalysis[0].aiAnalysis ? '✅ Sí' : '❌ No'}`);
    if (templatesWithAnalysis[0].aiAnalysis) {
      console.log(`     - Fortalezas: ${templatesWithAnalysis[0].aiAnalysis.layoutStrengths.join(', ')}`);
      console.log(`     - Capacidad texto: ${JSON.stringify(templatesWithAnalysis[0].aiAnalysis.textCapacity)}`);
    }
    
    // 6. Simular construcción del prompt
    console.log('\n6. 📝 Simulando construcción del prompt...');
    
    const promptSection = `
ANÁLISIS DETALLADO DE RECURSOS DISPONIBLES (PRE-COMPUTADO POR IA):
${resourcesWithAnalysis.map((resource, index) => {
  const analysis = resource.aiAnalysis;
  return `
${index + 1}. RECURSO: "${resource.name}" (ID: ${resource.id})
   - Tipo: ${resource.type}
   - URL: ${resource.url}
   ${analysis ? `
   - 🤖 DESCRIPCIÓN IA: ${analysis.description}
   - 🎯 USOS SUGERIDOS: ${analysis.suggestedUse.join(', ')}
   - 📱 REDES COMPATIBLES: ${analysis.compatibleNetworks.join(', ')}
   - 🎨 MOOD/AMBIENTE: ${analysis.mood}
   - 🌈 COLORES: ${analysis.colors.join(', ')}
   - 🔍 ELEMENTOS: ${analysis.elements.join(', ')}` : '   - ⚠️ Sin análisis IA disponible'}
`;
}).join('\n')}

PLANTILLAS DISPONIBLES CON ANÁLISIS DETALLADO (PRE-COMPUTADO POR IA):
${templatesWithAnalysis.map((template, index) => {
  const analysis = template.aiAnalysis;
  return `
${index + 1}. PLANTILLA: "${template.name}" (ID: ${template.id})
   - Tipo: ${template.type}
   - Compatible con redes: ${template.socialNetworks.join(', ')}
   - Tipos de contenido compatibles: ${template.type === 'carousel' ? ['text-with-carousel'] : ['text-only', 'text-with-image']}
   ${analysis ? `
   - 🤖 FORTALEZAS DE DISEÑO: ${analysis.layoutStrengths.join(', ')}
   - 📝 CAPACIDAD DE TEXTO: Título ${analysis.textCapacity.headline}, Subtítulo ${analysis.textCapacity.subhead}, CTA ${analysis.textCapacity.cta}
   - 📱 APTITUD POR RED: ${Object.entries(analysis.networkAptitude).map(([net, apt]) => `${net}: ${apt}`).join(', ')}
   - 🎯 IDEAL PARA: ${Object.entries(analysis.businessObjectiveSuitability).map(([obj, suit]) => `${obj}: ${suit}`).join(', ')}` : '   - ⚠️ Sin análisis IA disponible'}
`;
}).join('\n')}`;
    
    console.log('📝 Sección del prompt generada:');
    console.log(promptSection);
    
    // 7. Verificar que el prompt contenga información rica
    const hasRichResourceInfo = promptSection.includes('🤖 DESCRIPCIÓN IA:');
    const hasRichTemplateInfo = promptSection.includes('🤖 FORTALEZAS DE DISEÑO:');
    
    console.log('\n7. ✅ Verificación del prompt:');
    console.log(`   📸 Información rica de recursos: ${hasRichResourceInfo ? '✅ Sí' : '❌ No'}`);
    console.log(`   🎨 Información rica de plantillas: ${hasRichTemplateInfo ? '✅ Sí' : '❌ No'}`);
    
    if (hasRichResourceInfo && hasRichTemplateInfo) {
      console.log('\n🎉 ¡ÉXITO! El prompt contiene análisis detallados de IA');
      console.log('   El planificador de campañas recibirá descripciones extremadamente precisas');
    } else {
      console.log('\n⚠️ PROBLEMA: El prompt no contiene análisis detallados');
      console.log('   El planificador funcionará pero sin las descripciones de IA');
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCampaignPlannerFlow();