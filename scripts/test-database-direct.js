// Test database functionality directly
const path = require('path');

// Add the src directory to the module path
const srcPath = path.join(__dirname, '..', 'src');
require('module').globalPaths.push(srcPath);

async function testDatabase() {
  try {
    console.log('Testing database functionality...');
    
    // Import the WorkspaceRepository
    const { WorkspaceRepository } = require('../src/lib/database/repositories/WorkspaceRepository.ts');
    
    console.log('Creating WorkspaceRepository instance...');
    const workspaceRepo = new WorkspaceRepository();
    
    console.log('Testing workspace creation...');
    const testWorkspace = {
      agencyId: 'agency-demo-001',
      name: 'Test Workspace Direct ' + Date.now(),
      branding: {
        primaryColor: '#9333ea',
        secondaryColor: '#737373',
        logo: '',
        slogan: 'Test slogan',
        description: 'Test description',
        whatsapp: '',
      },
    };

    const newWorkspace = workspaceRepo.create(testWorkspace);
    console.log('✅ Workspace created successfully:', newWorkspace);

    // Test listing workspaces
    const workspaces = workspaceRepo.findByAgencyId('agency-demo-001');
    console.log('✅ Found workspaces:', workspaces.length);
    
    workspaces.forEach((ws, index) => {
      console.log(`  ${index + 1}. ${ws.name} (${ws.id})`);
    });

    console.log('✅ All database tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testDatabase();