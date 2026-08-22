/**
 * OmniSec Tester - Main Entry Point
 */

const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const pkg = require('../package.json');

class OmniSecTester {
  constructor(options = {}) {
    this.options = options;
    this.quiet = !!options.quiet;
    this.config = null;
    this.homeDir = process.env.HOME || process.env.USERPROFILE;
    this.installDir = path.join(this.homeDir, '.omnisectester');
    this._logger = null;
    this._pythonWrapper = null;
  }

  // Heavy modules (winston, chalk, ajv, yaml, fs-extra) load on first use,
  // keeping lightweight commands like `list` and `verify-tools` fast.
  get logger() {
    if (!this._logger) {
      const { initLogger } = require('../src/cli/helpers/logger');
      this._logger = initLogger();
    }
    return this._logger;
  }

  get pythonWrapper() {
    if (!this._pythonWrapper) {
      this._pythonWrapper = require('./python-wrapper');
    }
    return this._pythonWrapper;
  }

  async initialize(options = {}) {
    const fs = require('fs-extra');
    const { checkPythonInstallation } = require('../src/cli/helpers/dependencies');
    const { setupEnvironment } = require('../src/cli/helpers/environment');
    const { loadConfig } = require('../src/cli/helpers/validators');

    if (!this.quiet) this.logger.info(`Initializing OmniSec Tester v${pkg.version}...`);

    // Check Python installation
    const pythonCheck = await checkPythonInstallation();
    if (!pythonCheck.valid) {
      if (!pythonCheck.version || pythonCheck.version === 'Not found') {
        throw new Error(
          `Python ${pythonCheck.required} is required but was not found. ` +
          `Please install Python: https://www.python.org/downloads/`
        );
      }
      throw new Error(
        `Python ${pythonCheck.version} found, but ${pythonCheck.required} required. ` +
        `Please upgrade Python: https://www.python.org/downloads/`
      );
    }
    if (!this.quiet) this.logger.success(`Python ${pythonCheck.version} detected`);

    // Setup environment
    await setupEnvironment(this.installDir);
    if (!this.quiet) this.logger.success('Environment configured');

    // Load configuration: local ./omnisectester.yaml first, then the
    // global one created by postinstall in ~/.omnisectester/.
    const homeConfig = path.join(this.installDir, 'omnisectester.yaml');
    let configPath = options.config || './omnisectester.yaml';
    if (!options.config && !await fs.pathExists(configPath) && await fs.pathExists(homeConfig)) {
      configPath = homeConfig;
    }
    this.config = await loadConfig(configPath);
    if (!this.quiet) this.logger.success('Configuration loaded');

    // Verify core package
    await this.verifyCorePackage();

    return {
      success: true,
      python: pythonCheck.version,
      config: this.config,
      installDir: this.installDir
    };
  }

  async verifyCorePackage() {
    const fs = require('fs-extra');
    const corePackagePath = path.join(this.installDir, 'omnisectester-core');
    // Accept either a packaged core (package.json) or a source checkout
    // (omnisectester/cli.py - what python-wrapper actually invokes).
    const marker = ['package.json', path.join('omnisectester', 'cli.py')]
      .map((f) => path.join(corePackagePath, f))
      .find((p) => fs.pathExistsSync(p));

    if (!marker) {
      this.logger.warn('Core package not found. Installing...');
      await this.installCorePackage();
    } else {
      this.logger.success('Core package detected');
    }
  }

