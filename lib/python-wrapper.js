/**
 * Python Wrapper - Bridges Node.js CLI to Python core
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

class PythonWrapper {
  constructor() {
    this.homeDir = process.env.HOME || process.env.USERPROFILE;
    this.installDir = path.join(this.homeDir, '.omnisectester');
    this.corePath = path.join(this.installDir, 'omnisectester-core');
    this.pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  }

  async invoke(command, options = {}) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.corePath, 'omnisectester', 'cli.py');

      // Ensure core package exists
      if (!fs.existsSync(scriptPath)) {
        return reject(new Error('Core package not installed. Run: omnisectester verify-tools'));
      }

      const args = [scriptPath, command, '--json'];

      // Forward options losslessly:
      //   true            -> --key          (store_true style)
      //   false           -> --key false    (explicit; negation flags like
      //                      --no-threat-model must reach the Python layer)
      //   other non-null  -> --key value
      // camelCase keys become kebab-case for argparse compatibility.
      const kebab = (key) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      for (const [key, value] of Object.entries(options)) {
        if (value === undefined || value === null) continue;
        const flag = `--${kebab(key)}`;
        if (value === true) {
          args.push(flag);
        } else {
          args.push(flag, String(value));
        }
      }

      const python = spawn(this.pythonPath, args, {
        cwd: this.corePath,
        env: {
          ...process.env,
          // Prepend, never clobber, an existing PYTHONPATH.
          PYTHONPATH: process.env.PYTHONPATH
            ? `${this.corePath}${path.delimiter}${process.env.PYTHONPATH}`
            : this.corePath,
          OMNI_HOME: this.installDir
        }
      });

      let stdout = '';
      let stderr = '';
      // Cap captured output: a runaway Python process must not OOM the CLI.
      const MAX_CAPTURE = 10 * 1024 * 1024; // 10 MB

      python.stdout.on('data', (data) => {
        if (stdout.length < MAX_CAPTURE) stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        if (stderr.length < MAX_CAPTURE) stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Python process exited with code ${code}: ${stderr}`));
        }

        try {
          // Try to parse JSON output
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          // If not JSON, return raw output
          resolve({ raw: stdout, parsed: false });
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  async checkPython() {
    return new Promise((resolve) => {
      const python = spawn(this.pythonPath, ['--version']);
      let output = '';

      const done = (code) => {
        resolve({
          available: code === 0,
          version: output.trim()
        });
      };

      // Python 2 prints --version to stderr; capture both.
      python.stdout.on('data', (data) => { output += data.toString(); });
      python.stderr.on('data', (data) => { output += data.toString(); });

      python.on('close', done);
      // Binary not found / not executable - resolve instead of crashing.
      python.on('error', () => done(-1));
    });
  }

  async installRequirements() {
    const requirementsPath = path.join(this.installDir, 'requirements.txt');
    
    return new Promise((resolve, reject) => {
      const pip = spawn('pip', ['install', '-r', requirementsPath]);
      let stdout = '';
      let stderr = '';

      pip.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      pip.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      pip.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`pip install failed: ${stderr}`));
        }
        resolve(stdout);
      });
    });
  }

  getPythonPath() {
    return this.pythonPath;
  }

  getCorePath() {
    return this.corePath;
  }

  getInstallDir() {
    return this.installDir;
  }
}

module.exports = new PythonWrapper();

