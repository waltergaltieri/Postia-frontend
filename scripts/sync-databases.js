const Database = require('better-sqlite3');
const path = require('path');

const repoDbPath = path.join(process.cwd(), 'data', 'postia.db');

console.log('Syncing databases...');
console.log('Repository database path:', repoDbPath);

try {
  const repoDb = new Database(repoDbPath);
  repoDb.pragma('foreign_keys = ON');
  
  // Check if demo agency exists
  const demoAgency = repoDb.prepare('SELECT * FROM agencies WHERE id = ?').get('agency-demo-001');
  
  if (!demoAgency) {
    console.log('Adding demo agency to repository database...');
    repoDb.prepare(`
      INSERT INTO agencies (id, name, email, plan, credits, settings_notifications, settings_timezone, settings_language)
      VALUES ('agency-demo-001', 'Demo Agency', 'demo@postia.com', 'pro', 1000, 1, 'UTC', 'es')
    `).run();
    console.log('✅ Demo agency added to repository database');
  } else {
    console.log('✅ Demo agency already exists in repository database');
  }
  
  // List all agencies
  const agencies = repoDb.prepare('SELECT * FROM agencies').all();
  console.log('\nAll agencies in repository database:');
  agencies.forEach(agency => {
    console.log(`  - ${agency.id}: ${agency.name} (${agency.email})`);
  });
  
  repoDb.close();
  console.log('\n✅ Database sync completed!');
} catch (error) {
  console.error('❌ Error syncing databases:', error);
}