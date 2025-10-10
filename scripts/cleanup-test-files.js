const fs = require('fs');
const path = require('path');

const testFiles = [
  'check-database-tables.js',
  'test-database-direct.js',
  'check-agencies.js',
  'test-workspace-simple.js',
  'debug-workspace-creation.js',
  'check-repo-database.js',
  'test-api-endpoint.js',
  'final-verification.js'
];

console.log('Limpiando archivos de prueba...');

testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✅ Eliminado: ${file}`);
  } else {
    console.log(`⚠️  No encontrado: ${file}`);
  }
});

console.log('\n🧹 Limpieza completada!');
console.log('📝 Archivos mantenidos:');
console.log('   - initialize-database.js (para inicialización manual)');
console.log('   - sync-databases.js (para sincronización)');
console.log('   - cleanup-test-files.js (este archivo)');