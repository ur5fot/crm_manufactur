/**
 * Manual API test for retirement events endpoint
 * Prerequisites: Server must be running on port 3000
 * Run with: node server/test/retirement-api.test.js
 */

async function testRetirementAPI() {
  console.log('Testing retirement events API...');

  try {
    // Test 1: Endpoint is accessible
    const response = await fetch('http://localhost:3000/api/retirement-events');
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    console.log('✓ API endpoint is accessible');

    // Test 2: Response is valid JSON
    const data = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('API should return an object');
    }
    console.log('✓ API returns valid JSON');

    // Test 3: Response has expected structure
    if (!Array.isArray(data.today)) {
      throw new Error('Response should have today array');
    }
    if (!Array.isArray(data.thisMonth)) {
      throw new Error('Response should have thisMonth array');
    }
    console.log('✓ API response has correct structure');

    // Test 4: Log results
    console.log(`✓ Found ${data.today.length} retirement events today`);
    console.log(`✓ Found ${data.thisMonth.length} retirement events this month`);

    if (data.today.length > 0) {
      console.log('  Today events:');
      data.today.forEach(evt => {
        console.log(`    - ${evt.employee_name} (age ${evt.age})`);
      });
    }

    if (data.thisMonth.length > 0) {
      console.log('  This month events:');
      data.thisMonth.forEach(evt => {
        console.log(`    - ${evt.employee_name} (age ${evt.age}) on ${evt.retirement_date}`);
      });
    }

    console.log('\n✅ All API tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Make sure the server is running on port 3000');
    }
    return false;
  }
}

// Run test
testRetirementAPI()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
