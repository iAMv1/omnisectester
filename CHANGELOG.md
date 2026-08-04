# Changelog

All notable changes to OmniSec Tester will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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