/**
 * Python Wrapper - Bridges Node.js CLI to Python core
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const os = require('os');

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
      
      // Add options as CLI arguments
      for (const [key, value] of Object.entries(options)) {
        if (value === true) {
          args.push(`--${key}`);
        } else if (value !== false && value !== undefined && value !== null) {
          args.push(`--${key}`, String(value));
        }
      }

      const python = spawn(this.pythonPath, args, {
        cwd: this.corePath,
        env: {
          ...process.env,
          PYTHONPATH: this.corePath,
          OMNI_HOME: this.installDir
        }
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
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

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.on('close', (code) => {
        resolve({
          available: code === 0,
          version: output.trim()
        });
      });
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

