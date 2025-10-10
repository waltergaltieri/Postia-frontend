const Database = require('better-sqlite3');
const path = require('path');

function generateTestToken() {
  console.log('=== GENERATING TEST TOKEN ===\n');
  
  try {
    const repoDbPath = path.join(process.cwd(), 'data', 'postia.db');
    const db = new Database(repoDbPath);
    
    // Get the test user
    const testUser = db.prepare('SELECT * FROM users WHERE email = ?').get('admin-dcr96g@miagencia.com');
    
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('✅ Test user found:');
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Agency: ${testUser.agency_id}`);
    
    // Generate mock token (same format as in login)
    const token = `mock_jwt_token_${testUser.id}`;
    
    console.log(`\n🔑 Generated token: ${token}`);
    
    console.log('\n📋 TESTING INSTRUCTIONS:');
    console.log('1. Open your browser developer tools (F12)');
    console.log('2. Go to Console tab');
    console.log('3. Paste and run this code:');
    console.log('');
    console.log('// Test GET endpoint');
    console.log(`fetch('/api/debug/test-auth', {`);
    console.log(`  headers: { 'Authorization': 'Bearer ${token}' }`);
    console.log(`}).then(r => r.json()).then(console.log)`);
    console.log('');
    console.log('// Test POST endpoint');
    console.log(`fetch('/api/debug/test-auth', {`);
    console.log(`  method: 'POST',`);
    console.log(`  headers: {`);
    console.log(`    'Content-Type': 'application/json',`);
    console.log(`    'Authorization': 'Bearer ${token}'`);
    console.log(`  },`);
    console.log(`  body: JSON.stringify({ name: 'Debug Test Workspace' })`);
    console.log(`}).then(r => r.json()).then(console.log)`);
    console.log('');
    console.log('4. Check the responses and server logs');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error generating token:', error);
  }
}

generateTestToken();