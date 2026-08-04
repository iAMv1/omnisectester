const { Command } = require('commander');

class SeverityCommand extends Command {
  constructor(logger) {
    super('severity');
    this.logger = logger;
    this.description('Lookup severity score for CVE');
  }

  configure() {
    this
      .argument('<cve>', 'CVE ID (e.g., CVE-2024-XXXXX)')
      .option('--epss', 'Include EPSS score')
      .option('--ssvc', 'Include SSVC classification')
      .option('--json', 'Output in JSON format')
      .parseOptions();
  }

  async execute(cve, options) {
    const OmniSec = require('../../lib/index');
    const omni = new OmniSec();
    
    await omni.initialize(options);
    const result = await omni.getSeverity(cve, {
      epss: options.epss,
      ssvc: options.ssvc
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n${cve} Severity Analysis\n`);
      console.log(`CVSS 4.0 Score: ${result.cvss.base_score} (${result.cvss.severity})`);
      console.log(`EPSS Score: ${result.epss.percentile} (${result.epss.decile}/10)`);
      console.log(`SSVC: ${result.ssvc.exploitation} / ${result.ssvc.utility}`);
      console.log(`Final Severity: ${result.final_severity}\n`);
    }
  }
}

module.exports = SeverityCommand;

