const { Command } = require('commander');

class VerifyCommand extends Command {
  constructor(logger) {
    super('verify');
    this.logger = logger;
    this.description('Verify tool installations and environment');
  }

  configure() {
    this
      .option('--fix', 'Attempt to fix missing dependencies')
      .option('--json', 'Output in JSON format')
      .parseOptions();
  }

  async execute(options) {
    const OmniSec = require('../../lib/index');
    const omni = new OmniSec();
    
    await omni.initialize(options);
    const result = await omni.verifyTools({
      fix: options.fix
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n🔍 OmniSec Tester - Environment Verification\n');
      console.log(`Python: ${result.python.version} ${result.python.valid ? '✅' : '❌'}`);
      console.log(`Core Package: ${result.core.installed ? '✅' : '❌'}`);
      console.log(`Tools: ${result.tools.installed}/${result.tools.total} installed\n`);
      
      console.log('Tools Status:');
      for (const [tool, status] of Object.entries(result.tools.details)) {
        const icon = status.installed ? '✅' : '❌';
        const version = status.version ? ` (${status.version})` : '';
        console.log(`  ${icon} ${tool}${version}`);
      }

      if (result.issues.length > 0) {
        console.log('\n⚠️  Issues:');
        result.issues.forEach(issue => {
          console.log(`  - ${issue}`);
        });
      }
    }
  }
}

module.exports = VerifyCommand;

