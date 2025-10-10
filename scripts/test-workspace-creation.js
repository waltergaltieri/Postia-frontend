const fetch = require('node-fetch');

async function testWorkspaceCreation() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Testing workspace creation...');
  
  try {
    const response = await fetch(`${baseUrl}/api/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Workspace',
        branding: {
          primaryColor: '#9333ea',
          secondaryColor: '#737373',
          slogan: 'Test slogan',
          description: 'Test description'
        }
      })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Workspace creation successful!');
    } else {
      console.log('❌ Workspace creation failed');
    }
  } catch (error) {
    console.error('❌ Error testing workspace creation:', error.message);
  }
}

async function testWorkspaceList() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('\nTesting workspace list...');
  
  try {
    const response = await fetch(`${baseUrl}/api/workspaces?agencyId=agency-demo-001`);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Workspace list successful!');
    } else {
      console.log('❌ Workspace list failed');
    }
  } catch (error) {
    console.error('❌ Error testing workspace list:', error.message);
  }
}

// Run tests
testWorkspaceCreation().then(() => testWorkspaceList());