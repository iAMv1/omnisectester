const { Command } = require('commander');

class SeverityCommand extends Command {
  constructor(logger) {
    super('severity');
    this.logger = logger;
    this.description('Lookup severity score for CVE');

    this
      .argument('<cve>', 'CVE ID (e.g., CVE-2024-XXXXX)')
      .option('--epss', 'Include EPSS score')
      .option('--ssvc', 'Include SSVC classification')
      .option('--json', 'Output in JSON format')
      .action((cve, options) => this.execute(cve, options));
  }

  async execute(cve, options) {
    // commander passes only local options here - merge in globals (--config, --quiet, ...)
    Object.assign(options, this.optsWithGlobals());
    const OmniSec = require('../../../lib/index');
    // Severity lookup hits NVD directly; no Python core needed.
    const omni = new OmniSec({ quiet: true });
    const result = await omni.getSeverity(cve);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\n${cve} Severity Analysis\n`);
    console.log(`CVSS Score: ${result.cvss.base_score ?? 'N/A'} (${result.cvss.severity})`);
    console.log(`EPSS Score: ${result.epss.percentile ?? 'N/A'}`);
    console.log(`SSVC: ${result.ssvc.exploitation} / ${result.ssvc.utility}`);
    console.log(`Final Severity: ${result.final_severity}\n`);
  }
}

module.exports = SeverityCommand;
