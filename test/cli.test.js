/**
 * OmniSec Tester - CLI Test Suite
 * Runs the real binary as a subprocess and asserts on behavior:
 * exit codes, output shape, and failure paths.
 *
 * Zero external dependencies: node assert + child_process only.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'omnisectester');

let passed = 0;
let failed = 0;
const failures = [];

function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd: ROOT,
    timeout: 60000,
    encoding: 'utf8',
    ...opts
  });
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (error) {
    failed++;
    failures.push({ name, error });
    console.log(`  FAIL: ${name}`);
    console.log(`        ${error.message.split('\n')[0]}`);
  }
}

console.log('== OmniSec Tester - CLI Tests ==\n');

// --- Static checks ---

test('bin/omnisectester exists', () => {
  assert.ok(fs.existsSync(BIN), 'binary not found');
});

test('package.json valid', () => {
  const pkg = require('../package.json');
  assert.strictEqual(pkg.name, 'omnisectester');
  assert.ok(/^\d+\.\d+\.\d+/.test(pkg.version));
});

test('lib entry files exist', () => {
  for (const file of ['index.js', 'postinstall.js', 'python-wrapper.js']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib', file)), `missing lib/${file}`);
  }
});

test('all command modules load and register actions', () => {
  const commands = ['engage', 'scan', 'threat-model', 'redteam', 'report', 'sbom', 'continuous', 'list', 'verify', 'severity'];
  for (const cmd of commands) {
    const CmdClass = require(`../src/cli/commands/${cmd}`);
    const instance = new CmdClass(console);
    // A command with no action handler silently does nothing when invoked -
    // this regression killed every command in v2.0.x.
    assert.ok(typeof instance._actionHandler === 'function' || instance.parent === null,
      `${cmd} has no action handler`);
  }
});

test('logger warn/error do not recurse infinitely', () => {
  const { initLogger } = require('../src/cli/helpers/logger');
  const logger = initLogger();
  logger.transports[0].silent = true; // keep test output clean
  // v2.0.x reassigned logger.warn to call itself -> RangeError on first use.
  for (let i = 0; i < 50; i++) {
    logger.warn('warn probe');
    logger.error('error probe');
    logger.success('success probe');
  }
  assert.ok(true);
});

// --- Subprocess behavior ---

test('--version exits 0 with clean semver output', () => {
  const r = runCli(['--version']);
  assert.strictEqual(r.status, 0, `exit ${r.status}: ${r.stderr}`);
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('--version skips banner', () => {
  const r = runCli(['--version']);
  assert.ok(!r.stdout.includes('╔'), 'banner leaked into version output');
});

test('--help lists all 10 commands', () => {
  const r = runCli(['--help']);
  assert.strictEqual(r.status, 0);
  for (const cmd of ['engage', 'scan', 'threat-model', 'redteam', 'report', 'sbom', 'continuous', 'list', 'verify-tools', 'severity']) {
    assert.ok(r.stdout.includes(cmd), `help missing "${cmd}"`);
  }
});

test('no args shows help, exits 0', () => {
  const r = runCli([]);
  assert.strictEqual(r.status, 0);
  assert.ok(r.stdout.includes('Usage'));
});

test('list --taxonomy returns valid JSON with categories', () => {
  const r = runCli(['list', '--taxonomy']);
  assert.strictEqual(r.status, 0, `exit ${r.status}: ${r.stderr}`);
  const jsonStart = r.stdout.indexOf('{');
  assert.notStrictEqual(jsonStart, -1, 'no JSON in output');
  const data = JSON.parse(r.stdout.slice(jsonStart));
  assert.ok(data.count > 0, 'taxonomy empty');
  assert.ok(Array.isArray(data.categories));
});

test('list --tools returns tool inventory', () => {
  const r = runCli(['list', '--tools']);
  assert.strictEqual(r.status, 0, `exit ${r.status}: ${r.stderr}`);
  const jsonStart = r.stdout.indexOf('{');
  const data = JSON.parse(r.stdout.slice(jsonStart));
  assert.ok(data.tools && typeof data.tools === 'object');
});

test('verify-tools --json runs without Python core installed', () => {
  const r = runCli(['verify-tools', '--json']);
  assert.strictEqual(r.status, 0, `exit ${r.status}: ${r.stderr}`);
  const jsonStart = r.stdout.indexOf('{');
  const data = JSON.parse(r.stdout.slice(jsonStart));
  assert.ok('python' in data);
  assert.ok('tools' in data);
  assert.ok(Array.isArray(data.issues));
});

test('scan rejects invalid platform (exit 1)', () => {
  const r = runCli(['scan', 'bogus-platform', 'http://localhost']);
  assert.strictEqual(r.status, 1);
});

test('redteam requires --authorization (exit 1)', () => {
  const r = runCli(['redteam', 'http://localhost']);
  assert.strictEqual(r.status, 1);
});

test('unknown command fails cleanly', () => {
  const r = runCli(['definitely-not-a-command']);
  assert.notStrictEqual(r.status, 0);
});

console.log(`\n== Results: ${passed} passed, ${failed} failed ==\n`);

if (failed > 0) {
  process.exit(1);
}
