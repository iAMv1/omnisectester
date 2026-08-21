const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('./logger');

const execAsync = promisify(exec);

async function checkPythonInstallation() {
  const cmd = process.platform === 'win32' ? 'python --version' : 'python3 --version || python --version';
  try {
    const { stdout } = await execAsync(cmd);
    const version = stdout.trim().split(' ')[1];
    if (!version) throw new Error('unparseable version output');
    const parts = version.split('.').map(Number);
    const major = parts[0];
    const minor = parts[1] || 0;

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
    'yaml',
    'ajv',
    'fs-extra',
    'winston'
  ];

  // require.resolve only verifies presence on the resolution path -
  // cheaper and safer than require() (no module execution).
  const entries = await Promise.all(
    required.map(async (name) => {
      try {
        require.resolve(name);
        let version = 'unknown';
        try {
          // eslint-disable-next-line global-require, import/no-dynamic-require
          const pkgJson = require(require.resolve(`${name}/package.json`));
          if (pkgJson && pkgJson.version) version = pkgJson.version;
        } catch (_) { /* exports-blocked or missing - keep unknown */ }
        return [name, { installed: true, version }];
      } catch (_) {
        return [name, { installed: false, version: null }];
      }
    })
  );

  return Object.fromEntries(entries);
}

async function checkTools() {
  // Only universally available probes here; heavy security tools
  // (zap, nuclei, ghidra) are checked by the Python core.
  const tools = {
    git: { command: 'git --version', required: true },
    pip: { command: 'pip --version', required: true },
    npm: { command: 'npm --version', required: false },
    docker: { command: 'docker --version', required: false }
  };

  const results = {};

  // All tool probes are independent - run them concurrently.
  await Promise.all(
    Object.entries(tools).map(async ([tool, config]) => {
      try {
        const { stdout } = await execAsync(config.command, { timeout: 10000 });
        results[tool] = {
          installed: true,
          version: stdout.trim().split('\n')[0],
          required: config.required
        };
      } catch (_) {
        results[tool] = {
          installed: false,
          version: null,
          required: config.required
        };
      }
    })
  );

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
    } catch (_) {
      return {
        configured: false,
        name,
        email: null
      };
    }
  } catch (_) {
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
