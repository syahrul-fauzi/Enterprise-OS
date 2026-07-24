# EOS Pattern Agent
## Purpose
Analyzes validated observations from the evidence registry and detects potential pattern candidates (without promoting them to assets)!
## Tasks
1. Read validated observations from evidence registry
2. Scan observation files for pattern keywords
3. Detect repeating patterns
4. Generate pattern candidate report
5. Add candidates to extraction candidates (pending further validation)
## Operating Principles
- Follows [Agent Contract](../../governance/agent-contract.md)
- No asset promotion or extraction
- Only detects patterns
- All pattern candidates documented
## Running the Agent
```bash
# From root
python3 agents/pattern-agent/main.py

# Or via npm script (coming soon)
```
