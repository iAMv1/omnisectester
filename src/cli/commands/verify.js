const { Command } = require('commander');

class VerifyCommand extends Command {
  constructor(logger) {
    super('verify-tools');
    this.logger = logger;
    this.description('Verify tool installations and environment');

    this
      .option('--fix', 'Attempt to repair the core package installation')
      .option('--json', 'Output in JSON format')
      .option('--strict', 'Exit 1 when required components are missing (for CI gates)')
      .action((options) => this.execute(options));
  }

  async execute(options) {
    // commander passes only local options here - merge in globals (--config, --quiet, ...)
    Object.assign(options, this.optsWithGlobals());
    const OmniSec = require('../../../lib/index');
    // verify-tools must work without the Python core installed,
    // so run the aggregate check directly instead of omni.initialize().
    const omni = new OmniSec({ quiet: true });
    const result = await omni.verifyTools({ fix: options.fix });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log('\n== OmniSec Tester - Environment Verification ==\n');
    console.log(`Python: ${result.python.version} ${result.python.valid ? '[OK]' : '[MISSING]'}`);
    console.log(`Core Package: ${result.core.installed ? '[OK]' : '[NOT INSTALLED]'}`);
    console.log(`Tools: ${result.tools.installed}/${result.tools.total} installed\n`);

    console.log('Tools Status:');
    for (const [tool, status] of Object.entries(result.tools.details)) {
      const icon = status.installed ? '[OK]' : '[--]';
      const version = status.version ? ` (${status.version})` : '';
      console.log(`  ${icon} ${tool}${version}`);
    }

    if (result.issues.length > 0) {
      console.log('\nIssues:');
      result.issues.forEach((issue) => console.log(`  - ${issue}`));
    }

    // --strict: CI gate - fail when required components are missing.
    if (options.strict && result.issues.length > 0) {
      process.exit(1);
    }
  }
}

module.exports = VerifyCommand;
