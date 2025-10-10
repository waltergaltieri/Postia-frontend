#!/usr/bin/env node

/**
 * Script para limpiar todos los datos simulados del calendario
 * Elimina todas las publicaciones existentes para empezar con datos reales
 */

const Database = require('better-sqlite3');
const path = require('path');

// Ruta a la base de datos
const dbPath = path.join(__dirname, 'src', 'lib', 'database', 'postia.db');

try {
  console.log('🧹 Iniciando limpieza de datos simulados del calendario...');
  
  // Conectar a la base de datos
  const db = new Database(dbPath);
  
  // Eliminar todas las publicaciones
  const deletePublications = db.prepare('DELETE FROM publications');
  const result = deletePublications.run();
  
  console.log(`✅ Eliminadas ${result.changes} publicaciones simuladas`);
  
  // Verificar que no queden publicaciones
  const countPublications = db.prepare('SELECT COUNT(*) as count FROM publications');
  const count = countPublications.get();
  
  console.log(`📊 Publicaciones restantes: ${count.count}`);
  
  if (count.count === 0) {
    console.log('🎉 ¡Calendario limpio! Listo para usar datos reales.');
  } else {
    console.log('⚠️  Aún quedan algunas publicaciones en la base de datos.');
  }
  
  // Cerrar conexión
  db.close();
  
} catch (error) {
  console.error('❌ Error al limpiar datos del calendario:', error.message);
  process.exit(1);
}