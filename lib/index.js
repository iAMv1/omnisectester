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
    this.logger.info('Installing OmniSec Tester Core (pinned release)...');
    const fs = require('fs-extra');
    const fetch = require('node-fetch');

    const version = (pkg.config && pkg.config.engine_release) || 'v1.6.0';
    const base = 'https://github.com/iAMv1/omnisectester-core/releases/download';
    const tgzUrl = `${base}/${version}/omnisectester_core-${version.replace('v', '')}.tar.gz`;
    const corePath = path.join(this.installDir, 'omnisectester-core');

    try {
      await fs.ensureDir(corePath);
      const tgzPath = path.join(this.installDir, 'engine.tar.gz');
      this.logger.info(`Downloading ${tgzUrl}`);
      const res = await fetch(tgzUrl);
      if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
      const buf = await res.buffer();
      await fs.writeFile(tgzPath, buf);

      // tar ships with Windows 10+, macOS and Linux - no git binary needed.
      await execAsync(`tar -xzf "${tgzPath}" -C "${corePath}" --strip-components 1`,
                      { timeout: 120000 });
      await fs.remove(tgzPath);

      if (!await fs.pathExists(path.join(corePath, 'omnisectester', 'cli.py'))) {
        throw new Error('archive extracted but cli.py not found');
      }
      this.logger.success('Core package installed successfully');
    } catch (error) {
      throw new Error(
        `Failed to install core package: ${error.message}. ` +
        `Alternatives: pip install https://github.com/iAMv1/omnisectester-core/releases/download/${version}/omnisectester_core-${version.replace('v', '')}-py3-none-any.whl`);
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

    if (options.tools) {
      const { checkTools, checkNodeModules } = require('../src/cli/helpers/dependencies');
      return { tools: await checkTools(), node_modules: await checkNodeModules() };
    }

    if (options.taxonomy) {
      // Full taxonomy ships as a data file synced from omnisectester-core.
      try {
        const cats = require('../data/taxonomy-core.json');
        if (options.platform) {
          const filtered = cats.filter(c => c.domain === options.platform);
          return { count: filtered.length, categories: filtered.map(c => c.id),
                   platform: options.platform };
        }
        return { count: cats.length, categories: cats.map(c => c.id) };
      } catch (_) { /* fall through to embedded subset */ }
      const fallback = ['injection', 'broken-auth', 'sensitive-data-exposure',
        'xxe', 'broken-access-control', 'security-misconfiguration', 'xss',
        'insecure-deserialization', 'vulnerable-components',
        'insufficient-logging'];
      return { count: fallback.length, categories: fallback,
               note: 'subset - install Python core for the full taxonomy' };
    }

    if (options.platform) {
      if (!platforms.includes(options.platform)) {
        throw new Error(`Invalid platform: ${options.platform}. Valid: ${platforms.join(', ')}`);
      }
      return { platform: options.platform, ok: true };
    }
    if (options.compliance) {
      return { frameworks: ['pci_dss', 'nist_800_53', 'soc2', 'iso27001'] };
    }
    if (options.mitre) {
      return { note: 'ATT&CK mapping ships per-finding via postexploit/killchain in omnisectester-core' };
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
    const jsonFetch = async (url, ms) => {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), ms || 8000);
      try {
        const res = await fetch(url, { signal: c.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } finally {
        clearTimeout(t);
      }
    };
    try {
      const nvdData = await jsonFetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cve)}`);
      const vuln = nvdData.vulnerabilities && nvdData.vulnerabilities[0];
      if (!vuln) throw new Error(`${cve} not found in NVD`);

      const metrics = vuln.cve.metrics;
      const cvss =
        (metrics.cvssMetricV40 && metrics.cvssMetricV40[0]) ||
        (metrics.cvssMetricV31 && metrics.cvssMetricV31[0]) ||
        (metrics.cvssMetricV30 && metrics.cvssMetricV30[0]) ||
        null;

      // Pillar 2: EPSS (FIRST.org, keyless). Pillar 3 inputs: KEV + CVSS.
      let epss = { epss: null, percentile: null };
      try {
        const e = await jsonFetch(`https://api.first.org/data/v1/epss?cve=${encodeURIComponent(cve)}`);
        if (e.data && e.data[0]) {
          epss = { epss: parseFloat(e.data[0].epss), percentile: parseFloat(e.data[0].percentile) };
        }
      } catch (_) { /* intel feed optional */ }

      let kevHit = false;
      try {
        const kev = await jsonFetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', 15000);
        kevHit = (kev.vulnerabilities || []).some(v => v.cveID === cve);
      } catch (_) { /* KEV optional */ }

      // Simplified SSVC decision (deterministic)
      const base = cvss ? cvss.cvssData.baseScore : 0;
      const exploitation = kevHit ? 'active' : ((epss.epss || 0) >= 0.5 ? 'poc' : 'none');
      const impact = base >= 9 ? 'total' : (base >= 7 ? 'partial' : 'low');
      const automatable = (epss.epss || 0) >= 0.2;
      const decision = (exploitation === 'active' || (automatable && impact === 'total'))
        ? 'ACT' : (impact === 'total' ? 'ATTEND' : 'TRACK');

      const sevRank = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      let final = cvss ? String(cvss.cvssData.baseSeverity).toUpperCase() : 'UNKNOWN';
      if (kevHit) final = 'CRITICAL';
      else if ((epss.epss || 0) >= 0.5 && sevRank.indexOf(final) < sevRank.indexOf('HIGH')) final = 'HIGH';

      return {
        cve,
        cvss: cvss
          ? { base_score: cvss.cvssData.baseScore,
              severity: String(cvss.cvssData.baseSeverity).toUpperCase(),
              vector: cvss.cvssData.vectorString }
          : { base_score: null, severity: 'UNKNOWN' },
        epss: { epss: epss.epss, percentile: epss.percentile },
        kev: kevHit,
        ssvc: { exploitation, technical_impact: impact, automatable, decision },
        pillars: {
          cvss: cvss ? `${cvss.cvssData.baseScore} ${cvss.cvssData.baseSeverity}` : 'N/A',
          epss: epss.epss !== null ? `${(epss.epss * 100).toFixed(1)}% probability` : 'unavailable',
          kev: kevHit ? 'LISTED - actively exploited' : 'not listed',
          ssvc_decision: decision,
        },
        final_severity: final,
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
