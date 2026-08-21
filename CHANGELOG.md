# Changelog

All notable changes to OmniSec Tester will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.1.0] - 2026-08-22

### Fixed
- Every CLI command was a silent no-op: command classes defined `configure()`/`execute()`
  but never registered arguments or an action handler with commander. All 10 commands
  are now wired and executable.
- `lib/index.js` required nonexistent `src/core/config` - crashed every `initialize()`.
  Now loads config via `src/cli/helpers/validators`.
- All command files used wrong relative require paths (`../../lib/index` from
  `src/cli/commands`) - MODULE_NOT_FOUND on execution.
- Logger `warn`/`error` reassigned themselves (infinite recursion / stack overflow on
  first use). Now bind originals before wrapping.
- Helpers imported `{ initLogger }` as a logger instance - TypeError on any log call.
  Logger module now exports a lazy singleton.
- `list`, `verify-tools`, `severity` called methods that did not exist on the core
  class (`list()`, `verifyTools()`, `getSeverity()`). Implemented locally -
  all three now work without the Python core installed.
- Global CLI options (`--config`, `--quiet`, `--authorization`) never reached command
  handlers; commands now merge `optsWithGlobals()`.
- Python bridge dropped boolean-false options, silently re-enabling tests the user
  excluded (`--no-threat-model` etc). Options now forward losslessly with kebab-case
  flags; PYTHONPATH prepends instead of clobbering.
- Config schema rejected valid configs: version pattern pinned to exact `2.0.0`,
  ajv strict-mode crashed on unknown `date-time`/`uri` formats.
- `verify-tools` mojibake output on Windows replaced with clean ASCII status marks.
- Version mismatch: banner/postinstall hardcoded 2.0.0 while package said 2.0.4.
  Version now sourced from package.json everywhere.

### Changed
- Dependencies pruned from 18 to 7 runtime packages (11 unused removed);
  node_modules shrank 47 MB -> 16 MB, install time ~5 min -> <40 s.
- chalk@5/ora@8/inquirer@9/node-fetch@3 (ESM-only) replaced with CJS builds,
  honoring the declared Node >=18 engine range.
- Startup optimized: heavy modules (winston/ajv/yaml/fs-extra) load lazily;
  banner skipped for `-h`/`-v`/`--quiet`. Command startup measured 42-52% faster
  (e.g. `list` 372 ms -> 178 ms).
- Environment/tool checks run in parallel (`Promise.all`); `.gitignore` written only
  when missing; chmod uses fs.promises instead of spawning shells.
- Python process output capture capped at 10 MB (memory-safety).

### Added
- `verify-tools --strict`: exit 1 when required components are missing (CI gate).
- `verify-tools --fix`: attempts core-package repair instead of silently ignoring.
- `severity <cve>`: live CVSS lookup via NVD API with timeout.
- Test suite rewritten: 15 behavioral assertions driving the real binary
  (exit codes, JSON shapes, failure paths) replacing file-existence checks.

## [2.0.0] - 2026-04-08

### Added
- Complete threat modeling (STRIDE, PASTA, MITRE ATT&CK)
- 130+ vulnerability categories (up from 50)
- Business logic testing (race conditions, state machines, financial flows)
- Supply chain security (SBOM, dependency confusion, CI/CD poisoning)
- Cloud security (AWS, Azure, GCP)
- AI/LLM security (prompt injection, jailbreaks, RAG poisoning)
- Hardware/firmware testing (UEFI, TEE, JTAG, side-channel)
- Post-exploitation simulation (credential dumping, lateral movement)
- Memory corruption testing (AFL++, LibAFL, Jazzer, Nyx)
- 3-pillar severity scoring (CVSS 4.0 + EPSS + SSVC)
- Compliance mapping (PCI DSS, NIST 800-53, SOC 2, ISO 27001)
- Continuous testing (CI/CD integration, scheduled scans)
- Stealth/evasion testing (WAF, EDR, sandbox evasion)
- npm package distribution

### Changed
- Auth testing is now MANDATORY (was opt-in)
- False positive rate target improved to <5% (was 15%)
- Severity rating system completely rebuilt

### Fixed
- All 15 critical gaps identified in CRITIQUE.md