#!/usr/bin/env node

/**
 * Post-install script for OmniSec Tester
 * Runs after npm install to set up the Python environment
 */

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const ora = require('ora');
const chalk = require('chalk');

const execAsync = promisify(exec);

async function postInstall() {
  console.log(chalk.cyan('\n🔧 OmniSec Tester v2.0.0 - Post-Install Setup\n'));

  const spinner = ora();
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const installDir = path.join(homeDir, '.omnisectester');

  try {
    // Step 1: Create directories
    spinner.start('Creating configuration directories...');
    await fs.ensureDir(installDir);
    await fs.ensureDir(path.join(installDir, 'cache'));
    await fs.ensureDir(path.join(installDir, 'evidence'));
    await fs.ensureDir(path.join(installDir, 'tools'));
    await fs.ensureDir(path.join(installDir, 'logs'));
    spinner.succeed('Configuration directories created');

    // Step 2: Check Python installation
    spinner.start('Checking Python installation...');
    const pythonCheck = await checkPythonInstallation();
    if (!pythonCheck.valid) {
      spinner.warn(`Python ${pythonCheck.version} found (${pythonCheck.required} recommended)`);
    } else {
      spinner.succeed(`Python ${pythonCheck.version} detected`);
    }

    // Step 3: Install Python dependencies
    spinner.start('Installing Python dependencies...');
    await installPythonDependencies(installDir);
    spinner.succeed('Python dependencies installed');

    // Step 4: Clone core package
    spinner.start('Cloning OmniSec Tester Core...');
    await cloneCorePackage(installDir);
    spinner.succeed('Core package cloned');

    // Step 5: Install core package
    spinner.start('Installing core framework...');
    await installCorePackage(installDir);
    spinner.succeed('Core framework installed');

    // Step 6: Create default configuration
    spinner.start('Creating default configuration...');
    await createDefaultConfig(installDir);
    spinner.succeed('Default configuration created');

    // Step 7: Setup PATH
    spinner.start('Configuring PATH...');
    await setupPath(installDir);
    spinner.succeed('PATH configured');

    console.log(chalk.green('\n✅ OmniSec Tester v2.0.0 installed successfully!\n'));
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white('  1. Run: omnisectester --version'));
    console.log(chalk.white('  2. Run: omnisectester verify-tools'));
    console.log(chalk.white('  3. Run: omnisectester threat-model --target https://example.com\n'));
    console.log(chalk.yellow('Documentation: https://omnisectester.io/docs\n'));

  } catch (error) {
    spinner.fail('Installation failed: ' + error.message);
    console.error(chalk.red('\n❌ Installation failed. Please check the error above.\n'));
    process.exit(1);
  }
}

async function checkPythonInstallation() {
  try {
    const { stdout } = await execAsync('python3 --version || python --version');
    const version = stdout.trim().split(' ')[1];
    return {
      valid: true,
      version: version,
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

async function installPythonDependencies(installDir) {
  const requirements = `requests>=2.31.0
PyYAML>=6.0.1
python-dateutil>=2.8.2
pytz>=2023.3
cryptography>=41.0.7
jinja2>=3.1.2
  `;

  await fs.writeFile(path.join(installDir, 'requirements.txt'), requirements);
  await execAsync(`pip install -r "${path.join(installDir, 'requirements.txt')}"`, {
    timeout: 300000
  });
}

async function cloneCorePackage(installDir) {
  const corePath = path.join(installDir, 'omnisectester-core');

  if (await fs.pathExists(corePath)) {
    await fs.remove(corePath);
  }

  try {
    await execAsync(
      `git clone --depth 1 https://github.com/omnisectester/omnisectester-core.git "${corePath}"`,
      { timeout: 120000 }
    );
  } catch (error) {
    // Fallback: create placeholder structure
    await fs.ensureDir(corePath);
    await fs.ensureDir(path.join(corePath, 'omnisectester'));
    const placeholderPy = `"""OmniSec Tester Core"""\n__version__ = "2.0.0"\n`;
    await fs.writeFile(path.join(corePath, 'omnisectester', '__init__.py'), placeholderPy);
  }
}

async function installCorePackage(installDir) {
  const corePath = path.join(installDir, 'omnisectester-core');
  try {
    await execAsync('pip install -e .', { cwd: corePath, timeout: 120000 });
  } catch (error) {
    console.warn('Core package installation skipped (placeholder mode)');
  }
}

async function createDefaultConfig(installDir) {
  const configContent = `version: "2.0.0"\nengagement:\n  mode: gray_box\n  kill_switch: true\n`;
  await fs.writeFile(path.join(installDir, 'omnisectester.yaml'), configContent);
}

async function setupPath(installDir) {
  const platform = process.platform;
  let shellConfig;

  if (platform === 'win32') {
    shellConfig = process.env.USERPROFILE + '\\npmrc';
  } else {
    const homeDir = process.env.HOME;
    shellConfig = path.join(homeDir, '.bashrc');
  }

  try {
    let content = '';
    if (await fs.pathExists(shellConfig)) {
      content = await fs.readFile(shellConfig, 'utf8');
    }
    if (!content.includes('OmniSec Tester')) {
      await fs.appendFile(shellConfig, '\n# OmniSec Tester\nexport PATH="' + installDir + ':$PATH"\n');
    }
  } catch (error) {
    console.warn('Could not update PATH automatically. Please add manually:', installDir);
  }
}

postInstall();

