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
      .option('--auth <type>', 'Auth type (bearer, basic, cookie, header)')
      .option('--auth-token <value>', 'Auth token value')
      .option('--login-url <url>', 'Form-login endpoint to POST before scanning')
      .option('--login-data <data>', 'URL-encoded login body')
      .option('--suppress <ids>', 'Comma-separated rule IDs to drop (FP suppression)')
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
          // Flat keys - Python expects --auth <type> --auth-token <v>.
          auth: options.auth || undefined,
          authToken: options.authToken,
          loginUrl: options.loginUrl,
          loginData: options.loginData,
          suppress: options.suppress
        });
        allFindings = allFindings.concat(result.findings || []);
        if (result.gate && result.gate.triggered) gateTriggered = true;
        if (options.json) console.log(JSON.stringify(result));
        else {
          const st = result.stats || {};
          this.logger.info(`${target}: ${st.total || 0} findings ` +
            `(critical ${st.critical || 0}, high ${st.high || 0})`);
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
