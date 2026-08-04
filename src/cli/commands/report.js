const { Command } = require('commander');

class ReportCommand extends Command {
  constructor(logger) {
    super('report');
    this.logger = logger;
    this.description('Generate reports from scan results');
  }

  configure() {
    this
      .argument('<input>', 'Input file (JSON scan results)')
      .option('-o, --output <dir>', 'Output directory', './reports')
      .option('-f, --format <formats>', 'Report formats (json,html,pdf,sarif,attack_nav,junit)', 'all')
      .option('--mitre-attack', 'Generate MITRE ATT&CK Navigator layer')
      .option('--compliance', 'Include compliance gap analysis')
      .option('--attack-paths', 'Include attack path visualization')
      .option('--template <name>', 'Custom report template')
      .parseOptions();
  }

  async execute(input, options) {
    this.logger.info(`Generating reports from: ${input}`);

    const OmniSec = require('../../lib/index');
    const omni = new OmniSec();
    
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
    
    console.log('Generated files:');
    result.files.forEach(file => {
      console.log(`  - ${file}`);
    });
  }
}

module.exports = ReportCommand;

