const Database = require('better-sqlite3');
const path = require('path');

// Migration 009: Add AI content generation fields
const migration009AddAIContentGeneration = {
  version: 9,
  description: 'Add AI content generation fields to campaigns and publications, create generation_progress table',

  up: (db) => {
    console.log('🚀 Ejecutando migración 009 - AI Content Generation...');
    
    // Extend campaigns table with generation fields
    console.log('📝 Extendiendo tabla campaigns...');
    db.exec(`
      ALTER TABLE campaigns ADD COLUMN generation_status TEXT DEFAULT 'planning';
    `);
    
    db.exec(`
      ALTER TABLE campaigns ADD COLUMN generation_progress TEXT;
    `);

    // Extend publications table with generated content fields
    console.log('📝 Extendiendo tabla publications...');
    db.exec(`
      ALTER TABLE publications ADD COLUMN generated_text TEXT;
    `);
    
    db.exec(`
      ALTER TABLE publications ADD COLUMN generated_image_urls TEXT;
    `);
    
    db.exec(`
      ALTER TABLE publications ADD COLUMN generation_metadata TEXT;
    `);
    
    db.exec(`
      ALTER TABLE publications ADD COLUMN generation_status TEXT DEFAULT 'pending';
    `);

    // Create generation_progress table for detailed tracking
    console.log('📝 Creando tabla generation_progress...');
    db.exec(`
      CREATE TABLE generation_progress (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        campaign_id TEXT NOT NULL,
        total_publications INTEGER NOT NULL,
        completed_publications INTEGER DEFAULT 0,
        current_publication_id TEXT,
        current_agent TEXT,
        current_step TEXT,
        errors TEXT,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        estimated_time_remaining INTEGER,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for optimal query performance
    console.log('📝 Creando índices...');
    db.exec(`
      CREATE INDEX idx_generation_progress_campaign_id ON generation_progress(campaign_id);
      CREATE INDEX idx_generation_progress_status ON generation_progress(current_agent, current_step);
      CREATE INDEX idx_campaigns_generation_status ON campaigns(generation_status);
      CREATE INDEX idx_publications_generation_status ON publications(generation_status);
    `);

    console.log('✅ Migración 009 completada exitosamente');
  },

  down: (db) => {
    console.log('🔄 Revirtiendo migración 009...');
    
    // Drop indexes
    db.exec(`DROP INDEX IF EXISTS idx_generation_progress_campaign_id;`);
    db.exec(`DROP INDEX IF EXISTS idx_generation_progress_status;`);
    db.exec(`DROP INDEX IF EXISTS idx_campaigns_generation_status;`);
    db.exec(`DROP INDEX IF EXISTS idx_publications_generation_status;`);
    
    // Drop generation_progress table
    db.exec(`DROP TABLE IF EXISTS generation_progress;`);
    
    // Note: SQLite doesn't support DROP COLUMN, so we can't easily revert the ALTER TABLE changes
    console.log('⚠️  Nota: Los campos agregados a campaigns y publications no se pueden eliminar automáticamente en SQLite');
    console.log('✅ Migración 009 revertida (parcialmente)');
  }
};

// Execute migration if run directly
if (require.main === module) {
  try {
    const dbPath = path.join(__dirname, 'database.sqlite');
    console.log('📍 Conectando a:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check if migrations table exists
    const migrationsTableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'
    `).get();
    
    if (!migrationsTableExists) {
      console.log('📝 Creando tabla migrations...');
      db.exec(`
        CREATE TABLE migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER NOT NULL UNIQUE,
          description TEXT NOT NULL,
          executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    
    // Check current version
    const currentVersionResult = db.prepare("SELECT MAX(version) as version FROM migrations").get();
    const currentVersion = currentVersionResult?.version || 0;
    
    console.log(`📊 Versión actual de BD: ${currentVersion}`);
    
    if (currentVersion >= 9) {
      console.log('✅ Migración 009 ya está aplicada');
    } else {
      console.log('🚀 Aplicando migración 009...');
      
      // Execute migration in transaction
      const transaction = db.transaction(() => {
        migration009AddAIContentGeneration.up(db);
        
        // Register migration
        db.prepare("INSERT INTO migrations (version, description) VALUES (?, ?)")
          .run(9, migration009AddAIContentGeneration.description);
      });
      
      transaction();
      
      console.log('✅ Migración 009 aplicada exitosamente');
    }
    
    // Verify tables were created/modified
    console.log('\n🔍 Verificando cambios...');
    
    // Check campaigns table has new fields
    const campaignsSchema = db.prepare("PRAGMA table_info(campaigns)").all();
    const hasGenerationStatus = campaignsSchema.some(col => col.name === 'generation_status');
    const hasGenerationProgress = campaignsSchema.some(col => col.name === 'generation_progress');
    
    console.log(`   campaigns.generation_status: ${hasGenerationStatus ? '✅' : '❌'}`);
    console.log(`   campaigns.generation_progress: ${hasGenerationProgress ? '✅' : '❌'}`);
    
    // Check publications table has new fields
    const publicationsSchema = db.prepare("PRAGMA table_info(publications)").all();
    const hasGeneratedText = publicationsSchema.some(col => col.name === 'generated_text');
    const hasGeneratedImageUrls = publicationsSchema.some(col => col.name === 'generated_image_urls');
    const hasGenerationMetadata = publicationsSchema.some(col => col.name === 'generation_metadata');
    const hasPublicationGenerationStatus = publicationsSchema.some(col => col.name === 'generation_status');
    
    console.log(`   publications.generated_text: ${hasGeneratedText ? '✅' : '❌'}`);
    console.log(`   publications.generated_image_urls: ${hasGeneratedImageUrls ? '✅' : '❌'}`);
    console.log(`   publications.generation_metadata: ${hasGenerationMetadata ? '✅' : '❌'}`);
    console.log(`   publications.generation_status: ${hasPublicationGenerationStatus ? '✅' : '❌'}`);
    
    // Check generation_progress table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='generation_progress'").all();
    console.log(`   generation_progress table: ${tables.length > 0 ? '✅' : '❌'}`);
    
    db.close();
    console.log('\n🎉 Proceso completado');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

module.exports = migration009AddAIContentGeneration;