  async installCorePackage() {
    this.logger.info('Installing OmniSec Tester Core (Python backend)...');
    const fs = require('fs-extra');

    try {
      const corePath = path.join(this.installDir, 'omnisectester-core');
      await fs.ensureDir(this.installDir);

      await execAsync(
        `git clone --depth 1 https://github.com/iAMv1/omnisectester-core.git "${corePath}"`,
        { timeout: 120000 }
      );

      await execAsync('pip install -r requirements.txt', { cwd: corePath, timeout: 120000 });

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

  async runContinuous(options) {
    return this.pythonWrapper.invoke('continuous', options);
  }

  /**
   * List available tests / platforms / tools / compliance frameworks.
   * Served locally from the CLI (no Python round-trip needed).
   */
  async list(options = {}) {
    const platforms = ['web', 'extension', 'desktop', 'mobile', 'cloud', 'supply-chain', 'cicd', 'ai', 'firmware'];
    const taxonomy = [
      'injection', 'broken-auth', 'sensitive-data-exposure', 'xxe', 'broken-access-control',
      'security-misconfiguration', 'xss', 'insecure-deserialization', 'vulnerable-components',
      'insufficient-logging', 'race-conditions', 'state-manipulation', 'workflow-bypass',
      'prompt-injection', 'jailbreak', 'rag-poisoning', 'model-inversion',
      'dependency-confusion', 'typosquatting', 'cicd-poisoning', 'artifact-tampering'
    ];

    if (options.tools) {
      const { checkTools, checkNodeModules } = require('../src/cli/helpers/dependencies');
      return { tools: await checkTools(), node_modules: await checkNodeModules() };
    }
    if (options.taxonomy) {
      return { count: taxonomy.length, categories: taxonomy };
    }
    if (options.platform) {
      if (!platforms.includes(options.platform)) {
        throw new Error(`Invalid platform: ${options.platform}. Valid: ${platforms.join(', ')}`);
      }
      return { platform: options.platform, tests: taxonomy.length, categories: taxonomy };
    }
    if (options.compliance) {
      return { frameworks: ['pci_dss', 'nist_800_53', 'soc2', 'iso27001'] };
    }
    if (options.mitre) {
      return { note: 'Full ATT&CK matrix ships with the core Python package' };
    }
    return { platforms, modes: ['automated', 'gray_box', 'red_team', 'purple_team', 'continuous'] };
  }

  /** Aggregate environment verification. Runs all checks in parallel. */
  async verifyTools(options = {}) {
    const fs = require('fs-extra');
    const {
      checkPythonInstallation,
      checkNodeModules,
      checkTools,
      checkGitConfig
    } = require('../src/cli/helpers/dependencies');

    const [python, modules, tools, git] = await Promise.all([
      checkPythonInstallation(),
      checkNodeModules(),
      checkTools(),
      checkGitConfig()
    ]);

    const toolEntries = Object.entries(tools.details || tools);
    const installedCount = toolEntries.filter(([, s]) => s.installed).length;

    let core = { installed: await fs.pathExists(path.join(this.installDir, 'omnisectester-core')) };
    const issues = [];
    if (!python.valid) issues.push(`Python ${python.required} required, found: ${python.version}`);
    for (const [name, status] of Object.entries(modules)) {
      if (!status.installed) issues.push(`Missing node module: ${name}`);
    }
    for (const [name, status] of toolEntries) {
      if (!status.installed && status.required) issues.push(`Missing required tool: ${name}`);
    }

    // --fix: attempt the one repair this layer can do (core package install).
    if (options.fix && !core.installed) {
      try {
        await this.installCorePackage();
        core = { installed: true, repaired: true };
      } catch (error) {
        issues.push(`Core package repair failed: ${error.message}`);
      }
    }

    return {
      python,
      modules,
      git,
      core,
      tools: {
        installed: installedCount,
        total: toolEntries.length,
        details: tools.details || tools
      },
      issues
    };
  }

  /** CVSS/EPSS severity lookup via NVD with offline fallback error. */
  async getSeverity(cve) {
    const fetch = require('node-fetch');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cve)}`, {
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`NVD responded ${res.status}`);
      const data = await res.json();
      const vuln = data.vulnerabilities && data.vulnerabilities[0];
      if (!vuln) throw new Error(`${cve} not found in NVD`);

      const metrics = vuln.cve.metrics;
      const cvss =
        (metrics.cvssMetricV40 && metrics.cvssMetricV40[0]) ||
        (metrics.cvssMetricV31 && metrics.cvssMetricV31[0]) ||
        (metrics.cvssMetricV30 && metrics.cvssMetricV30[0]) ||
        null;

      return {
        cve,
        cvss: cvss
          ? { version: cvss.type === 'Primary' ? '4.0/3.x' : '3.x', base_score: cvss.cvssData.baseScore, severity: cvss.cvssData.baseSeverity }
          : { base_score: null, severity: 'UNKNOWN' },
        epss: { percentile: null, decile: null, note: 'EPSS feed requires core package' },
        ssvc: { exploitation: 'N/A', utility: 'N/A' },
        final_severity: cvss ? String(cvss.cvssData.baseSeverity).toUpperCase() : 'UNKNOWN'
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  getVersion() {
    return pkg.version;
  }

  getInfo() {
    return {
      name: pkg.name,
      version: pkg.version,
      installDir: this.installDir,
      config: this.config,
      platforms: ['web', 'extension', 'desktop', 'mobile', 'cloud', 'supply-chain', 'cicd', 'ai', 'firmware'],
      modes: ['automated', 'gray_box', 'red_team', 'purple_team', 'continuous']
    };
  }
}

module.exports = OmniSecTester;
