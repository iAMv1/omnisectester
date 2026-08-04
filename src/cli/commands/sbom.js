const { Command } = require('commander');

class SbomCommand extends Command {
  constructor(logger) {
    super('sbom');
    this.logger = logger;
    this.description('Generate Software Bill of Materials (SBOM)');
  }

  configure() {
    this
      .argument('<target>', 'Target directory or file')
      .option('-f, --format <formats>', 'SBOM formats (cyclonedx,spdx,syft,trivy)', 'cyclonedx,spdx')
      .option('-o, --output <file>', 'Output file path')
      .option('--vulns', 'Include vulnerability matching')
      .option('--epss', 'Include EPSS scores')
      .parseOptions();
  }

  async execute(target, options) {
    this.logger.info(`Generating SBOM for: ${target}`);

    const OmniSec = require('../../lib/index');
    const omni = new OmniSec();
    
    await omni.initialize(options);
    const result = await omni.runSbom({
      target,
      format: options.format.split(','),
      output: options.output,
      vulns: options.vulns,
      epss: options.epss
    });

    this.logger.success('SBOM generated');
    console.log(JSON.stringify(result, null, 2));
  }
}

module.exports = SbomCommand;

