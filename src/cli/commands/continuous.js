const { Command } = require('commander');

class ContinuousCommand extends Command {
  constructor(logger) {
    super('continuous');
    this.logger = logger;
    this.description('Stateful multi-target monitoring - reports only NEW findings vs last run');

    this
      .option('-t, --targets <list>', 'Comma-separated targets (required)')
      .option('--fail-on <level>', 'Exit 2 when current findings meet threshold', 'none')
      .option('--max-pages <n>', 'Agent crawl page cap per target', '25')
      .option('--rate-limit <rps>', 'Requests per second', '4')
      .option('--state <file>', 'State file path',
              require('path').join(process.env.HOME || process.env.USERPROFILE || '.',
                                   '.omnisectester', 'continuous-state.json'))
      .action((options) => this.execute(options));
  }

  async execute(options) {
    Object.assign(options, this.optsWithGlobals());
    const targets = (options.targets || '')
      .split(',').map(t => t.trim()).filter(Boolean);
    if (!targets.length) {
      this.logger.error('no targets given (-t https://a.example,https://b.example)');
      process.exit(1);
    }

    const OmniSec = require('../../../lib/index');
    const omni = new OmniSec({ quiet: true });

    const result = await omni.pythonWrapper.invoke('continuous', {
      targets: options.targets,
      failOn: options.failOn,
      maxPages: parseInt(options.maxPages, 10),
      rateLimit: parseInt(options.rateLimit, 10),
      state: options.state
    });

    if (!options.json && !options.quiet) {
      for (const r of result.results || []) {
        this.logger.info(`${r.target}: ${r.total} known findings, ${r.new} NEW`);
      }
      if ((result.new_findings || 0) > 0) {
        this.logger.warn(`${result.new_findings} NEW findings since last run`);
      }
    }
    console.log(JSON.stringify(result, null, 2));

    // gate mirrors core semantics
    if (result.gate && result.gate.triggered) {
      this.logger.error(`gate triggered: findings at/above "${result.gate.fail_on}"`);
      process.exitCode = 2;
    } else if (!result.ok) {
      process.exitCode = 1;
    }
  }
}

module.exports = ContinuousCommand;
