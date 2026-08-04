const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const logger = require('./logger');

async function setupEnvironment(installDir) {
  // Create directory structure
  const dirs = [
    'cache',
    'evidence',
    'tools',
    'logs',
    'reports',
    'plugins',
    'templates'
  ];

  for (const dir of dirs) {
    await fs.ensureDir(path.join(installDir, dir));
  }

  // Create .gitignore
  const gitignore = `# OmniSec Tester
cache/
evidence/
logs/
*.pyc
__pycache__/
*.key
*.pem
*.p12
*.pfx
secrets/
credentials/
  `;

  await fs.writeFile(path.join(installDir, '.gitignore'), gitignore);

  // Set file permissions (Unix-like systems)
  if (process.platform !== 'win32') {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync(`chmod 700 ${installDir}`);
      await execAsync(`chmod 700 ${path.join(installDir, 'evidence')}`);
      await execAsync(`chmod 700 ${path.join(installDir, 'credentials')}`);
    } catch (error) {
      logger.warn('Could not set file permissions');
    }
  }

  logger.success('Environment setup completed');
}

async function setupGitConfig() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    // Check if git config exists
    await execAsync('git config --global user.name');
    await execAsync('git config --global user.email');
  } catch (error) {
    logger.warn('Git not configured. Setting up default config...');
    
    const username = os.userInfo().username;
    const defaultEmail = `${username}@localhost`;
    
    try {
      await execAsync(`git config --global user.name "${username}"`);
      await execAsync(`git config --global user.email "${defaultEmail}"`);
      logger.success(`Git configured with default identity: ${username} <${defaultEmail}>`);
    } catch (error) {
      logger.warn('Could not configure git');
    }
  }
}

async function checkEnvironmentVariables() {
  const required = [
    'OMNI_HOME',
    'OMNI_CACHE_DIR',
    'OMNI_EVIDENCE_DIR'
  ];

  const missing = [];
  
  for (const env of required) {
    if (!process.env[env]) {
      missing.push(env);
    }
  }

  if (missing.length > 0) {
    logger.warn(`Missing environment variables: ${missing.join(', ')}`);
    logger.info('Setting default values...');
    
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const omniHome = path.join(homeDir, '.omnisectester');
    
    process.env.OMNI_HOME = omniHome;
    process.env.OMNI_CACHE_DIR = path.join(omniHome, 'cache');
    process.env.OMNI_EVIDENCE_DIR = path.join(omniHome, 'evidence');
  }

  return {
    valid: true,
    variables: {
      OMNI_HOME: process.env.OMNI_HOME,
      OMNI_CACHE_DIR: process.env.OMNI_CACHE_DIR,
      OMNI_EVIDENCE_DIR: process.env.OMNI_EVIDENCE_DIR
    }
  };
}

module.exports = {
  setupEnvironment,
  setupGitConfig,
  checkEnvironmentVariables
};

