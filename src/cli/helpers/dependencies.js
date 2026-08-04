const { exec } = require('child_process');
const { promisify } = require('util');
const ora = require('ora');
const logger = require('./logger');

const execAsync = promisify(exec);

async function checkPythonInstallation() {
  try {
    const { stdout } = await execAsync('python3 --version || python --version');
    const version = stdout.trim().split(' ')[1];
    const parts = version.split('.').map(Number);
    const major = parts[0];
    const minor = parts[1];

    return {
      valid: major > 3 || (major === 3 && minor >= 10),
      version,
      major,
      minor,
      required: '3.10+'
    };
  } catch (error) {
    return {
      valid: false,
      version: 'Not found',
      required: '3.10+'
    };
  }
}

async function checkNodeModules() {
  const required = [
    'commander',
    'chalk',
    'ora',
    'inquirer',
    'node-fetch',
    'yaml',
    'ajv',
    'fs-extra'
  ];

  const results = {};
  
  for (const module of required) {
    try {
      const pkg = require(module);
      results[module] = {
        installed: true,
        version: pkg.version || 'unknown'
      };
    } catch (error) {
      results[module] = {
        installed: false,
        version: null
      };
    }
  }

  return results;
}

async function checkTools() {
  const tools = {
    git: { command: 'git --version', required: true },
    pip: { command: 'pip --version', required: true },
    npm: { command: 'npm --version', required: false },
    docker: { command: 'docker --version', required: false },
    zap: { command: 'zap.sh -version', required: false },
    nuclei: { command: 'nuclei -version', required: false },
    ghidra: { command: 'ghidraRun -version', required: false }
  };

  const results = {};

  for (const [tool, config] of Object.entries(tools)) {
    try {
      const { stdout } = await execAsync(config.command);
      const version = stdout.trim().split('\n')[0];
      results[tool] = {
        installed: true,
        version,
        required: config.required
      };
    } catch (error) {
      results[tool] = {
        installed: false,
        version: null,
        required: config.required
      };
    }
  }

  return results;
}

async function checkGitConfig() {
  try {
    const { stdout } = await execAsync('git config --global user.name');
    const name = stdout.trim();
    
    try {
      const { stdout: email } = await execAsync('git config --global user.email');
      return {
        configured: true,
        name,
        email: email.trim()
      };
    } catch (error) {
      return {
        configured: false,
        name,
        email: null
      };
    }
  } catch (error) {
    return {
      configured: false,
      name: null,
      email: null
    };
  }
}

module.exports = {
  checkPythonInstallation,
  checkNodeModules,
  checkTools,
  checkGitConfig
};

