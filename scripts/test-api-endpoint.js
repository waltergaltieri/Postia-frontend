// Test the API endpoint directly using the Next.js API
const { NextRequest } = require('next/server');

async function testWorkspaceAPI() {
  try {
    console.log('Testing workspace API endpoint...');
    
    // Import the API route handlers
    const { GET, POST } = require('../src/app/api/workspaces/route.ts');
    
    console.log('1. API handlers imported successfully');
    
    // Test GET request
    console.log('\n=== Testing GET /api/workspaces ===');
    const getUrl = new URL('http://localhost:3000/api/workspaces?agencyId=agency-demo-001');
    const getRequest = new NextRequest(getUrl);
    
    const getResponse = await GET(getRequest);
    const getData = await getResponse.json();
    
    console.log('GET Response status:', getResponse.status);
    console.log('GET Response data:', JSON.stringify(getData, null, 2));
    
    // Test POST request
    console.log('\n=== Testing POST /api/workspaces ===');
    const postUrl = new URL('http://localhost:3000/api/workspaces');
    const postRequest = new NextRequest(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'API Test Workspace',
        branding: {
          primaryColor: '#9333ea',
          secondaryColor: '#737373',
          slogan: 'API test slogan',
          description: 'API test description'
        }
      })
    });
    
    const postResponse = await POST(postRequest);
    const postData = await postResponse.json();
    
    console.log('POST Response status:', postResponse.status);
    console.log('POST Response data:', JSON.stringify(postData, null, 2));
    
    if (postResponse.status === 201) {
      console.log('\n✅ All API tests passed!');
    } else {
      console.log('\n❌ API test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
    console.error('Stack:', error.stack);
  }
}

testWorkspaceAPI();