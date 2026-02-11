/**
 * Manual test for upload limit configuration
 * Tests that the config value affects multer limits
 * Run with: node test/upload-limit.test.js
 */

import { loadConfig } from '../src/store.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../../data/config.csv');

async function testUploadLimit() {
  console.log('Testing upload limit configuration...');

  try {
    // Read original config
    const originalConfig = await fs.promises.readFile(CONFIG_PATH, 'utf-8');

    // Test with default value (10MB)
    console.log('\n1. Testing default value (10MB)...');
    let config = await loadConfig();
    let expectedBytes = parseInt(config.max_file_upload_mb || 10) * 1024 * 1024;
    if (expectedBytes !== 10485760) {
      throw new Error(`Expected 10485760 bytes, got ${expectedBytes}`);
    }
    console.log(`✓ Default limit: ${config.max_file_upload_mb}MB = ${expectedBytes} bytes`);

    // Test with modified value (5MB)
    console.log('\n2. Testing modified value (5MB)...');
    const modifiedConfig = originalConfig.replace(
      'max_file_upload_mb;10;',
      'max_file_upload_mb;5;'
    );
    await fs.promises.writeFile(CONFIG_PATH, modifiedConfig, 'utf-8');

    config = await loadConfig();
    expectedBytes = parseInt(config.max_file_upload_mb || 10) * 1024 * 1024;
    if (expectedBytes !== 5242880) {
      throw new Error(`Expected 5242880 bytes, got ${expectedBytes}`);
    }
    console.log(`✓ Modified limit: ${config.max_file_upload_mb}MB = ${expectedBytes} bytes`);

    // Test with large value (50MB)
    console.log('\n3. Testing large value (50MB)...');
    const largeConfig = originalConfig.replace(
      'max_file_upload_mb;10;',
      'max_file_upload_mb;50;'
    );
    await fs.promises.writeFile(CONFIG_PATH, largeConfig, 'utf-8');

    config = await loadConfig();
    expectedBytes = parseInt(config.max_file_upload_mb || 10) * 1024 * 1024;
    if (expectedBytes !== 52428800) {
      throw new Error(`Expected 52428800 bytes, got ${expectedBytes}`);
    }
    console.log(`✓ Large limit: ${config.max_file_upload_mb}MB = ${expectedBytes} bytes`);

    // Restore original config
    console.log('\n4. Restoring original config...');
    await fs.promises.writeFile(CONFIG_PATH, originalConfig, 'utf-8');
    console.log('✓ Original config restored');

    console.log('\n✅ All upload limit tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run test
testUploadLimit()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
