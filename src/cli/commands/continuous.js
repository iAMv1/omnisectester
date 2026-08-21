const { Command } = require('commander');

class ContinuousCommand extends Command {
  constructor(logger) {
    super('continuous');
    this.logger = logger;
    this.description('Run continuous security testing (CI/CD mode)');

    this
      .option('-c, --config <file>', 'Continuous testing config file', './continuous.yaml')
      .option('--schedule <cron>', 'Cron schedule', '0 2 * * *')
      .option('--fail-on <levels>', 'Fail on severity levels', 'critical,high')
      .option('--notify <channels>', 'Notification channels (email,slack,webhook)')
      .option('--dry-run', 'Show what would be tested without running')
      .action((options) => this.execute(options));
  }

  async execute(options) {
    // commander passes only local options here - merge in globals (--config, --quiet, ...)
    Object.assign(options, this.optsWithGlobals());
    this.logger.info('Starting continuous security testing...');

    const OmniSec = require('../../../lib/index');
    const omni = new OmniSec({ quiet: options.quiet });

    await omni.initialize(options);
    const result = await omni.runContinuous({
      config: options.config,
      schedule: options.schedule,
      failOn: options.failOn.split(','),
      notify: options.notify ? options.notify.split(',') : [],
      dryRun: options.dryRun
    });

    this.logger.success('Continuous testing completed');
    console.log(JSON.stringify(result, null, 2));
  }
}

module.exports = ContinuousCommand;
