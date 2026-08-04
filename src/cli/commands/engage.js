const { Command } = require('commander');

class EngageCommand extends Command {
  constructor(logger) {
    super('engage');
    this.logger = logger;
    this.description('Run a full security engagement across all attack surfaces');
    this.usage('[options] <target>');
  }

  configure() {
    this
      .argument('<target>', 'Target URL, file path, or identifier')
      .option('-m, --mode <mode>', 'Engagement mode', 'gray_box')
      .option('-o, --output <dir>', 'Output directory', './reports')
      .option('-a, --authorization <ref>', 'Authorization document reference')
      .option('--adversary <profiles>', 'Comma-separated adversary profiles (APT29,APT41,FIN7)', 'APT29')
      .option('--no-threat-model', 'Skip threat modeling (NOT RECOMMENDED)')
      .option('--no-business-logic', 'Skip business logic testing')
      .option('--no-supply-chain', 'Skip supply chain testing')
      .option('--no-cloud', 'Skip cloud security testing')
      .option('--no-ai', 'Skip AI/ML security testing')
      .option('--no-hardware', 'Skip hardware/firmware testing')
      .option('--no-post-exploit', 'Skip post-exploitation simulation')
      .option('--dos', 'Include DoS testing (requires --force)')
      .option('--force', 'Enable destructive tests')
      .option('--kill-switch', 'Enable emergency stop')
      .option('--format <formats>', 'Report formats (comma-separated)', 'json,html,pdf')
      .option('--compliance <frameworks>', 'Compliance frameworks to map', 'pci_dss,nist_800_53,soc2,iso27001')
      .parseOptions();
  }

  async execute(target, options) {
    this.logger.info(`Starting full engagement on: ${target}`);
    this.logger.info(`Mode: ${options.mode}`);

    if (options.dos && !options.force) {
      this.logger.error('DoS testing requires --force flag');
      process.exit(1);
    }

    const OmniSec = require('../../lib/index');
    const omni = new OmniSec();
    
    await omni.initialize(options);
    const result = await omni.runEngagement({
      target,
      mode: options.mode,
      authorization: options.authorization,
      adversary: options.adversary,
      threatModel: options.threatModel !== false,
      businessLogic: options.businessLogic !== false,
      supplyChain: options.supplyChain !== false,
      cloudSecurity: options.cloud !== false,
      aiSecurity: options.ai !== false,
      hardware: options.hardware !== false,
      postExploit: options.postExploit !== false,
      dos: options.dos,
      output: options.output,
      format: options.format.split(','),
      compliance: options.compliance.split(',')
    });

    this.logger.success('Engagement completed');
    console.log(JSON.stringify(result, null, 2));
  }
}

module.exports = EngageCommand;

