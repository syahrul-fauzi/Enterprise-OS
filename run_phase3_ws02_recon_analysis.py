"""
Run recon analysis for WS-02 Contract Compliance workstream
Generates reuse analysis and recon report for EOS-SKILL-ASSURANCE-001
"""

import sys
import os
from pathlib import Path
import json
from datetime import datetime

# Add scripts directory to path to import state path utility
repo_root = Path(__file__).parent
sys.path.insert(0, str(repo_root / "scripts"))
sys.path.insert(0, str(repo_root / "skills" / "eos-self-execution"))

from state_utils import state_path, get_repository_root
from recon_agent import ReconAgent

def main():
    # Initialize recon agent
    recon_agent = ReconAgent()
    
    # Load the work item
    work_item_path = state_path('workitems', 'EOS-SKILL-ASSURANCE-001.json')
    with open(work_item_path, 'r') as f:
        work_item = json.load(f)
    
    print(f"[RECON] Starting recon analysis for {work_item['work_id']} - WS-02 Contract Compliance")
    
    # Step 1: Load locked boundaries
    locked_boundaries = recon_agent.load_locked_boundaries()
    print(f"[RECON] Locked boundaries loaded: {list(locked_boundaries.keys())}")
    
    # Step 2: Scan existing capabilities
    existing_capabilities = recon_agent.scan_existing_capabilities()
    print(f"[RECON] Found {len(existing_capabilities)} existing capabilities")
    print(f"[RECON] Capabilities list (first 20): {existing_capabilities[:20]}")
    
    # Step 3: Scan existing procedures
    existing_procedures = recon_agent.scan_existing_procedures()
    print(f"[RECON] Found {len(existing_procedures)} existing procedures")
    print(f"[RECON] Procedures list: {existing_procedures}")
    
    # Step 4: Scan database schemas
    existing_tables = recon_agent.scan_database_schemas()
    print(f"[RECON] Found {len(existing_tables)} existing database models")
    
    # Add product field to work item - EOS Core (handled in recon_agent)
    work_item["product"] = "EOS Core"
    
    # Use the built-in execute_full_recon method that handles everything
    full_recon_report = recon_agent.execute_full_recon(work_item)
    
    # Save recon report to canonical state
    report_path = state_path('recon', f"{work_item['work_id']}_recon_report.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, 'w') as f:
        json.dump(full_recon_report, f, indent=2)
    
    print(f"[RECON] Recon analysis complete! Report saved to: {report_path}")

if __name__ == "__main__":
    main()