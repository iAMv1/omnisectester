const { Command } = require('commander');

class RedTeamCommand extends Command {
  constructor(logger) {
    super('redteam');
    this.logger = logger;
    this.description('Run full red team engagement (kill chain simulation)');

    this
      .argument('<target>', 'Target to attack')
      .option('-o, --output <dir>', 'Output directory', './reports/redteam')
      .option('-a, --authorization <ref>', 'Authorization document reference')
      .option('--adversary <profile>', 'Adversary profile to simulate', 'APT29')
      .option('--mode <mode>', 'Engagement mode', 'red_team')
      .option('--kill-switch', 'Enable emergency stop')
      .option('--no-cleanup', 'Skip post-engagement cleanup (NOT RECOMMENDED)')
      .option('--c2 <type>', 'C2 infrastructure type (dns, https, cdns)')
      .action((target, options) => this.execute(target, options));
  }

  async execute(target, options) {
    // commander passes only local options here - merge in globals (--config, --quiet, ...)
    Object.assign(options, this.optsWithGlobals());
    this.logger.warn('RED TEAM MODE - This simulates actual attacks');
    this.logger.info(`Target: ${target}`);
    this.logger.info(`Adversary: ${options.adversary}`);
    this.logger.info(`Mode: ${options.mode}`);

    if (!options.authorization) {
      this.logger.error('Authorization reference required for red team mode');
      this.logger.info('Use: --authorization "DOC-REF-123"');
      process.exit(1);
    }

    const OmniSec = require('../../../lib/index');
    const omni = new OmniSec({ quiet: options.quiet });

    await omni.initialize(options);
    const result = await omni.runRedTeam({
      target,
      adversary: options.adversary,
      mode: options.mode,
      c2: options.c2,
      killSwitch: options.killSwitch,
      cleanup: options.cleanup !== false,
      output: options.output
    });

    this.logger.success('Red team engagement completed');
    this.logger.info(`Access gained: ${result.initial_access ? 'YES' : 'NO'}`);
    if (result.objectives_total !== undefined) {
      this.logger.info(`Objectives achieved: ${result.objectives_achieved}/${result.objectives_total}`);
    }

    console.log(JSON.stringify(result, null, 2));
  }
}

module.exports = RedTeamCommand;
