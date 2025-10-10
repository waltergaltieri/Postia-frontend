const Database = require('better-sqlite3');
const path = require('path');

// Check the database that the repository is actually using
const repoDbPath = path.join(process.cwd(), 'data', 'postia.db');
const rootDbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('Repository database path:', repoDbPath);
console.log('Root database path:', rootDbPath);

console.log('\n=== Checking Repository Database ===');
try {
  const repoDb = new Database(repoDbPath);
  
  // Check tables
  const repoTables = repoDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  console.log('Repository DB tables:');
  repoTables.forEach(table => {
    console.log(`- ${table.name}`);
  });
  
  // Check agencies
  try {
    const agencies = repoDb.prepare('SELECT * FROM agencies').all();
    console.log(`\nAgencies in repo DB: ${agencies.length}`);
    agencies.forEach(agency => {
      console.log(`  - ${agency.id}: ${agency.name}`);
    });
  } catch (error) {
    console.log('❌ No agencies table or error:', error.message);
  }
  
  repoDb.close();
} catch (error) {
  console.error('❌ Error with repository database:', error.message);
}

console.log('\n=== Checking Root Database ===');
try {
  const rootDb = new Database(rootDbPath);
  
  // Check tables
  const rootTables = rootDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  console.log('Root DB tables:');
  rootTables.forEach(table => {
    console.log(`- ${table.name}`);
  });
  
  // Check agencies
  try {
    const agencies = rootDb.prepare('SELECT * FROM agencies').all();
    console.log(`\nAgencies in root DB: ${agencies.length}`);
    agencies.forEach(agency => {
      console.log(`  - ${agency.id}: ${agency.name}`);
    });
  } catch (error) {
    console.log('❌ No agencies table or error:', error.message);
  }
  
  rootDb.close();
} catch (error) {
  console.error('❌ Error with root database:', error.message);
}