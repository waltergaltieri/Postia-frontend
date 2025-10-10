const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
console.log('Checking database at:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check if tables exist
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  console.log('\nExisting tables:');
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });
  
  // Check specifically for workspaces table
  const workspacesTable = db.prepare(`
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='workspaces'
  `).get();
  
  if (workspacesTable) {
    console.log('\nWorkspaces table schema:');
    console.log(workspacesTable.sql);
    
    // Check if there are any workspaces
    const workspaceCount = db.prepare('SELECT COUNT(*) as count FROM workspaces').get();
    console.log(`\nWorkspaces count: ${workspaceCount.count}`);
  } else {
    console.log('\n❌ Workspaces table does not exist!');
  }
  
  // Check agencies table
  const agenciesTable = db.prepare(`
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='agencies'
  `).get();
  
  if (agenciesTable) {
    console.log('\nAgencies table exists');
    const agencyCount = db.prepare('SELECT COUNT(*) as count FROM agencies').get();
    console.log(`Agencies count: ${agencyCount.count}`);
  } else {
    console.log('\n❌ Agencies table does not exist!');
  }
  
  db.close();
} catch (error) {
  console.error('Error checking database:', error);
}