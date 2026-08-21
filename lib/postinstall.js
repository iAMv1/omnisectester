#!/usr/bin/env node

/**
 * Post-install script for OmniSec Tester.
 * Optimized for CI/CD reliability: uses only Node.js built-ins so it
 * never breaks `npm install` in GitHub Actions or for end users.
 */

const fs = require('fs');
const path = require('path');

function log(msg) {
  console.log(`[omnisectester] ${msg}`);
}

function step(name) {
  log(`● ${name}`);
}

// Determine if we are running inside a CI environment (GitHub Actions, etc.)
function isCI() {
  return !!(
    process.env.GITHUB_ACTIONS ||
    process.env.CI ||
    process.env.GITLAB_CI ||
    process.env.JENKINS_URL
  );
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

async function postInstall() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const installDir = path.join(homeDir, '.omnisectester');

  // If running in CI, only create the directory structure and exit.
  if (isCI()) {
    try {
      ['cache', 'evidence', 'tools', 'logs'].forEach((sub) => {
        ensureDir(path.join(installDir, sub));
      });
      log('CI environment detected - setup minimized (directories only).');
    } catch (error) {
      log('CI setup warning: ' + error.message);
    }
    return;
  }

  log('OmniSec Tester - Post-Install Setup');

  try {
    // Step 1: Create directories
    step('Creating configuration directories...');
    ensureDir(installDir);
    ['cache', 'evidence', 'tools', 'logs'].forEach((sub) => {
      ensureDir(path.join(installDir, sub));
    });

    // Step 2: Create default configuration (non-fatal)
    step('Creating default configuration...');
    const configPath = path.join(installDir, 'omnisectester.yaml');
    if (!fs.existsSync(configPath)) {
      const configContent =
        'version: "2.0.0"\nengagement:\n  mode: gray_box\n  kill_switch: true\n';
      fs.writeFileSync(configPath, configContent);
    }

    log('✅ OmniSec Tester installed. Run "omnisectester --help" to get started.');
    log('Documentation: https://omnisectester.io/docs');
  } catch (error) {
    log('⚠️  Post-install warning (non-fatal): ' + error.message);
  }
}

postInstall();


