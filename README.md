# OmniSec Tester - npm Package

This is the npm wrapper for OmniSec Tester v2.0.0.

## What This Package Does

This npm package provides:

1. **CLI Interface** (`omnisectester` command)
2. **Python Environment Setup** (post-install script)
3. **Node.js Bridge** to Python core framework
4. **Package Management** for dependencies

## Installation

```bash
npm install -g omnisectester
```

This will:
- Install Node.js dependencies
- Run post-install script
- Check Python installation
- Clone OmniSec Tester Core (Python backend)
- Install Python dependencies
- Create default configuration
- Setup PATH

## Package Structure

```
npm-package/
+-- package.json          # npm package configuration
+-- README.md             # Package documentation
+-- LICENSE               # MIT License
+-- CHANGELOG.md          # Version history
+-- .gitignore            # Git ignore rules
+-- .npmignore            # npm publish ignore rules
+-- bin/
¦   +-- omnisectester     # CLI entry point (executable)
+-- lib/
¦   +-- index.js          # Main entry point
¦   +-- postinstall.js    # Post-install setup script
¦   +-- python-wrapper.js # Node.js to Python bridge
+-- src/
¦   +-- cli/
¦       +-- helpers/
¦       ¦   +-- logger.js
¦       ¦   +-- dependencies.js
¦       ¦   +-- environment.js
¦       ¦   +-- validators.js
¦       +-- commands/
¦           +-- engage.js
¦           +-- scan.js
¦           +-- threat-model.js
¦           +-- redteam.js
¦           +-- report.js
¦           +-- sbom.js
¦           +-- continuous.js
¦           +-- list.js
¦           +-- verify.js
¦           +-- severity.js
+-- python-wrapper/
¦   +-- __init__.py
¦   +-- cli.py
¦   +-- bridge.py
+-- templates/
    +-- config/
        +-- omnisectester.yaml
```

## Publishing

### Prerequisites

1. Create npm account at https://www.npmjs.com/
2. Login: `npm login`
3. Ensure you have publish rights to `omnisectester`

### Publish

```bash
cd npm-package
npm publish
```

### Verify

```bash
npm info omnisectester
npm install -g omnisectester
omnisectester --version
```

## How It Works

1. **User runs:** `npm install -g omnisectester`
2. **npm executes:** `postinstall.js`
3. **postinstall.js:**
   - Checks Python >= 3.10
   - Creates ~/.omnisectester/ directories
   - Installs Python dependencies
   - Clones omnisectester-core from GitHub
   - Creates default omnisectester.yaml
   - Updates PATH
4. **User runs:** `omnisectester scan web --target https://example.com`
5. **CLI (bin/omnisectester):**
   - Parses arguments
   - Loads configuration
   - Calls Python core via python-wrapper.js
6. **Python core:**
   - Executes security tests
   - Returns JSON results
7. **CLI displays results** to user

## Architecture

```
User Input (CLI)
    ?
bin/omnisectester (Node.js)
    ?
Command Parser (commander.js)
    ?
lib/index.js (OmniSecTester class)
    ?
lib/python-wrapper.js (bridge)
    ?
python-wrapper/cli.py (Python bridge)
    ?
omnisectester-core/ (Python framework)
    ?
Results (JSON)
    ?
Report Generation
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint
npm run lint

# Link for local testing
npm link
omnisectester --version
```

## Support

- Issues: https://github.com/omnisectester/omnisectester/issues
- Docs: https://omnisectester.io/docs

## License

MIT - see LICENSE file