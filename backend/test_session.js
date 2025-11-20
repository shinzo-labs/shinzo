const axios = require('axios');

// Test the session detail endpoint
async function testSessionDetail() {
  const sessionUuid = 'c6383137-f6ce-4988-9a68-b4c117e55cb8';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiODBiYzRmM2QtNDZiMS00OTcwLWJjODEtMWE0NWVkZDM4YzIwIiwiZW1haWwiOiJhdXN0aW5Ac2hpbnpvbGFicy5jb20iLCJ2ZXJpZmllZCI6dHJ1ZSwiaWF0IjoxNzYzNjM3ODE5LCJleHAiOjE3NjM3MjQyMTl9.dr2UuH8A7oSfsG6Koso2aKFHONZxbmB6fPbKuvQNY5E';
  
  try {
    console.log('Testing session detail endpoint...');
    const response = await axios.get(
      `http://localhost:8000/spotlight/analytics/sessions/${sessionUuid}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.session && response.data.interactions) {
      console.log('✅ Session detail endpoint is working correctly');
      console.log(`Session: ${response.data.session.session_id}`);
      console.log(`Interactions: ${response.data.interactions.length}`);
    } else {
      console.log('❌ Response structure is incorrect');
      console.log('Expected: { session: {...}, interactions: [...] }');
      console.log('Received:', Object.keys(response.data));
    }
  } catch (error) {
    console.error('❌ Error testing session detail:', error.response?.data || error.message);
  }
}

testSessionDetail();
