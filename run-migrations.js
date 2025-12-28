const Database = require('better-sqlite3');
const path = require('path');

// Importar las migraciones (simulando el import de TypeScript)
const migration008CreateAnalysisTables = {
  version: 8,
  description: 'Create analysis tables for storing AI-generated resource and template analyses',

  up: (db) => {
    console.log('🚀 Ejecutando migración 008...');
    
    // Create resource_analyses table
    db.exec(`
      CREATE TABLE resource_analyses (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        resource_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        campaign_id TEXT,
        visual_analysis TEXT NOT NULL,
        semantic_analysis TEXT,
        analysis_version TEXT NOT NULL DEFAULT '1.0',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
      );
    `);

    // Create template_analyses table
    db.exec(`
      CREATE TABLE template_analyses (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        template_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        campaign_id TEXT,
        semantic_analysis TEXT NOT NULL,
        analysis_version TEXT NOT NULL DEFAULT '1.0',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
      );
    `);

    // Create indexes for optimal query performance
    db.exec(`
      CREATE INDEX idx_resource_analyses_resource_id ON resource_analyses(resource_id);
      CREATE INDEX idx_resource_analyses_workspace_id ON resource_analyses(workspace_id);
      CREATE INDEX idx_resource_analyses_campaign_id ON resource_analyses(campaign_id);
      CREATE INDEX idx_resource_analyses_version ON resource_analyses(analysis_version);
      CREATE INDEX idx_resource_analyses_resource_workspace ON resource_analyses(resource_id, workspace_id);
    `);

    db.exec(`
      CREATE INDEX idx_template_analyses_template_id ON template_analyses(template_id);
      CREATE INDEX idx_template_analyses_workspace_id ON template_analyses(workspace_id);
      CREATE INDEX idx_template_analyses_campaign_id ON template_analyses(campaign_id);
      CREATE INDEX idx_template_analyses_version ON template_analyses(analysis_version);
      CREATE INDEX idx_template_analyses_template_workspace ON template_analyses(template_id, workspace_id);
    `);

    console.log('✅ Tablas de análisis creadas exitosamente');
  }
};

try {
  const dbPath = path.join(__dirname, 'data', 'postia.db');
  console.log('📍 Conectando a:', dbPath);
  
  const db = new Database(dbPath);
  
  // Verificar versión actual
  const currentVersionResult = db.prepare("SELECT MAX(version) as version FROM migrations").get();
  const currentVersion = currentVersionResult.version || 0;
  
  console.log(`📊 Versión actual de BD: ${currentVersion}`);
  
  if (currentVersion >= 8) {
    console.log('✅ Migración 008 ya está aplicada');
  } else {
    console.log('🚀 Aplicando migración 008...');
    
    // Ejecutar la migración en una transacción
    const transaction = db.transaction(() => {
      // Ejecutar la migración
      migration008CreateAnalysisTables.up(db);
      
      // Registrar la migración
      db.prepare("INSERT INTO migrations (version, description) VALUES (?, ?)")
        .run(8, migration008CreateAnalysisTables.description);
    });
    
    transaction();
    
    console.log('✅ Migración 008 aplicada exitosamente');
  }
  
  // Verificar que las tablas se crearon
  console.log('\n🔍 Verificando tablas creadas...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%analyses'").all();
  
  if (tables.length > 0) {
    console.log('✅ Tablas de análisis encontradas:');
    tables.forEach(table => {
      console.log(`   - ${table.name}`);
    });
  } else {
    console.log('❌ No se encontraron tablas de análisis');
  }
  
  db.close();
  console.log('\n🎉 Proceso completado');
  
} catch (error) {
  console.error('❌ Error ejecutando migración:', error.message);
  console.error('Stack:', error.stack);
}