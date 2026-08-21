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
      .option('--format <formats>', 'Report formats', 'json,html')
      .option('--severity <level>', 'Minimum severity to report', 'low')
      .option('--rate-limit <rps>', 'Requests per second', '1')
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
      auth: {
        type: options.auth || 'none',
        token: options.authToken
      },
      force: options.force
    });

    this.logger.success(`${platform} scan completed`);
    console.log(JSON.stringify(result, null, 2));
  }
}

module.exports = ScanCommand;
