"""
EOS Self-Execution Orchestrator
Implements the core execution loop that transforms work items into verified outcomes
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

class WorkItemStatus(Enum):
    PENDING = "PENDING"
    RECON_IN_PROGRESS = "RECON_IN_PROGRESS"
    RECON_COMPLETE = "RECON_COMPLETE"
    EXECUTION_IN_PROGRESS = "EXECUTION_IN_PROGRESS"
    VERIFICATION_IN_PROGRESS = "VERIFICATION_IN_PROGRESS"
    VERIFICATION_COMPLETE = "VERIFICATION_COMPLETE"
    EVIDENCE_COLLECTED = "EVIDENCE_COLLECTED"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    FAILED = "FAILED"

class AgentRole(Enum):
    COMMANDER = "commander"
    RECON = "recon"
    PRODUCT_SLICE = "product_slice"
    DATABASE = "database"
    TENANT = "tenant"
    AUTH = "auth"
    SECURITY = "security"
    VERIFICATION = "verification"
    EVIDENCE = "evidence"
    RELEASE = "release"

class WorkItem:
    """Represents a single business work item that needs execution"""
    def __init__(self, work_id: str, product: str, user_job: str, outcome: str, 
                 constraints: Dict[str, Any], acceptance: List[str]):
        self.work_id = work_id
        self.product = product
        self.user_job = user_job
        self.outcome = outcome
        self.constraints = constraints
        self.acceptance = acceptance
        self.status = WorkItemStatus.PENDING
        self.created_at = datetime.utcnow().isoformat()
        self.updated_at = self.created_at
        self.assigned_agents: Dict[AgentRole, str] = {}
        self.evidence: Dict[str, Any] = {}
        self.recon_report: Optional[Dict[str, Any]] = None
        self.execution_plan: Optional[Dict[str, Any]] = None
        self.verification_report: Optional[Dict[str, Any]] = None
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "work_id": self.work_id,
            "product": self.product,
            "user_job": self.user_job,
            "outcome": self.outcome,
            "constraints": self.constraints,
            "acceptance": self.acceptance,
            "status": self.status.value,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "assigned_agents": {k.value: v for k, v in self.assigned_agents.items()},
            "evidence": self.evidence,
            "recon_report": self.recon_report,
            "execution_plan": self.execution_plan,
            "verification_report": self.verification_report
        }
        
    def update_status(self, new_status: WorkItemStatus):
        self.status = new_status
        self.updated_at = datetime.utcnow().isoformat()

class EOSOrchestrator:
    """Main orchestrator that manages the entire self-execution pipeline"""
    
    def __init__(self, workspace_path: str = "/root/Enterprise-OS"):
        self.workspace_path = workspace_path
        self.work_items: Dict[str, WorkItem] = {}
        self.active_slices: int = 0
        self.shipped_slices: int = 0
        self.blocked_slices: int = 0
        self.load_state()
        
    def load_state(self):
        """Load existing work items from state storage"""
        state_path = os.path.join(self.workspace_path, ".eos-state", "workitems.json")
        os.makedirs(os.path.dirname(state_path), exist_ok=True)
        
        if os.path.exists(state_path):
            with open(state_path, 'r') as f:
                data = json.load(f)
                for work_data in data.values():
                    work_item = WorkItem(
                        work_data["work_id"],
                        work_data["product"],
                        work_data["user_job"],
                        work_data["outcome"],
                        work_data["constraints"],
                        work_data["acceptance"]
                    )
                    work_item.status = WorkItemStatus(work_data["status"])
                    work_item.created_at = work_data["created_at"]
                    work_item.updated_at = work_data["updated_at"]
                    work_item.evidence = work_data.get("evidence", {})
                    work_item.recon_report = work_data.get("recon_report")
                    work_item.execution_plan = work_data.get("execution_plan")
                    work_item.verification_report = work_data.get("verification_report")
                    self.work_items[work_item.work_id] = work_item
                    
    def save_state(self):
        """Save current state to persistent storage"""
        state_path = os.path.join(self.workspace_path, ".eos-state", "workitems.json")
        os.makedirs(os.path.dirname(state_path), exist_ok=True)
        
        with open(state_path, 'w') as f:
            json.dump({k: v.to_dict() for k, v in self.work_items.items()}, f, indent=2)
            
    def create_work_item(self, work_id: str, product: str, user_job: str, outcome: str,
                        constraints: Dict[str, Any], acceptance: List[str]) -> str:
        """Create a new work item and start the execution pipeline"""
        if work_id in self.work_items:
            raise ValueError(f"Work item {work_id} already exists")
            
        work_item = WorkItem(work_id, product, user_job, outcome, constraints, acceptance)
        self.work_items[work_id] = work_item
        self.save_state()
        
        # Start the pipeline
        self._start_recon_phase(work_item)
        
        return work_id
        
    def _start_recon_phase(self, work_item: WorkItem):
        """Initiate the reconnaissance phase to understand existing codebase state"""
        work_item.update_status(WorkItemStatus.RECON_IN_PROGRESS)
        self.save_state()
        print(f"[ORCHESTRATOR] Started RECON phase for {work_item.work_id}")
        
    def complete_recon(self, work_id: str, recon_report: Dict[str, Any]):
        """Called by Recon agent when recon is complete"""
        if work_id not in self.work_items:
            raise ValueError(f"Work item {work_id} not found")
            
        work_item = self.work_items[work_id]
        work_item.recon_report = recon_report
        
        if recon_report.get("blocked", False):
            work_item.update_status(WorkItemStatus.BLOCKED)
            self.blocked_slices += 1
            print(f"[ORCHESTRATOR] Work item {work_id} BLOCKED: {recon_report.get('block_reason')}")
        else:
            work_item.update_status(WorkItemStatus.RECON_COMPLETE)
            self._start_execution_phase(work_item)
            
        self.save_state()
        
    def _start_execution_phase(self, work_item: WorkItem):
        """Initiate the execution phase with agent assignment"""
        work_item.update_status(WorkItemStatus.EXECUTION_IN_PROGRESS)
        self.active_slices += 1
        print(f"[ORCHESTRATOR] Started EXECUTION phase for {work_item.work_id}")
        
        # Generate execution plan based on recon findings
        work_item.execution_plan = self._generate_execution_plan(work_item)
        self.save_state()
        
    def _generate_execution_plan(self, work_item: WorkItem) -> Dict[str, Any]:
        """Generate dependency-aware execution plan"""
        tasks = []
        
        # Core infrastructure tasks that must run first
        if not work_item.recon_report.get("auth_exists", False):
            tasks.append({"agent": AgentRole.AUTH, "task": "Set up authentication layer", "dependencies": []})
        if not work_item.recon_report.get("tenant_exists", False):
            tasks.append({"agent": AgentRole.TENANT, "task": "Set up tenant isolation", "dependencies": ["auth"]})
        if not work_item.recon_report.get("db_schema_exists", False):
            tasks.append({"agent": AgentRole.DATABASE, "task": "Create required database schema", "dependencies": ["tenant"]})
            
        # Product slice task (depends on infrastructure)
        tasks.append({
            "agent": AgentRole.PRODUCT_SLICE, 
            "task": f"Implement {work_item.user_job}", 
            "dependencies": ["auth", "tenant", "database"]
        })
        
        # Security task runs after implementation
        tasks.append({
            "agent": AgentRole.SECURITY, 
            "task": "Security audit and penetration testing", 
            "dependencies": ["product_slice"]
        })
        
        return {
            "tasks": tasks,
            "started_at": datetime.utcnow().isoformat(),
            "estimated_completion": None
        }
        
    def start_verification(self, work_id: str):
        """Initiate verification phase after execution completes"""
        if work_id not in self.work_items:
            raise ValueError(f"Work item {work_id} not found")
            
        work_item = self.work_items[work_id]
        work_item.update_status(WorkItemStatus.VERIFICATION_IN_PROGRESS)
        print(f"[ORCHESTRATOR] Started VERIFICATION phase for {work_id}")
        self.save_state()
        
    def complete_verification(self, work_id: str, verification_report: Dict[str, Any]):
        """Called by Verification agent when all checks pass"""
        if work_id not in self.work_items:
            raise ValueError(f"Work item {work_id} not found")
            
        work_item = self.work_items[work_id]
        work_item.verification_report = verification_report
        
        if verification_report.get("all_passed", False):
            work_item.update_status(WorkItemStatus.VERIFICATION_COMPLETE)
            self._collect_evidence(work_item)
        else:
            work_item.update_status(WorkItemStatus.FAILED)
            print(f"[ORCHESTRATOR] Work item {work_id} FAILED verification")
            
        self.save_state()
        
    def _collect_evidence(self, work_item: WorkItem):
        """Collect all evidence types before completion"""
        work_item.update_status(WorkItemStatus.EVIDENCE_COLLECTED)
        work_item.evidence = {
            "code_evidence": self._gather_code_changes(work_item),
            "test_evidence": self._gather_test_results(work_item),
            "runtime_evidence": self._gather_runtime_state(work_item),
            "compliance_evidence": work_item.verification_report,
            "collected_at": datetime.utcnow().isoformat()
        }
        print(f"[ORCHESTRATOR] Evidence collected for {work_item.work_id}")
        self._complete_work_item(work_item)
        
    def _gather_code_changes(self, work_item: WorkItem) -> Dict[str, Any]:
        """Gather all git changes for this work item"""
        return {
            "files_modified": [],
            "commits": [],
            "pr_links": []
        }
        
    def _gather_test_results(self, work_item: WorkItem) -> Dict[str, Any]:
        """Gather test execution results"""
        return {
            "unit_tests": {"passed": 0, "failed": 0, "total": 0},
            "integration_tests": {"passed": 0, "failed": 0, "total": 0},
            "e2e_tests": {"passed": 0, "failed": 0, "total": 0}
        }
        
    def _gather_runtime_state(self, work_item: WorkItem) -> Dict[str, Any]:
        """Gather runtime state verification"""
        return {
            "tenant_isolation_verified": False,
            "auth_enforced": False,
            "persistence_working": False,
            "evidence_recorded": False
        }
        
    def _complete_work_item(self, work_item: WorkItem):
        """Mark work item as fully completed"""
        work_item.update_status(WorkItemStatus.COMPLETED)
        self.active_slices -= 1
        self.shipped_slices += 1
        print(f"[ORCHESTRATOR] Work item {work_item.work_id} COMPLETED successfully!")
        self.save_state()
        
    def get_war_room_dashboard(self) -> Dict[str, Any]:
        """Generate current war room metrics"""
        status_counts = {}
        for item in self.work_items.values():
            status = item.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
            
        product_counts = {}
        for item in self.work_items.values():
            product = item.product
            product_counts[product] = product_counts.get(product, 0) + 1
            
        return {
            "active_slices": self.active_slices,
            "shipped_slices": self.shipped_slices,
            "blocked_slices": self.blocked_slices,
            "in_review": status_counts.get("VERIFICATION_IN_PROGRESS", 0),
            "ready": status_counts.get("EVIDENCE_COLLECTED", 0),
            "status_breakdown": status_counts,
            "product_breakdown": product_counts,
            "primitive_reuse_rate": self._calculate_reuse_rate(),
            "total_work_items": len(self.work_items)
        }
        
    def _calculate_reuse_rate(self) -> float:
        """Calculate what percentage of work reused existing primitives"""
        if not self.work_items:
            return 100.0
            
        reuse_total = 0
        for item in self.work_items.values():
            if item.recon_report and item.recon_report.get("reused_existing", False):
                reuse_total += 1
                
        return (reuse_total / len(self.work_items)) * 100

if __name__ == "__main__":
    orchestrator = EOSOrchestrator()
    
    # Example: Create first work item - LawyersHub create legal matter
    first_work = orchestrator.create_work_item(
        work_id="LH-CASE-001",
        product="LawyersHub",
        user_job="Create and manage a legal matter",
        outcome="User can create a real case and retrieve it later",
        constraints={
            "architecture_locked": True,
            "reuse_existing_capabilities": True,
            "no_new_framework": True
        },
        acceptance=[
            "authenticated user",
            "tenant isolated", 
            "case persisted",
            "case visible",
            "evidence recorded",
            "test passes"
        ]
    )
    
    print(f"Created first work item: {first_work}")
    print("\nWar Room Dashboard:")
    print(json.dumps(orchestrator.get_war_room_dashboard(), indent=2))