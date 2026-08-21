const { Command } = require('commander');

class ThreatModelCommand extends Command {
  constructor(logger) {
    super('threat-model');
    this.logger = logger;
    this.description('Generate threat model (MANDATORY Step 0 for all engagements)');

    this
      .argument('<target>', 'Target URL or system to model')
      .option('--adversary <profiles>', 'Comma-separated adversary profiles', 'APT29')
      .option('--frameworks <list>', 'Threat modeling frameworks', 'STRIDE,PASTA,ATTACK')
      .option('--output <file>', 'Output file for threat model', './reports/threat-model.json')
      .option('--format <format>', 'Output format (json, yaml, html)', 'json')
      .action((target, options) => this.execute(target, options));
  }

  async execute(target, options) {
    // commander passes only local options here - merge in globals (--config, --quiet, ...)
    Object.assign(options, this.optsWithGlobals());
    this.logger.info(`Generating threat model for: ${target}`);
    this.logger.info(`Adversary profiles: ${options.adversary}`);
    this.logger.info(`Frameworks: ${options.frameworks}`);

    const OmniSec = require('../../../lib/index');
    const omni = new OmniSec({ quiet: options.quiet });

    await omni.initialize(options);
    const result = await omni.runThreatModel({
      target,
      adversary: options.adversary.split(','),
      frameworks: options.frameworks.split(','),
      output: options.output,
      format: options.format
    });

    this.logger.success('Threat model generated');
    console.log(JSON.stringify(result, null, 2));
  }
}

module.exports = ThreatModelCommand;
