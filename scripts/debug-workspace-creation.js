const Database = require('better-sqlite3');
const path = require('path');

// Test the repository step by step
async function debugWorkspaceCreation() {
  try {
    console.log('=== Debugging Workspace Creation ===');
    
    // Test database connection first
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    
    console.log('1. Database connected successfully');
    
    // Check agency exists
    const agency = db.prepare('SELECT * FROM agencies WHERE id = ?').get('agency-demo-001');
    console.log('2. Agency check:', agency ? '✅ Found' : '❌ Not found');
    
    if (!agency) {
      console.log('Creating demo agency...');
      db.prepare(`
        INSERT INTO agencies (id, name, email, plan)
        VALUES ('agency-demo-001', 'Demo Agency', 'demo@postia.com', 'pro')
      `).run();
      console.log('✅ Demo agency created');
    }
    
    // Test ID generation
    const idResult = db.prepare('SELECT lower(hex(randomblob(16))) as id').get();
    console.log('3. ID generation test:', idResult.id);
    
    // Test workspace creation step by step
    const testId = 'debug-workspace-' + Date.now();
    const now = new Date().toISOString();
    
    console.log('4. Attempting to create workspace with ID:', testId);
    
    // Prepare the statement
    const stmt = db.prepare(`
      INSERT INTO workspaces (
        id, agency_id, name,
        branding_primary_color, branding_secondary_color, branding_logo,
        branding_slogan, branding_description, branding_whatsapp,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    console.log('5. Statement prepared successfully');
    
    // Execute the statement
    const result = stmt.run(
      testId,
      'agency-demo-001',
      'Debug Test Workspace',
      '#9333ea',
      '#737373',
      null,
      'Debug slogan',
      'Debug description',
      '',
      now,
      now
    );
    
    console.log('6. ✅ Workspace created successfully!');
    console.log('   Result:', result);
    
    // Verify creation
    const created = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(testId);
    console.log('7. ✅ Workspace verified:', created ? 'Found' : 'Not found');
    
    db.close();
    
    // Now test with the actual repository
    console.log('\n=== Testing with Repository ===');
    
    // Import and test the repository
    const { WorkspaceRepository } = require('../src/lib/database/repositories/WorkspaceRepository.ts');
    
    console.log('8. Repository imported successfully');
    
    const workspaceRepo = new WorkspaceRepository();
    console.log('9. Repository instance created');
    
    const testData = {
      agencyId: 'agency-demo-001',
      name: 'Repository Test Workspace',
      branding: {
        primaryColor: '#9333ea',
        secondaryColor: '#737373',
        logo: '',
        slogan: 'Repository test',
        description: 'Repository test description',
        whatsapp: '',
      },
    };
    
    console.log('10. Test data prepared:', testData);
    
    const newWorkspace = workspaceRepo.create(testData);
    console.log('11. ✅ Repository creation successful!');
    console.log('    Created workspace:', newWorkspace);
    
  } catch (error) {
    console.error('❌ Error at step:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugWorkspaceCreation();