const Database = require('better-sqlite3');
const path = require('path');

// Migration 010: Add regeneration history table
const migration010AddRegenerationHistory = {
  version: 10,
  description: 'Add regeneration_history table for tracking publication regenerations',

  up: (db) => {
    console.log('🚀 Ejecutando migración 010 - Regeneration History...');
    
    // Create regeneration_history table
    console.log('📝 Creando tabla regeneration_history...');
    db.exec(`
      CREATE TABLE regeneration_history (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        publication_id TEXT NOT NULL,
        previous_content TEXT NOT NULL,
        previous_image_urls TEXT,
        previous_metadata TEXT,
        new_content TEXT NOT NULL,
        new_image_urls TEXT,
        new_metadata TEXT NOT NULL,
        custom_prompt TEXT,
        reason TEXT NOT NULL DEFAULT 'user_request',
        regenerated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for optimal query performance
    console.log('📝 Creando índices...');
    db.exec(`
      CREATE INDEX idx_regeneration_history_publication_id ON regeneration_history(publication_id);
      CREATE INDEX idx_regeneration_history_regenerated_at ON regeneration_history(regenerated_at);
      CREATE INDEX idx_regeneration_history_reason ON regeneration_history(reason);
    `);

    console.log('✅ Migración 010 completada exitosamente');
  },

  down: (db) => {
    console.log('🔄 Revirtiendo migración 010...');
    
    // Drop indexes
    db.exec(`DROP INDEX IF EXISTS idx_regeneration_history_publication_id;`);
    db.exec(`DROP INDEX IF EXISTS idx_regeneration_history_regenerated_at;`);
    db.exec(`DROP INDEX IF EXISTS idx_regeneration_history_reason;`);
    
    // Drop regeneration_history table
    db.exec(`DROP TABLE IF EXISTS regeneration_history;`);
    
    console.log('✅ Migración 010 revertida exitosamente');
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
    
    if (currentVersion >= 10) {
      console.log('✅ Migración 010 ya está aplicada');
    } else {
      console.log('🚀 Aplicando migración 010...');
      
      // Execute migration in transaction
      const transaction = db.transaction(() => {
        migration010AddRegenerationHistory.up(db);
        
        // Register migration
        db.prepare("INSERT INTO migrations (version, description) VALUES (?, ?)")
          .run(10, migration010AddRegenerationHistory.description);
      });
      
      transaction();
      
      console.log('✅ Migración 010 aplicada exitosamente');
    }
    
    // Verify table was created
    console.log('\n🔍 Verificando cambios...');
    
    // Check regeneration_history table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='regeneration_history'").all();
    console.log(`   regeneration_history table: ${tables.length > 0 ? '✅' : '❌'}`);
    
    if (tables.length > 0) {
      const schema = db.prepare("PRAGMA table_info(regeneration_history)").all();
      console.log(`   Campos en regeneration_history: ${schema.length}`);
      schema.forEach(col => {
        console.log(`     - ${col.name} (${col.type})`);
      });
    }
    
    db.close();
    console.log('\n🎉 Proceso completado');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

module.exports = migration010AddRegenerationHistory;