const { Command } = require('commander');

const VALID_PLATFORMS = ['web', 'extension', 'desktop', 'mobile', 'cloud', 'supply-chain', 'cicd', 'ai', 'firmware'];

class ScanCommand extends Command {
  constructor(logger) {
    super('scan');
    this.logger = logger;
    this.description('Scan specific platform or attack surface');

    this
      .argument('<platform>', `Platform to scan: ${VALID_PLATFORMS.join(', ')}`)
      .argument('<target>', 'Target to scan')
      .option('-o, --output <dir>', 'Output directory', './reports')
      .option('--platform <name>', 'Sub-platform (chrome, firefox, electron, android, ios, aws, azure, gcp)')
      .option('--tests <ids>', 'Comma-separated test IDs to run')
      .option('--exclude <ids>', 'Comma-separated test IDs to exclude')
      .option('--format <formats>', 'Report formats', 'json,html')      .option('--severity <level>', 'Minimum severity to report', 'low')
      .option('--rate-limit <rps>', 'Requests per second', '4')
      .option('--max-pages <n>', 'Agent crawl page cap', '25')
      .option('--fail-on <level>', 'Exit 2 when findings at/above this severity (critical|high|medium|low|info)')
      .option('--include-subdomains', 'Widen crawl scope to *.target')
      .option('--exclude <patterns>', 'Comma-separated regexes to exclude from crawl')
      .option('--llm', 'Add optional LLM analysis (needs OMNI_LLM_KEY + OMNI_LLM_MODEL env)')
      .option('--auth <type>', 'Authentication type (bearer, basic, none)')
      .option('--auth-token <token>', 'Authentication token')
      .option('--force', 'Enable destructive tests')
      .action((platform, target, options) => this.execute(platform, target, options));
  }

  async execute(platform, target, options) {
    // commander passes only local options here - merge in globals (--config, --quiet, ...)
    Object.assign(options, this.optsWithGlobals());
    if (!VALID_PLATFORMS.includes(platform)) {
      this.logger.error(`Invalid platform: ${platform}`);
      this.logger.info(`Valid platforms: ${VALID_PLATFORMS.join(', ')}`);
      process.exit(1);
    }

    this.logger.info(`Scanning ${platform}: ${target}`);

    const OmniSec = require('../../../lib/index');
    const omni = new OmniSec({ quiet: options.quiet });

    await omni.initialize(options);
    const result = await omni.runScan({
      platform,
      target,
      subPlatform: options.platform,
      tests: options.tests ? options.tests.split(',') : undefined,
      exclude: options.exclude ? options.exclude.split(',') : undefined,
      output: options.output,
      format: options.format.split(','),
      severity: options.severity,
      rateLimit: parseInt(options.rateLimit, 10),
      maxPages: parseInt(options.maxPages, 10),
      failOn: options.failOn,
      includeSubdomains: options.includeSubdomains || false,
      exclude: options.exclude,
      llm: options.llm || false,
      auth: {
        type: options.auth || 'none',
        token: options.authToken
      },
      force: options.force
    });

    this.logger.success(`${platform} scan completed`);
    // Mirror the core's --fail-on gate: print full results, THEN exit 2
    // so CI consumers get both the report and a failing pipeline.
    console.log(JSON.stringify(result, null, 2));
    if (result.gate && result.gate.triggered) {
      // NOT process.exit() - it truncates buffered stdout on pipes.
      this.logger.error(`gate triggered: findings at/above "${result.gate.fail_on}"`);
      process.exitCode = 2;
    }
  }
}

module.exports = ScanCommand;
