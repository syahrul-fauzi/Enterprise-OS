"""
EOS Evidence Agent
Collects and archives all evidence from work item execution. Creates immutable
records of what was changed, why it was changed, who changed it, and what the results were.
"""

import os
import json
import subprocess
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass

@dataclass
class EvidenceBundle:
    """Immutable bundle of all evidence for a single work item"""
    work_id: str
    created_at: str
    actor: str  # Who executed this work item
    code_changes: Dict[str, Any]
    test_results: Dict[str, Any]
    recon_report: Dict[str, Any]
    verification_report: Dict[str, Any]
    runtime_evidence: Dict[str, Any]
    outcome: str
    status: str

class EvidenceAgent:
    """Collects and manages immutable evidence bundles for all work items"""
    
    def __init__(self, workspace_path: str = "/root/Enterprise-OS"):
        self.workspace_path = Path(workspace_path)
        self.evidence_dir = self.workspace_path / ".eos-state" / "evidence"
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        self.archived_bundles: List[str] = []
        
    def get_git_changes(self, work_id: str) -> Dict[str, Any]:
        """Get all git changes associated with this work item"""
        print(f"[EVIDENCE] Gathering git changes for {work_id}")
        
        changes = {
            "files_modified": [],
            "files_added": [],
            "files_deleted": [],
            "commits": [],
            "branch_name": "",
            "diff_summary": ""
        }
        
        try:
            # Get current branch
            branch_result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=self.workspace_path,
                capture_output=True,
                text=True
            )
            changes["branch_name"] = branch_result.stdout.strip()
            
            # Get list of modified files vs main
            diff_result = subprocess.run(
                ["git", "diff", "--name-only", "main..HEAD"],
                cwd=self.workspace_path,
                capture_output=True,
                text=True
            )
            modified_files = diff_result.stdout.strip().split('\n')
            changes["files_modified"] = [f for f in modified_files if f]
            
            # Get full diff summary
            diff_summary = subprocess.run(
                ["git", "diff", "--stat", "main..HEAD"],
                cwd=self.workspace_path,
                capture_output=True,
                text=True
            )
            changes["diff_summary"] = diff_summary.stdout
            
            # Get commits in this branch
            log_result = subprocess.run(
                ["git", "log", "--oneline", "main..HEAD"],
                cwd=self.workspace_path,
                capture_output=True,
                text=True
            )
            changes["commits"] = log_result.stdout.strip().split('\n')
            
            print(f"[EVIDENCE] Found {len(changes['files_modified'])} modified files")
            
        except Exception as e:
            print(f"[EVIDENCE] Warning gathering git changes: {e}")
            
        return changes
        
    def gather_runtime_evidence(self, work_item: Dict[str, Any]) -> Dict[str, Any]:
        """Gather runtime state evidence"""
        print(f"[EVIDENCE] Gathering runtime evidence")
        
        runtime_evidence = {
            "build_successful": False,
            "dev_server_starts": False,
            "environment_variables": [],
            "database_migrations_applied": False,
            "tenant_isolation_verified": False,
            "auth_working": False,
            "evidence_recording_active": False
        }
        
        # Try to build the project
        try:
            if (self.workspace_path / "package.json").exists():
                build_result = subprocess.run(
                    ["npm", "run", "build"],
                    cwd=self.workspace_path,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                runtime_evidence["build_successful"] = build_result.returncode == 0
                
            # Check if migrations can be applied
            if (self.workspace_path / "prisma" / "schema.prisma").exists():
                migrate_result = subprocess.run(
                    ["npx", "prisma", "migrate", "status"],
                    cwd=self.workspace_path,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                runtime_evidence["database_migrations_applied"] = "No pending migrations" in migrate_result.stdout
                
        except Exception as e:
            print(f"[EVIDENCE] Runtime check warning: {e}")
            
        return runtime_evidence
        
    def load_existing_reports(self, work_id: str) -> Dict[str, Any]:
        """Load existing recon and verification reports for this work item"""
        reports = {"recon": None, "verification": None}
        
        recon_path = self.workspace_path / ".eos-state" / "recon" / f"{work_id}_recon.json"
        if recon_path.exists():
            with open(recon_path, 'r') as f:
                reports["recon"] = json.load(f)
                
        verify_path = self.workspace_path / ".eos-state" / "verification" / f"{work_id}_verification.json"
        if verify_path.exists():
            with open(verify_path, 'r') as f:
                reports["verification"] = json.load(f)
                
        return reports
        
    def create_evidence_bundle(self, work_item: Dict[str, Any]) -> str:
        """Create and archive a complete evidence bundle"""
        print(f"[EVIDENCE] Creating evidence bundle for {work_item['work_id']}")
        
        # Load existing reports
        reports = self.load_existing_reports(work_item["work_id"])
        
        # Gather all evidence types
        code_changes = self.get_git_changes(work_item["work_id"])
        runtime_evidence = self.gather_runtime_evidence(work_item)
        
        # Get test results from verification
        test_results = {}
        if reports["verification"]:
            test_results = reports["verification"].get("acceptance_criteria", {}).get("test passes", {}).get("test_results", {})
        
        # Create the bundle
        bundle = EvidenceBundle(
            work_id=work_item["work_id"],
            created_at=datetime.utcnow().isoformat(),
            actor="eos-self-execution-agent",
            code_changes=code_changes,
            test_results=test_results,
            recon_report=reports["recon"] or {},
            verification_report=reports["verification"] or {},
            runtime_evidence=runtime_evidence,
            outcome=work_item["outcome"],
            status="COMPLETED"
        )
        
        # Save the bundle
        bundle_path = self.evidence_dir / f"{work_item['work_id']}_bundle.json"
        with open(bundle_path, 'w') as f:
            json.dump({
                "work_id": bundle.work_id,
                "created_at": bundle.created_at,
                "actor": bundle.actor,
                "code_changes": bundle.code_changes,
                "test_results": bundle.test_results,
                "recon_report": bundle.recon_report,
                "verification_report": bundle.verification_report,
                "runtime_evidence": bundle.runtime_evidence,
                "outcome": bundle.outcome,
                "status": bundle.status
            }, f, indent=2)
            
        self.archived_bundles.append(work_item["work_id"])
        print(f"[EVIDENCE] ✅ Evidence bundle archived at {bundle_path}")
        
        # Create a human-readable summary
        self.create_summary(bundle)
        
        return str(bundle_path)
        
    def create_summary(self, bundle: EvidenceBundle):
        """Create a human-readable summary of the evidence bundle"""
        summary_path = self.evidence_dir / f"{bundle.work_id}_summary.md"
        
        summary_content = f"""# Evidence Summary: {bundle.work_id}
Created: {bundle.created_at}
Status: {bundle.status}

## Work Item Information
- **Product**: {getattr(bundle, 'product', 'Unknown')}
- **User Job**: {getattr(bundle, 'user_job', 'Unknown')}
- **Outcome**: {bundle.outcome}

## Code Changes
- Files modified: {len(bundle.code_changes.get('files_modified', []))}
- Commits: {len(bundle.code_changes.get('commits', []))}
- Branch: {bundle.code_changes.get('branch_name', 'Unknown')}

## Verification Results
- All acceptance criteria passed: {bundle.verification_report.get('all_passed', False) if bundle.verification_report else 'Unknown'}
- Total passed: {bundle.verification_report.get('total_passed', 0) if bundle.verification_report else 0}
- Total failed: {bundle.verification_report.get('total_failed', 0) if bundle.verification_report else 0}

## Runtime Status
- Build successful: {bundle.runtime_evidence.get('build_successful', False)}
- Database migrations applied: {bundle.runtime_evidence.get('database_migrations_applied', False)}

## Reuse Analysis
- Reuse percentage: {bundle.recon_report.get('reuse_analysis', {}).get('reuse_percentage', 0) if bundle.recon_report else 0}%
- Capabilities reused: {', '.join(bundle.recon_report.get('reuse_analysis', {}).get('reusable_existing', [])) if bundle.recon_report else 'None'}
"""
        
        with open(summary_path, 'w') as f:
            f.write(summary_content)
            
        print(f"[EVIDENCE] Summary created at {summary_path}")
        
    def get_all_evidence(self) -> List[Dict[str, Any]]:
        """Get metadata for all archived evidence bundles"""
        all_evidence = []
        
        for bundle_file in self.evidence_dir.glob("*_bundle.json"):
            with open(bundle_file, 'r') as f:
                bundle = json.load(f)
                all_evidence.append({
                    "work_id": bundle["work_id"],
                    "created_at": bundle["created_at"],
                    "status": bundle["status"],
                    "file": str(bundle_file)
                })
                
        return all_evidence
        
    def get_audit_trail(self) -> Dict[str, Any]:
        """Generate a complete audit trail of all work executed"""
        all_bundles = self.get_all_evidence()
        
        audit_trail = {
            "total_work_items": len(all_bundles),
            "completed_work_items": len([b for b in all_bundles if b["status"] == "COMPLETED"]),
            "total_files_modified": 0,
            "average_reuse_rate": 0.0,
            "work_items": all_bundles,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # Calculate aggregate metrics
        reuse_sum = 0.0
        reuse_count = 0
        
        for bundle_file in self.evidence_dir.glob("*_bundle.json"):
            with open(bundle_file, 'r') as f:
                bundle = json.load(f)
                audit_trail["total_files_modified"] += len(bundle["code_changes"].get("files_modified", []))
                
                # Track reuse rate
                if bundle.get("recon_report", {}).get("reuse_analysis", {}).get("reuse_percentage"):
                    reuse_sum += bundle["recon_report"]["reuse_analysis"]["reuse_percentage"]
                    reuse_count += 1
                    
        if reuse_count > 0:
            audit_trail["average_reuse_rate"] = reuse_sum / reuse_count
            
        # Save audit trail
        audit_path = self.workspace_path / ".eos-state" / "audit_trail.json"
        with open(audit_path, 'w') as f:
            json.dump(audit_trail, f, indent=2)
            
        return audit_trail

if __name__ == "__main__":
    # Test evidence agent
    evidence_agent = EvidenceAgent()
    
    test_work_item = {
        "work_id": "LH-CASE-001",
        "product": "LawyersHub",
        "user_job": "Create and manage a legal matter",
        "outcome": "User can create a real case and retrieve it later",
        "constraints": {
            "architecture_locked": True,
            "reuse_existing_capabilities": True,
            "no_new_framework": True
        },
        "acceptance": [
            "authenticated user",
            "tenant isolated",
            "case persisted",
            "case visible",
            "evidence recorded",
            "test passes"
        ]
    }
    
    # Create bundle (this won't have real data in test)
    bundle_path = evidence_agent.create_evidence_bundle(test_work_item)
    print(f"\nCreated evidence bundle at: {bundle_path}")
    
    # Get audit trail
    audit = evidence_agent.get_audit_trail()
    print("\nAudit Trail:")
    print(json.dumps(audit, indent=2))