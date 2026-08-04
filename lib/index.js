/**
 * OmniSec Tester - Main Entry Point
 * Version: 2.0.0
 */

const path = require('path');
const fs = require('fs-extra');
const { initLogger } = require('../src/cli/helpers/logger');
const { checkPythonInstallation } = require('../src/cli/helpers/dependencies');
const { setupEnvironment } = require('../src/cli/helpers/environment');
const { loadConfig } = require('../src/core/config');

class OmniSecTester {
  constructor() {
    this.logger = initLogger();
    this.config = null;
    this.pythonWrapper = require('./python-wrapper');
    this.homeDir = process.env.HOME || process.env.USERPROFILE;
    this.installDir = path.join(this.homeDir, '.omnisectester');
  }

  async initialize(options = {}) {
    try {
      this.logger.info('Initializing OmniSec Tester v2.0.0...');

      // Check Python installation
      const pythonCheck = await checkPythonInstallation();
      if (!pythonCheck.valid) {
        throw new Error(
          `Python ${pythonCheck.version} found, but ${pythonCheck.required} required. ` +
          `Please upgrade Python: https://www.python.org/downloads/`
        );
      }
      this.logger.success(`Python ${pythonCheck.version} detected`);

      // Setup environment
      await setupEnvironment(this.installDir);
      this.logger.success('Environment configured');

      // Load configuration
      const configPath = options.config || './omnisectester.yaml';
      this.config = await loadConfig(configPath);
      this.logger.success('Configuration loaded');

      // Verify core package
      await this.verifyCorePackage();

      return {
        success: true,
        python: pythonCheck.version,
        config: this.config,
        installDir: this.installDir
      };
    } catch (error) {
      this.logger.error('Initialization failed:', error.message);
      throw error;
    }
  }

  async verifyCorePackage() {
    const corePackagePath = path.join(this.installDir, 'omnisectester-core');
    const packageJsonPath = path.join(corePackagePath, 'package.json');

    if (!await fs.pathExists(packageJsonPath)) {
      this.logger.warn('Core package not found. Installing...');
      await this.installCorePackage();
    } else {
      const packageJson = await fs.readJson(packageJsonPath);
      this.logger.success(`Core package v${packageJson.version} detected`);
    }
  }

  async installCorePackage() {
    this.logger.info('Installing OmniSec Tester Core (Python backend)...');
    
    // Clone or download core package
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      // Create install directory
      await fs.ensureDir(this.installDir);

      // Clone repository
      await execAsync(
        `git clone --depth 1 https://github.com/omnisectester/omnisectester-core.git "${path.join(this.installDir, 'omnisectester-core')}"`,
        { timeout: 120000 }
      );

      // Install Python dependencies
      const corePath = path.join(this.installDir, 'omnisectester-core');
      await execAsync('pip install -r requirements.txt', { cwd: corePath });

      this.logger.success('Core package installed successfully');
    } catch (error) {
      throw new Error(`Failed to install core package: ${error.message}`);
    }
  }

  async runScan(options) {
    return this.pythonWrapper.invoke('scan', options);
  }

  async runEngagement(options) {
    return this.pythonWrapper.invoke('engage', options);
  }

  async generateReport(options) {
    return this.pythonWrapper.invoke('report', options);
  }

  async runThreatModel(options) {
    return this.pythonWrapper.invoke('threat-model', options);
  }

  async runRedTeam(options) {
    return this.pythonWrapper.invoke('redteam', options);
  }

  async runSbom(options) {
    return this.pythonWrapper.invoke('sbom', options);
  }

  getVersion() {
    return '2.0.0';
  }

  getInfo() {
    return {
      name: 'omnisectester',
      version: this.getVersion(),
      installDir: this.installDir,
      config: this.config,
      platforms: ['web', 'extension', 'desktop', 'mobile', 'cloud', 'ai', 'firmware'],
      modes: ['automated', 'gray_box', 'red_team', 'purple_team', 'continuous']
    };
  }
}

module.exports = OmniSecTester;

