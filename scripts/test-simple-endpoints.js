// Test the simple endpoints directly
async function testSimpleEndpoints() {
  console.log('=== TESTING SIMPLE ENDPOINTS ===\n');
  
  try {
    // Test the simple endpoints using the API route handlers directly
    const { GET: getWorkspaces, POST: postWorkspace } = require('../src/app/api/workspaces-simple/route.ts');
    const { GET: getAuthMe } = require('../src/app/api/auth-simple/me/route.ts');
    
    console.log('1. Testing GET /api/auth-simple/me...');
    const authMeRequest = new Request('http://localhost:3000/api/auth-simple/me');
    const authMeResponse = await getAuthMe(authMeRequest);
    const authMeData = await authMeResponse.json();
    
    console.log('Auth Me Response status:', authMeResponse.status);
    console.log('Auth Me Response:', JSON.stringify(authMeData, null, 2));
    
    if (authMeResponse.status === 200) {
      console.log('✅ Auth Me endpoint works');
    } else {
      console.log('❌ Auth Me endpoint failed');
    }
    
    console.log('\n2. Testing GET /api/workspaces-simple...');
    const getWorkspacesRequest = new Request('http://localhost:3000/api/workspaces-simple?agencyId=agency-1760035323771');
    const getWorkspacesResponse = await getWorkspaces(getWorkspacesRequest);
    const getWorkspacesData = await getWorkspacesResponse.json();
    
    console.log('Get Workspaces Response status:', getWorkspacesResponse.status);
    console.log('Get Workspaces Response:', JSON.stringify(getWorkspacesData, null, 2));
    
    if (getWorkspacesResponse.status === 200) {
      console.log('✅ Get Workspaces endpoint works');
    } else {
      console.log('❌ Get Workspaces endpoint failed');
    }
    
    console.log('\n3. Testing POST /api/workspaces-simple...');
    const postWorkspaceRequest = new Request('http://localhost:3000/api/workspaces-simple?agencyId=agency-1760035323771', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Simple Test Workspace ' + Date.now(),
        branding: {
          primaryColor: '#9333ea',
          secondaryColor: '#737373',
          slogan: 'Simple test workspace',
          description: 'Created using simple endpoint'
        }
      })
    });
    
    const postWorkspaceResponse = await postWorkspace(postWorkspaceRequest);
    const postWorkspaceData = await postWorkspaceResponse.json();
    
    console.log('Post Workspace Response status:', postWorkspaceResponse.status);
    console.log('Post Workspace Response:', JSON.stringify(postWorkspaceData, null, 2));
    
    if (postWorkspaceResponse.status === 201) {
      console.log('✅ Post Workspace endpoint works');
    } else {
      console.log('❌ Post Workspace endpoint failed');
    }
    
    console.log('\n🎉 Simple endpoints testing completed!');
    console.log('If these work, the frontend should now be able to create and list workspaces.');
    
  } catch (error) {
    console.error('❌ Error testing simple endpoints:', error);
    console.error('Stack:', error.stack);
  }
}

testSimpleEndpoints();