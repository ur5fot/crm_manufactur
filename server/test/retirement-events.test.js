/**
 * Manual test for retirement events feature
 * Run with: node server/test/retirement-events.test.js
 */

import { getRetirementEvents, loadConfig } from '../src/store.js';

async function testRetirementEvents() {
  console.log('Testing retirement events...');

  try {
    // Test 1: Config loads retirement age
    const config = await loadConfig();
    const retirementAge = parseInt(config.retirement_age_years || 60, 10);
    if (isNaN(retirementAge) || retirementAge <= 0) {
      throw new Error('retirement_age_years should be a positive number');
    }
    console.log(`✓ Retirement age loaded from config: ${retirementAge} years`);

    // Test 2: getRetirementEvents returns expected structure
    const events = await getRetirementEvents(retirementAge);
    if (!events || typeof events !== 'object') {
      throw new Error('getRetirementEvents should return an object');
    }
    if (!Array.isArray(events.today)) {
      throw new Error('events.today should be an array');
    }
    if (!Array.isArray(events.thisMonth)) {
      throw new Error('events.thisMonth should be an array');
    }
    console.log('✓ getRetirementEvents returns correct structure');

    // Test 3: Check event properties
    const allEvents = [...events.today, ...events.thisMonth];
    console.log(`✓ Found ${allEvents.length} retirement events (${events.today.length} today, ${events.thisMonth.length} this month)`);

    if (allEvents.length > 0) {
      const firstEvent = allEvents[0];
      const requiredFields = ['employee_id', 'employee_name', 'birth_date', 'retirement_date', 'age'];
      for (const field of requiredFields) {
        if (!(field in firstEvent)) {
          throw new Error(`Event should have field: ${field}`);
        }
      }
      console.log('✓ Events have all required fields');
      console.log(`  Example: ${firstEvent.employee_name} (age ${firstEvent.age}) on ${firstEvent.retirement_date}`);
    }

    // Test 4: Age calculation is correct
    for (const event of allEvents) {
      if (event.age !== retirementAge) {
        throw new Error(`Expected age ${retirementAge}, got ${event.age} for ${event.employee_name}`);
      }
    }
    console.log('✓ All events have correct age');

    console.log('\n✅ All retirement event tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run test
testRetirementEvents()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
