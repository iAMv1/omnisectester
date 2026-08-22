# OmniSec Tester — agent quick reference

Security scanning CLI. Deterministic crawling agent, CVE lookups, STRIDE
threat models, CycloneDX SBOMs with OSV.dev matching. Zero-cost core;
stdlib-only Python engine ([omnisectester-core](https://github.com/iAMv1/omnisectester-core)).

## Install
```bash
npm i -g omnisectester        # CLI front door
# requires Python >= 3.10 on PATH (`py` on Windows)
```

## Command cheat-sheet

| Command | Purpose | Exit codes |
|---|---|---|
| `scan web <target>` | crawl + probe + validate + report | 0 clean · 1 fail · 2 gate |
| `severity <cve>` | live CVSS from NVD | 0 / 1 |
| `engage <target>` | scan + threat-model + report chain | 0 / 1 |
| `threat-model <t>` | observation-driven STRIDE rows | 0 / 1 |
| `sbom <dir> --vulns` | CycloneDX 1.5 + OSV.dev matching | 0 / 1 |
| `report <result.json>` | md/html/json rendering | 0 / 1 |
| `verify-tools [--strict]` | environment audit / CI gate | 0 / 1 |

## Key flags (scan)

```
--rate-limit <rps>        default 4 - keep low against production
--max-pages <n>           crawl cap (default 25)
--fail-on <severity>      exit 2 when findings meet threshold (CI gate)
--include-subdomains      widen crawl scope
--exclude <regex,regex>   skip matching URLs
--auth bearer|basic|cookie|header --auth-token <value>
--format md,html,json     write reports
--json                    machine output (all JSON commands honor this)
```

## Machine contract

- Every command prints exactly one JSON object on stdout.
- Findings: `{id, title, severity, evidence, remediation, cwe}` sorted by severity.
- Reflection findings include a `poc` field: an executable curl reproduction.
- Exit `2` = findings met `--fail-on` (pipeline should block).

## Rules of engagement

- Only scan targets the user owns or is authorized to test — confirm scope when unclear.
- Default rate limit is deliberately conservative; raise only with justification.
- `.env`/`.git` exposure findings are incident-response items, not backlog.
