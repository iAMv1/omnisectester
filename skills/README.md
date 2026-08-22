# OmniSec Tester skills (agent-ready)

Install these so coding agents (Claude Code, Cursor, Codex, or any
SKILL.md-compatible harness) can drive omnisectester:

```shell
npx skills add iAMv1/omnisectester
```

| Skill | Purpose |
|---|---|
| `omnisectester-scan` | run web scans, severity lookups, threat models, SBOMs; read results; wire CI gates |

## For agents

- CLI reference: `omnisectester --help`, per-command `--help`
- All machine commands emit a single JSON object on stdout
- Exit codes: `0` clean · `1` failure · `2` findings met `--fail-on` threshold
- Only scan targets the user owns or is authorized to test - confirm scope if unclear
