const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
console.log('Checking agencies in database at:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check agencies
  const agencies = db.prepare('SELECT * FROM agencies').all();
  console.log('\nAgencies in database:');
  if (agencies.length === 0) {
    console.log('❌ No agencies found!');
  } else {
    agencies.forEach(agency => {
      console.log(`- ID: ${agency.id}, Name: ${agency.name}, Email: ${agency.email}`);
    });
  }
  
  // Check if the specific agency exists
  const demoAgency = db.prepare('SELECT * FROM agencies WHERE id = ?').get('agency-demo-001');
  if (demoAgency) {
    console.log('\n✅ Demo agency exists:', demoAgency);
  } else {
    console.log('\n❌ Demo agency (agency-demo-001) not found!');
    
    // Create the demo agency
    console.log('Creating demo agency...');
    db.prepare(`
      INSERT INTO agencies (id, name, email, plan)
      VALUES ('agency-demo-001', 'Demo Agency', 'demo@postia.com', 'pro')
    `).run();
    console.log('✅ Demo agency created');
  }
  
  db.close();
} catch (error) {
  console.error('Error checking agencies:', error);
}