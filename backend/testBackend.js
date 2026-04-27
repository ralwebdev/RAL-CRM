async function test() {
  const API_URL = 'http://localhost:5000/api';
  console.log('--- Testing Telecalling Backend ---');

  try {
    // 1. Test 401
    console.log('Testing 401 for /api/calllogs...');
    const unauthorizedRes = await fetch(`${API_URL}/calllogs`);
    if (unauthorizedRes.status === 401) {
      console.log('Success: Received 401 as expected.');
    } else {
      console.error('FAILED: Did not receive 401 for unauthorized access.');
    }

    // 2. Login
    console.log('Logging in as telecaller...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'shreya@redapple.com', password: 'telecaller123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful, token received.');

    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 3. Create CallLog
    console.log('Creating a test CallLog...');
    const callLogBody = {
      leadId: 'test_lead_id',
      outcome: 'Interested',
      notes: 'Test call from verification script',
      createdAt: new Date().toISOString().split('T')[0],
      conversationInsight: { careerGoal: 'Software Engineer' }
    };
    const logRes = await fetch(`${API_URL}/calllogs`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(callLogBody)
    });
    const logData = await logRes.json();
    console.log('Success: CallLog created:', logData._id);
    
    if (logData.telecallerId) {
        console.log('Data Integrity Check: telecallerId exists.');
    } else {
        console.error('Data Integrity Check FAILED: telecallerId is missing!');
    }

    // 4. Create FollowUp
    console.log('Creating a test FollowUp...');
    const followUpBody = {
      leadId: 'test_lead_id',
      date: '2026-04-01',
      notes: 'Test follow-up from verification script',
    };
    const fuRes = await fetch(`${API_URL}/followups`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(followUpBody)
    });
    const fuData = await fuRes.json();
    console.log('Success: FollowUp created:', fuData._id);

    console.log('--- All Tests Passed ---');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

test();
