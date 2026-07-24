# EOS Delivery Agent
## Purpose
Scans a product workspace and generates a production readiness report!
## Tasks
1. Reads product's eos.yaml contract
2. Reads production readiness rules from governance/production-readiness.yaml
3. Scans workspace structure
4. Generates a delivery report with health score!
## Operating Principles
- Follows EOS Governance
- No changes to workspace (read-only)
- Generates actionable reports
## Running the Agent
```bash
# From root, specify product name
python3 agents/delivery-agent/main.py lawyershub

# Or via npm script (eos:doctor)
npm run eos:doctor lawyershub
```
