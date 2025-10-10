// Test if we can import the middleware without errors

async function testMiddlewareImport() {
  console.log('=== TESTING MIDDLEWARE IMPORT ===\n');
  
  try {
    console.log('1. Testing AuthService import...');
    const { AuthService } = require('../src/lib/database/services/AuthService.ts');
    console.log('✅ AuthService imported successfully');
    
    console.log('\n2. Testing middleware import...');
    const { withAuth } = require('../src/app/api/auth/middleware.ts');
    console.log('✅ withAuth middleware imported successfully');
    
    console.log('\n3. Testing WorkspaceRepository import...');
    const { WorkspaceRepository } = require('../src/lib/database/repositories/WorkspaceRepository.ts');
    console.log('✅ WorkspaceRepository imported successfully');
    
    console.log('\n4. Testing basic functionality...');
    
    // Test AuthService
    const testUser = AuthService.getUserById('user-1760035323771');
    if (testUser) {
      console.log('✅ AuthService.getUserById works');
      console.log(`   User: ${testUser.email}, Agency: ${testUser.agencyId}`);
    } else {
      console.log('❌ AuthService.getUserById failed');
    }
    
    // Test WorkspaceRepository
    const workspaceRepo = new WorkspaceRepository();
    const workspaces = workspaceRepo.findByAgencyId('agency-1760035323771');
    console.log(`✅ WorkspaceRepository works, found ${workspaces.length} workspaces`);
    
    console.log('\n🎉 All imports and basic functionality working!');
    console.log('The issue might be in the HTTP request handling or Next.js routing.');
    
  } catch (error) {
    console.error('❌ Error during import testing:', error);
    console.error('Stack:', error.stack);
  }
}

testMiddlewareImport();