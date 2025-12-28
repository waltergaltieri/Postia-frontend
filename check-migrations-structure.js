const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'data', 'postia.db');
  const db = new Database(dbPath);
  
  console.log('🔍 Verificando estructura de tabla migrations...');
  
  // Obtener estructura de la tabla migrations
  const tableInfo = db.prepare("PRAGMA table_info(migrations)").all();
  console.log('📊 Estructura de tabla migrations:');
  tableInfo.forEach(column => {
    console.log(`   - ${column.name} (${column.type})`);
  });
  
  // Obtener todas las migraciones
  const migrations = db.prepare("SELECT * FROM migrations").all();
  console.log(`\n📊 Total migraciones: ${migrations.length}`);
  
  if (migrations.length > 0) {
    console.log('\n📋 Migraciones encontradas:');
    migrations.forEach((migration, index) => {
      console.log(`${index + 1}. Migración:`, migration);
    });
  }
  
  // Verificar archivos de migración disponibles
  console.log('\n📁 Verificando archivos de migración...');
  const fs = require('fs');
  const migrationsDir = path.join(__dirname, 'src', 'lib', 'database', 'migrations');
  
  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir);
    console.log('📋 Archivos de migración disponibles:');
    migrationFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
    
    // Verificar específicamente la migración 008
    const migration008 = migrationFiles.find(f => f.includes('008'));
    if (migration008) {
      console.log(`\n✅ Archivo de migración 008 encontrado: ${migration008}`);
    } else {
      console.log('\n❌ Archivo de migración 008 NO encontrado');
    }
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Error:', error.message);
}