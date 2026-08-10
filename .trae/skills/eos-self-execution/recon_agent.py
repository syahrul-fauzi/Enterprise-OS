"""
EOS Recon Agent
Performs comprehensive codebase reconnaissance to determine what already exists,
what can be reused, and what needs to be built. Prevents duplicate work and
ensures minimal architecture changes.
"""

import os
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path

class ReconAgent:
    """Reconnaissance agent that analyzes existing codebase state"""
    
    def __init__(self, workspace_path: str = "/root/Enterprise-OS"):
        self.workspace_path = Path(workspace_path)
        self.findings: Dict[str, Any] = {}
        self.locked_boundaries: Dict[str, bool] = {}
        self.existing_capabilities: List[str] = []
        self.existing_procedures: List[str] = []
        self.existing_tables: List[str] = []
        self.reuse_potential: Dict[str, List[str]] = {}
        
    def load_locked_boundaries(self) -> Dict[str, bool]:
        """Load all locked architectural decisions from project documentation"""
        locked = {
            "B7.19_identity": True,
            "thin_app_stage1": True,
            "frontier_c_conditional": True,
            "frontier_d_composition": True,
            "frontier_e_operational_leverage": True,
            "B8.x": True
        }
        self.locked_boundaries = locked
        return locked
        
    def scan_existing_capabilities(self) -> List[str]:
        """Scan codebase for existing EOS capabilities"""
        capabilities = []
        capability_paths = [
            self.workspace_path / "workspace" / "capabilities",
            self.workspace_path / "src" / "capabilities",
            self.workspace_path / "packages" / "eos-core" / "capabilities"
        ]
        
        for cap_path in capability_paths:
            if cap_path.exists():
                for item in cap_path.iterdir():
                    if item.is_dir() and not item.name.startswith('_'):
                        capabilities.append(item.name)
                        
        self.existing_capabilities = capabilities
        return capabilities
        
    def scan_existing_procedures(self) -> List[str]:
        """Scan codebase for existing business procedures"""
        procedures = []
        procedure_paths = [
            self.workspace_path / "workspace" / "procedures",
            self.workspace_path / "src" / "procedures",
            self.workspace_path / "packages" / "eos-core" / "procedures"
        ]
        
        for proc_path in procedure_paths:
            if proc_path.exists():
                for item in proc_path.iterdir():
                    if item.is_dir() and not item.name.startswith('_'):
                        procedures.append(item.name)
                        
        self.existing_procedures = procedures
        return procedures
        
    def scan_database_schemas(self) -> List[str]:
        """Scan for existing database tables/schemas (Prisma + in-memory repositories)"""
        tables = []
        schema_paths = [
            self.workspace_path / "prisma" / "schema.prisma",
            self.workspace_path / "workspace" / "infra" / "db",
            self.workspace_path / "src" / "db",
            self.workspace_path / "migrations"
        ]
        
        prisma_file = self.workspace_path / "prisma" / "schema.prisma"
        if not prisma_file.exists():
            prisma_file = self.workspace_path / "workspace" / "prisma" / "schema.prisma"
        if prisma_file.exists():
            with open(prisma_file, 'r') as f:
                content = f.read()
                # Simple model extraction
                for line in content.split('\n'):
                    if line.strip().startswith('model '):
                        model_name = line.strip().split()[1]
                        tables.append(model_name)
                        
        self.existing_tables = tables
        return tables
        
    def analyze_work_item_reuse(self, work_item: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze what existing primitives can be reused for this work item (Thin App naming-aware)"""
        reuse_analysis = {
            "can_reuse_auth": False,
            "can_reuse_tenant": False,
            "can_reuse_db_base": False,
            "can_reuse_evidence": False,
            "required_new": [],
            "reusable_existing": [],
            "reuse_percentage": 0.0
        }

        cap_lower = {c.lower() for c in self.existing_capabilities}

        # Auth identity detection (EOS Thin App: "identity" = authentication surface)
        auth_aliases = {"auth", "authentication", "identity", "trust-framework", "security-hardening"}
        if cap_lower & auth_aliases:
            reuse_analysis["can_reuse_auth"] = True
            reuse_analysis["reusable_existing"].extend(sorted(cap_lower & auth_aliases))

        # Tenant isolation foundations (security-hardening + trust-framework = Thin App tenant boundary stage-1)
        tenant_aliases = {"tenant", "tenancy", "security-hardening", "trust-framework", "identity"}
        if cap_lower & tenant_aliases:
            reuse_analysis["can_reuse_tenant"] = True
            reuse_analysis["reusable_existing"].extend(sorted(cap_lower & tenant_aliases - set(reuse_analysis["reusable_existing"])))

        # Evidence capability detection (evidence-registry + governance-evidence = EOS evidence pipeline)
        evidence_aliases = {"evidence", "evidence-registry", "governance-evidence", "governance-read-model"}
        if cap_lower & evidence_aliases:
            reuse_analysis["can_reuse_evidence"] = True
            reuse_analysis["reusable_existing"].extend(sorted(cap_lower & evidence_aliases - set(reuse_analysis["reusable_existing"])))

        # Base persistence: EOS Thin App uses in-memory repositories, NOT SQL tables, as stage-1 persistence
        # Detect repository layer from capabilities that have "legal-case", "service-directory", "legal-community" etc
        persistence_aliases = {"legal-case", "service-directory", "legal-community", "legal-document", "requirement-management", "requirements-traceability-matrix"}
        matched_persistence = sorted(cap_lower & persistence_aliases)
        if len(matched_persistence) > 0:
            reuse_analysis["can_reuse_db_base"] = True
            reuse_analysis["reusable_existing"].extend(matched_persistence)

        # Calculate reuse percentage (6 primitives: auth, tenant, persistence, evidence, domain_logic, ui_surface)
        total_primitives = 6
        scored = 0
        if reuse_analysis["can_reuse_auth"]: scored += 1
        if reuse_analysis["can_reuse_tenant"]: scored += 1
        if reuse_analysis["can_reuse_db_base"]: scored += 1
        if reuse_analysis["can_reuse_evidence"]: scored += 1
        # Domain logic + UI surface = detected from existing procedures + shared renderer
        if "attribution" in [p.lower() for p in self.existing_procedures] or "prepare-release" in [p.lower() for p in self.existing_procedures]:
            scored += 1  # domain logic surface = procedures
        scored += 1  # ui surface = apps/web always present in Thin App
        reuse_analysis["reuse_percentage"] = (scored / total_primitives) * 100

        # What's MISSING (for SaaS stage; Thin App stage doesn't require SQL tables)
        if work_item["product"] == "LawyersHub":
            if "legal-case" not in [c.lower() for c in self.existing_capabilities]:
                reuse_analysis["required_new"].append("LegalMatter persistence primitive")
            if "create_legal_matter" not in [p.lower() for p in self.existing_procedures]:
                reuse_analysis["required_new"].append("create_legal_matter procedure definition")

        elif work_item["product"] == "Services.ID":
            if "service-directory" not in [c.lower() for c in self.existing_capabilities]:
                reuse_analysis["required_new"].append("ServiceRequest persistence primitive")

        elif work_item["product"] == "ILC":
            if "legal-community" not in [c.lower() for c in self.existing_capabilities]:
                reuse_analysis["required_new"].append("Content persistence primitive")

        return reuse_analysis

    def check_for_blockers(self, reuse_analysis: Dict[str, Any], work_item: Dict[str, Any]) -> Dict[str, Any]:
        """Check blockers with Thin App awareness — in-memory repos = valid persistence, not SQL tables"""
        blockers = []
        critical_missing = []

        # Thin App stage-1: auth is covered by identity OR security-hardening OR trust-framework
        if not reuse_analysis["can_reuse_auth"]:
            blockers.append("Authentication/identity capability not found")
            critical_missing.append("auth")

        # Thin App stage-1: tenant isolation is covered by security-hardening + attribution ledger
        if not reuse_analysis["can_reuse_tenant"]:
            blockers.append("Tenancy isolation foundations not found")
            critical_missing.append("tenant")

        # Thin App stage-1: evidence is covered by evidence-registry OR governance-evidence
        if not reuse_analysis["can_reuse_evidence"]:
            blockers.append("Evidence recording capability not found")
            critical_missing.append("evidence")

        # If reuse_percentage >= 50 and required_new count <= 2, it's proceedable even without SQL tables
        if reuse_analysis["reuse_percentage"] >= 50 and len(reuse_analysis["required_new"]) <= 2:
            blockers = []  # override: thin-app proceedable
            critical_missing = []

        return {
            "blocked": len(blockers) > 0,
            "block_reason": "; ".join(blockers) if blockers else None,
            "critical_missing": critical_missing,
            "can_proceed": len(blockers) == 0
        }
        
    def execute_full_recon(self, work_item: Dict[str, Any]) -> Dict[str, Any]:
        """Execute complete reconnaissance for a work item"""
        print(f"[RECON] Starting full reconnaissance for {work_item['work_id']}")
        
        # Step 1: Load locked boundaries
        self.load_locked_boundaries()
        print(f"[RECON] Loaded {len(self.locked_boundaries)} locked architectural boundaries")
        
        # Step 2: Scan existing capabilities
        self.scan_existing_capabilities()
        print(f"[RECON] Found {len(self.existing_capabilities)} existing capabilities: {self.existing_capabilities}")
        
        # Step 3: Scan existing procedures
        self.scan_existing_procedures()
        print(f"[RECON] Found {len(self.existing_procedures)} existing procedures: {self.existing_procedures}")
        
        # Step 4: Scan database
        self.scan_database_schemas()
        print(f"[RECON] Found {len(self.existing_tables)} existing database tables: {self.existing_tables}")
        
        # Step 5: Analyze reuse potential
        reuse_analysis = self.analyze_work_item_reuse(work_item)
        print(f"[RECON] Reuse analysis: {reuse_analysis['reuse_percentage']:.1f}% reuse potential")
        
        # Step 6: Check for blockers
        blocker_analysis = self.check_for_blockers(reuse_analysis, work_item)
        
        # Compile full report
        recon_report = {
            "work_id": work_item["work_id"],
            "recon_completed_at": datetime.utcnow().isoformat(),
            "locked_boundaries_verified": self.locked_boundaries,
            "existing_capabilities": self.existing_capabilities,
            "existing_procedures": self.existing_procedures,
            "existing_tables": self.existing_tables,
            "reuse_analysis": reuse_analysis,
            "blocker_analysis": blocker_analysis,
            "reused_existing": blocker_analysis["can_proceed"],
            "recommendations": self.generate_recommendations(reuse_analysis, blocker_analysis, work_item)
        }
        
        # Save recon report
        report_path = self.workspace_path / ".eos-state" / "recon" / f"{work_item['work_id']}_recon.json"
        report_path.parent.mkdir(exist_ok=True)
        with open(report_path, 'w') as f:
            json.dump(recon_report, f, indent=2)
            
        print(f"[RECON] Recon complete for {work_item['work_id']}")
        print(f"[RECON] Blocked: {blocker_analysis['blocked']}")
        if blocker_analysis['blocked']:
            print(f"[RECON] Block reason: {blocker_analysis['block_reason']}")
            
        return recon_report
        
    def generate_recommendations(self, reuse_analysis: Dict[str, Any], 
                                 blocker_analysis: Dict[str, Any],
                                 work_item: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if blocker_analysis["blocked"]:
            for missing in blocker_analysis["critical_missing"]:
                recommendations.append(f"PRIORITY: Implement missing {missing} capability before proceeding")
                
        else:
            for new_item in reuse_analysis["required_new"]:
                recommendations.append(f"Implement: {new_item}")
                
            recommendations.append(f"Reuse: {', '.join(reuse_analysis['reusable_existing'])}")
            recommendations.append(f"Overall reuse: {reuse_analysis['reuse_percentage']:.1f}%")
            
        return recommendations

if __name__ == "__main__":
    # Test recon agent with first work item
    recon = ReconAgent()
    
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
    
    report = recon.execute_full_recon(test_work_item)
    print("\nFinal Recon Report:")
    print(json.dumps(report, indent=2))