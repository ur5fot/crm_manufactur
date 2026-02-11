/**
 * Manual test for max_file_upload_mb configuration
 * Run with: node server/test/config.test.js
 */

import { loadConfig } from '../src/store.js';

async function testConfigLoading() {
  console.log('Testing config loading...');

  try {
    const config = await loadConfig();

    // Test 1: Config object is returned
    if (!config || typeof config !== 'object') {
      throw new Error('Config should be an object');
    }
    console.log('✓ Config loaded successfully');

    // Test 2: max_file_upload_mb exists
    if (!config.max_file_upload_mb) {
      throw new Error('max_file_upload_mb not found in config');
    }
    console.log('✓ max_file_upload_mb exists in config');

    // Test 3: Value is parseable as integer
    const maxSize = parseInt(config.max_file_upload_mb);
    if (isNaN(maxSize) || maxSize <= 0) {
      throw new Error('max_file_upload_mb should be a positive number');
    }
    console.log(`✓ max_file_upload_mb value is valid: ${maxSize}MB`);

    // Test 4: Calculate bytes (same as server logic)
    const maxBytes = maxSize * 1024 * 1024;
    console.log(`✓ Max upload size in bytes: ${maxBytes}`);

    console.log('\n✅ All config tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run test
testConfigLoading()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
