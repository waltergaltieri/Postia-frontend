const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'data', 'postia.db');
  const db = new Database(dbPath);
  
  console.log('🔍 Verificando migraciones ejecutadas...');
  
  // Verificar tabla de migraciones
  const migrations = db.prepare("SELECT * FROM migrations ORDER BY id").all();
  console.log(`📊 Total migraciones ejecutadas: ${migrations.length}`);
  
  console.log('\n📋 Migraciones ejecutadas:');
  migrations.forEach(migration => {
    console.log(`   ${migration.id}. ${migration.name} - ${migration.executed_at}`);
  });
  
  // Verificar si existe la migración 008
  const migration008 = migrations.find(m => m.name.includes('008') || m.name.includes('analysis'));
  
  if (migration008) {
    console.log('\n✅ Migración de análisis encontrada:', migration008.name);
  } else {
    console.log('\n❌ Migración de análisis (008) NO encontrada');
    console.log('📁 Verificando archivos de migración disponibles...');
    
    const fs = require('fs');
    const migrationsDir = path.join(__dirname, 'src', 'lib', 'database', 'migrations');
    
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir);
      console.log('📋 Archivos de migración disponibles:');
      migrationFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    } else {
      console.log('❌ Directorio de migraciones no encontrado');
    }
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Error:', error.message);
}