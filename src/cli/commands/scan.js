const { Command } = require('commander');

class ScanCommand extends Command {
  constructor(logger) {
    super('scan');
    this.logger = logger;
    this.description('Scan specific platform or attack surface');
    this.usage('[options] <platform>');
  }

  configure() {
    this
      .argument('<platform>', 'Platform to scan: web, extension, desktop, mobile, cloud, supply-chain, cicd, ai, firmware')
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
      .parseOptions();
  }

  async execute(platform, target, options) {
    this.logger.info(`Scanning ${platform}: ${target}`);
    
    const validPlatforms = ['web', 'extension', 'desktop', 'mobile', 'cloud', 'supply-chain', 'cicd', 'ai', 'firmware'];
    if (!validPlatforms.includes(platform)) {
      this.logger.error(`Invalid platform: ${platform}`);
      this.logger.info(`Valid platforms: ${validPlatforms.join(', ')}`);
      process.exit(1);
    }

    const OmniSec = require('../../lib/index');
    const omni = new OmniSec();
    
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
      rateLimit: parseInt(options.rateLimit),
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

