const { Command } = require('commander');

class ReportCommand extends Command {
  constructor(logger) {
    super('report');
    this.logger = logger;
    this.description('Generate reports from scan results');

    this
      .argument('<input>', 'Input file (JSON scan results)')
      .option('-o, --output <dir>', 'Output directory', './reports')
      .option('-f, --format <formats>', 'Report formats (json,html,pdf,sarif,attack_nav,junit)', 'all')
      .option('--mitre-attack', 'Generate MITRE ATT&CK Navigator layer')
      .option('--compliance', 'Include compliance gap analysis')
      .option('--attack-paths', 'Include attack path visualization')
      .option('--template <name>', 'Custom report template')
      .action((input, options) => this.execute(input, options));
  }

  async execute(input, options) {
    // commander passes only local options here - merge in globals (--config, --quiet, ...)
    Object.assign(options, this.optsWithGlobals());
    this.logger.info(`Generating reports from: ${input}`);

    const OmniSec = require('../../../lib/index');
    const omni = new OmniSec({ quiet: options.quiet });

    await omni.initialize(options);
    const result = await omni.generateReport({
      input,
      output: options.output,
      format: options.format === 'all'
        ? ['json', 'html', 'pdf', 'sarif', 'attack_nav', 'junit']
        : options.format.split(','),
      mitreAttack: options.mitreAttack,
      compliance: options.compliance,
      attackPaths: options.attackPaths,
      template: options.template
    });

    this.logger.success('Reports generated');
    this.logger.info(`Output directory: ${options.output}`);

    if (result && Array.isArray(result.files)) {
      console.log('Generated files:');
      result.files.forEach((file) => console.log(`  - ${file}`));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  }
}

module.exports = ReportCommand;
