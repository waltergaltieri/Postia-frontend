const Database = require('better-sqlite3');
const path = require('path');

async function debugDatabaseAuth() {
  console.log('=== DEBUGGING DATABASE AND AUTH ===\n');
  
  try {
    const repoDbPath = path.join(process.cwd(), 'data', 'postia.db');
    const db = new Database(repoDbPath);
    db.pragma('foreign_keys = ON');
    
    // 1. Check users
    console.log('1. Checking users...');
    const users = db.prepare('SELECT * FROM users').all();
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.id}) - Agency: ${user.agency_id} - Role: ${user.role}`);
    });
    
    // 2. Check agencies
    console.log('\n2. Checking agencies...');
    const agencies = db.prepare('SELECT * FROM agencies').all();
    console.log(`Found ${agencies.length} agencies:`);
    agencies.forEach(agency => {
      console.log(`  - ${agency.name} (${agency.id}) - Email: ${agency.email}`);
    });
    
    // 3. Check workspaces
    console.log('\n3. Checking workspaces...');
    const workspaces = db.prepare('SELECT * FROM workspaces').all();
    console.log(`Found ${workspaces.length} workspaces:`);
    workspaces.forEach(ws => {
      console.log(`  - ${ws.name} (${ws.id}) - Agency: ${ws.agency_id}`);
    });
    
    // 4. Test AuthService directly
    console.log('\n4. Testing AuthService...');
    
    try {
      const { AuthService } = require('../src/lib/database/services/AuthService.ts');
      
      // Test with the known user
      const testEmail = 'admin-dcr96g@miagencia.com';
      console.log(`Testing authentication for: ${testEmail}`);
      
      const authResult = AuthService.authenticate(testEmail, 'password123');
      if (authResult) {
        console.log('✅ Authentication successful:');
        console.log(`  - ID: ${authResult.id}`);
        console.log(`  - Email: ${authResult.email}`);
        console.log(`  - Agency: ${authResult.agencyId}`);
        console.log(`  - Role: ${authResult.role}`);
        
        // Test getUserById
        const userById = AuthService.getUserById(authResult.id);
        if (userById) {
          console.log('✅ getUserById successful');
        } else {
          console.log('❌ getUserById failed');
        }
      } else {
        console.log('❌ Authentication failed');
      }
    } catch (error) {
      console.log('❌ Error testing AuthService:', error.message);
      console.log('Stack:', error.stack);
    }
    
    // 5. Test WorkspaceRepository
    console.log('\n5. Testing WorkspaceRepository...');
    
    try {
      const { WorkspaceRepository } = require('../src/lib/database/repositories/WorkspaceRepository.ts');
      
      const workspaceRepo = new WorkspaceRepository();
      
      // Test with the known agency
      const testAgencyId = 'agency-1760035323771';
      console.log(`Testing workspace retrieval for agency: ${testAgencyId}`);
      
      const agencyWorkspaces = workspaceRepo.findByAgencyId(testAgencyId);
      console.log(`✅ Found ${agencyWorkspaces.length} workspaces for agency`);
      agencyWorkspaces.forEach(ws => {
        console.log(`  - ${ws.name} (${ws.id})`);
      });
      
    } catch (error) {
      console.log('❌ Error testing WorkspaceRepository:', error.message);
      console.log('Stack:', error.stack);
    }
    
    db.close();
    
    console.log('\n=== SUMMARY ===');
    console.log('Database structure looks good. If endpoints are failing,');
    console.log('the issue might be in the middleware or request handling.');
    
  } catch (error) {
    console.error('❌ Error during database debugging:', error);
  }
}

debugDatabaseAuth();