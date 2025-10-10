const fetch = require('node-fetch');

async function debugAuthEndpoints() {
  console.log('=== DEBUGGING AUTH ENDPOINTS ===\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // 1. Test login first
    console.log('1. Testing login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin-dcr96g@miagencia.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response status:', loginResponse.status);
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed, cannot continue');
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Login successful, token:', token);
    
    // 2. Test /api/auth/me
    console.log('\n2. Testing /api/auth/me...');
    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const meData = await meResponse.json();
    console.log('Me response status:', meResponse.status);
    console.log('Me response:', JSON.stringify(meData, null, 2));
    
    if (!meResponse.ok) {
      console.log('❌ /api/auth/me failed');
      return;
    }
    
    console.log('✅ /api/auth/me successful');
    
    // 3. Test GET /api/workspaces
    console.log('\n3. Testing GET /api/workspaces...');
    const getWorkspacesResponse = await fetch(`${baseUrl}/api/workspaces`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const getWorkspacesData = await getWorkspacesResponse.json();
    console.log('GET workspaces response status:', getWorkspacesResponse.status);
    console.log('GET workspaces response:', JSON.stringify(getWorkspacesData, null, 2));
    
    if (!getWorkspacesResponse.ok) {
      console.log('❌ GET /api/workspaces failed');
      return;
    }
    
    console.log('✅ GET /api/workspaces successful');
    
    // 4. Test POST /api/workspaces
    console.log('\n4. Testing POST /api/workspaces...');
    const postWorkspaceResponse = await fetch(`${baseUrl}/api/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Test Workspace Debug ' + Date.now(),
        branding: {
          primaryColor: '#9333ea',
          secondaryColor: '#737373',
          slogan: 'Debug test workspace',
          description: 'Created for debugging purposes'
        }
      })
    });
    
    const postWorkspaceData = await postWorkspaceResponse.json();
    console.log('POST workspace response status:', postWorkspaceResponse.status);
    console.log('POST workspace response:', JSON.stringify(postWorkspaceData, null, 2));
    
    if (!postWorkspaceResponse.ok) {
      console.log('❌ POST /api/workspaces failed');
      return;
    }
    
    console.log('✅ POST /api/workspaces successful');
    
    console.log('\n🎉 All endpoints working correctly!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

debugAuthEndpoints();