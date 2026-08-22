---
name: omnisectester-scan
description: >
  Run security scans with the omnisectester CLI (npm package
  `omnisectester`): web surface scanning, CVE severity lookup, STRIDE
  threat modeling, CycloneDX SBOM. Use when the user asks to scan a web
  app they own, check a CVE's severity, generate a threat model or SBOM,
  or set up CI security gating.
---

# OmniSec Tester - scanning workflows

## Prerequisites

- `omnisectester` on PATH (`npm i -g omnisectester`)
- Python 3.10+ available (`py` on Windows, `python3` elsewhere) for scan/engage/sbom
- Only run against systems you own or have written authorization to test

## Commands

```bash
# Live CVSS severity for any CVE (no Python needed)
omnisectester severity CVE-2021-44228 --json

# Web surface scan: security headers, TLS, sensitive paths, reflected XSS.
# Rate-limited; JSON to stdout; exit 2 when findings meet --fail-on.
omnisectester scan web https://your-app.example --rate-limit 2 --fail-on high

# One-shot: scan + STRIDE threat model + markdown report
omnisectester engage https://your-app.example --format md

# SBOM from package manifests (CycloneDX 1.5)
omnisectester sbom ./project-dir

# Environment audit / CI gate (fails when required components missing)
omnisectester verify-tools --strict
```

## Reading results

Findings array is severity-sorted; each item:
`{id, title, severity, evidence, remediation, cwe}`.

| Exit code | Meaning |
|---|---|
| 0 | clean (or no findings at/above threshold) |
| 1 | scan/command failure |
| 2 | findings met `--fail-on` threshold |

## CI gate recipe

```yaml
- run: omnisectester scan web "$TARGET" --rate-limit 2 --fail-on critical
```

Exit 2 blocks the pipeline. Start with `--fail-on critical`, tighten later.

## Rules of engagement

- Never scan third-party hosts without authorization.
- Keep `--rate-limit` low (1-5 rps) against production.
- Treat `.env`/`.git` exposure findings as incident response, not backlog.
