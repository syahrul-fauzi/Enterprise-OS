# EOS Observer Agent

## Purpose
The first EOS agent: a sensor and memory agent that observes evidence, detects changes, and generates observation reports.

## Tugas (Tasks)
1. Read all evidence files in product workspaces
2. Detect new evidence and changes
3. Generate observation reports
4. Identify patterns (without promoting them)
5. Update evidence inventory

## Operating Principles
- Strictly read-only (no code or architecture changes)
- Follows [Agent Contract](../../governance/agent-contract.md)
- All observations logged to `/workspace/products/*/evidence/observations/`
- No pattern promotion, only detection

## Running the Agent
```bash
cd agents/observer-agent
python main.py
```
