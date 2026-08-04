const { execSync } = require('child_process');
const path = require('path');

console.log('?? OmniSec Tester - CLI Tests\n');

// Test 1: Check CLI exists
console.log('Test 1: CLI binary exists');
try {
  const cliPath = path.join(__dirname, '..', 'bin', 'omnisectester');
  const fs = require('fs');
  if (fs.existsSync(cliPath)) {
    console.log('  ? PASS: bin/omnisectester exists');
  } else {
    console.log('  ? FAIL: bin/omnisectester not found');
  }
} catch (error) {
  console.log('  ? FAIL:', error.message);
}

// Test 2: Check package.json
console.log('\nTest 2: package.json valid');
try {
  const pkg = require('../package.json');
  console.log(`  ? PASS: Name: ${pkg.name}, Version: ${pkg.version}`);
} catch (error) {
  console.log('  ? FAIL:', error.message);
}

// Test 3: Check lib files
console.log('\nTest 3: Core library files exist');
const fs = require('fs');
const libFiles = ['index.js', 'postinstall.js', 'python-wrapper.js'];
for (const file of libFiles) {
  const filePath = path.join(__dirname, '..', 'lib', file);
  if (fs.existsSync(filePath)) {
    console.log(`  ? PASS: lib/${file} exists`);
  } else {
    console.log(`  ? FAIL: lib/${file} not found`);
  }
}

console.log('\n? Tests completed\n');