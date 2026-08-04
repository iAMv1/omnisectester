const { Command } = require('commander');

class ListCommand extends Command {
  constructor(logger) {
    super('list');
    this.logger = logger;
    this.description('List available tests, platforms, or tools');
  }

  configure() {
    this
      .option('-p, --platform <name>', 'List tests for specific platform')
      .option('-t, --taxonomy', 'Show vulnerability taxonomy')
      .option('--tools', 'List installed tools')
      .option('--compliance', 'List compliance frameworks')
      .option('--mitre', 'List MITRE ATT&CK techniques')
      .parseOptions();
  }

  async execute(options) {
    const OmniSec = require('../../lib/index');
    const omni = new OmniSec();
    
    await omni.initialize(options);
    const result = await omni.list({
      platform: options.platform,
      taxonomy: options.taxonomy,
      tools: options.tools,
      compliance: options.compliance,
      mitre: options.mitre
    });

    console.log(JSON.stringify(result, null, 2));
  }
}

module.exports = ListCommand;

