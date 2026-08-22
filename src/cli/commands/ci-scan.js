const { Command } = require('commander');

class CiScanCommand extends Command {
  constructor(logger) {
    super('ci-scan');
    this.logger = logger;
    this.description('CI gate: scan targets, exit 2 when findings meet threshold');

    this
      .option('-t, --targets <list>', 'Comma-separated targets (required)')
      .option('--fail-on <level>', 'Severity threshold that blocks the build',
              'critical')
      .option('--max-pages <n>', 'Agent crawl page cap per target', '25')
      .option('--rate-limit <rps>', 'Requests per second', '4')
      .option('--auth bearer|basic|cookie|header', 'Auth type')
      .option('--auth-token <value>', 'Auth token value')
      .option('--json', 'JSON output only')
      .action((options) => this.execute(options));
  }

  async execute(options) {
    Object.assign(options, this.optsWithGlobals());
    const targets = (options.targets || '')
      .split(',').map(t => t.trim()).filter(Boolean);
    if (!targets.length) {
      this.logger.error('no targets given (-t https://app.example)');
      process.exit(1);
    }

    const OmniSec = require('../../../lib/index');
    const omni = new OmniSec({ quiet: true });

    let allFindings = [];
    let gateTriggered = false;
    for (const target of targets) {
      try {
        const result = await omni.runScan({
          platform: 'web',
          target,
          maxPages: parseInt(options.maxPages, 10),
          failOn: options.failOn,
          rateLimit: parseInt(options.rateLimit, 10),
          authType: options.auth || 'none',
          authToken: options.authToken
        });
        allFindings = allFindings.concat(result.findings || []);
        if (result.gate && result.gate.triggered) gateTriggered = true;
        if (options.json) console.log(JSON.stringify(result));
        else {
          this.logger.info(`${target}: ${result.stats.total} findings ` +
            `(critical ${result.stats.critical}, high ${result.stats.high})`);
        }
      } catch (error) {
        this.logger.error(`${target}: ${error.message}`);
        process.exitCode = 1;
      }
    }

    if (gateTriggered) {
      this.logger.error(`gate triggered: findings at/above "${options.failOn}"`);
      process.exitCode = 2;
    } else {
      this.logger.success(`clean: ${allFindings.length} findings below threshold`);
    }
  }
}

module.exports = CiScanCommand;
