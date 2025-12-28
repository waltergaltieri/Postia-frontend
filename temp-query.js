const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'postia.db');
const db = new Database(dbPath);

console.log('=== RECURSOS RECIENTES ===');
const resources = db.prepare('SELECT * FROM resources ORDER BY created_at DESC LIMIT 5').all();
resources.forEach(resource => {
  console.log(`ID: ${resource.id}`);
  console.log(`Nombre: ${resource.name}`);
  console.log(`Tipo: ${resource.type}`);
  console.log(`Creado: ${resource.created_at}`);
  console.log('---');
});

console.log('\n=== TEMPLATES RECIENTES ===');
const templates = db.prepare('SELECT * FROM templates ORDER BY created_at DESC LIMIT 5').all();
templates.forEach(template => {
  console.log(`ID: ${template.id}`);
  console.log(`Nombre: ${template.name}`);
  console.log(`Tipo: ${template.type}`);
  console.log(`Creado: ${template.created_at}`);
  console.log('---');
});

console.log('\n=== ANÁLISIS DE RECURSOS ===');
try {
  const resourceAnalyses = db.prepare('SELECT * FROM resource_analyses ORDER BY created_at DESC LIMIT 10').all();
  if (resourceAnalyses.length > 0) {
    resourceAnalyses.forEach(analysis => {
      console.log(`ID Análisis: ${analysis.id}`);
      console.log(`ID Recurso: ${analysis.resource_id}`);
      console.log(`Workspace: ${analysis.workspace_id}`);
      console.log(`Versión: ${analysis.analysis_version}`);
      console.log(`Creado: ${analysis.created_at}`);
      
      if (analysis.visual_analysis) {
        try {
          const visual = JSON.parse(analysis.visual_analysis);
          console.log(`Descripción Visual: ${visual.description || 'N/A'}`);
          console.log(`Usos Sugeridos: ${visual.suggestedUse ? visual.suggestedUse.join(', ') : 'N/A'}`);
          console.log(`Mood: ${visual.mood || 'N/A'}`);
        } catch (e) {
          console.log('Error parsing visual analysis');
        }
      }
      console.log('---');
    });
  } else {
    console.log('No se encontraron análisis de recursos');
  }
} catch (error) {
  console.log('Tabla resource_analyses no existe:', error.message);
}

console.log('\n=== ANÁLISIS DE TEMPLATES ===');
try {
  const templateAnalyses = db.prepare('SELECT * FROM template_analyses ORDER BY created_at DESC LIMIT 10').all();
  if (templateAnalyses.length > 0) {
    templateAnalyses.forEach(analysis => {
      console.log(`ID Análisis: ${analysis.id}`);
      console.log(`ID Template: ${analysis.template_id}`);
      console.log(`Workspace: ${analysis.workspace_id}`);
      console.log(`Versión: ${analysis.analysis_version}`);
      console.log(`Creado: ${analysis.created_at}`);
      
      if (analysis.semantic_analysis) {
        try {
          const semantic = JSON.parse(analysis.semantic_analysis);
          console.log(`Fortalezas Layout: ${semantic.layoutStrengths ? semantic.layoutStrengths.join(', ') : 'N/A'}`);
          console.log(`Aptitud Redes: ${semantic.networkAptitude ? JSON.stringify(semantic.networkAptitude) : 'N/A'}`);
        } catch (e) {
          console.log('Error parsing semantic analysis');
        }
      }
      console.log('---');
    });
  } else {
    console.log('No se encontraron análisis de templates');
  }
} catch (error) {
  console.log('Tabla template_analyses no existe:', error.message);
}

db.close();