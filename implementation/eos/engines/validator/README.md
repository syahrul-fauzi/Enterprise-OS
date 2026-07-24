# EOS Validator Agent

## Purpose
Validates observation reports and evidence files against EOS governance rules. No decision-making, just validation!

## Tasks
1. Read observation reports from `/workspace/products/<product>/evidence/observations/`
2. Validate against rules in `rules.yaml`
3. Generate validation reports in `/workspace/products/<product>/evidence/validation-reports/`
4. No pattern promotion or extraction decisions!

## Operating Principles
- Follows [Agent Contract](../../governance/agent-contract.md)
- Read-only except for validation reports
- No strategic decisions
- All validation logged

## Running the Agent
```bash
# From root
python3 agents/validator-agent/main.py

# Or via npm script
npm run eos:validate
```
