const { Command } = require('commander');

class ListCommand extends Command {
  constructor(logger) {
    super('list');
    this.logger = logger;
    this.description('List available tests, platforms, or tools');

    this
      .option('-p, --platform <name>', 'List tests for specific platform')
      .option('-t, --taxonomy', 'Show vulnerability taxonomy')
      .option('--tools', 'List installed tools')
      .option('--compliance', 'List compliance frameworks')
      .option('--mitre', 'List MITRE ATT&CK techniques')
      .action((options) => this.execute(options));
  }

  async execute(options) {
    // commander passes only local options here - merge in globals (--config, --quiet, ...)
    Object.assign(options, this.optsWithGlobals());
    const OmniSec = require('../../../lib/index');
    const omni = new OmniSec({ quiet: true });

    // list() is local-only: no Python core or full init required.
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
