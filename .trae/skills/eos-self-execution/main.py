"""
EOS Self-Execution Main Entry Point
Orchestrates the complete pipeline from work item intake to completed, verified outcome.
This is the main driver that coordinates all agents in the EOS self-execution system.
"""

import click
import json
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

from orchestrator import EOSOrchestrator, WorkItemStatus
from recon_agent import ReconAgent
from verification_agent import VerificationAgent
from evidence_agent import EvidenceAgent

class EOSMain:
    """Main entry point for the EOS self-execution system"""
    
    def __init__(self, workspace_path: str = "/root/Enterprise-OS"):
        self.workspace_path = Path(workspace_path)
        self.orchestrator = EOSOrchestrator(workspace_path)
        self.recon_agent = ReconAgent(workspace_path)
        self.verification_agent = VerificationAgent(workspace_path)
        self.evidence_agent = EvidenceAgent(workspace_path)
        
    def process_work_item(self, work_item_path: str) -> str:
        """Process a work item from a JSON file through the entire pipeline"""
        print("\n" + "="*60)
        print("🚀 EOS SELF-EXECUTION PIPELINE STARTING")
        print("="*60)
        
        # Load work item
        with open(work_item_path, 'r') as f:
            work_item_data = json.load(f)
            
        # Register with orchestrator
        work_id = self.orchestrator.create_work_item(
            work_id=work_item_data["work_id"],
            product=work_item_data["product"],
            user_job=work_item_data["user_job"],
            outcome=work_item_data["outcome"],
            constraints=work_item_data["constraints"],
            acceptance=work_item_data["acceptance"]
        )
        
        print(f"\n📋 Work item registered: {work_id}")
        print(f"🎯 Product: {work_item_data['product']}")
        print(f"💼 User job: {work_item_data['user_job']}")
        
        # Step 1: Run Reconnaissance
        print("\n" + "-"*60)
        print("🔍 PHASE 1: RECONNAISSANCE")
        print("-"*60)
        
        recon_report = self.recon_agent.execute_full_recon(work_item_data)
        work_item = self.orchestrator.work_items[work_id]
        self.orchestrator.complete_recon(work_id, recon_report)
        
        if work_item.status == WorkItemStatus.BLOCKED:
            print(f"\n⛔ WORK ITEM BLOCKED: {recon_report['blocker_analysis']['block_reason']}")
            return work_id
            
        # Step 2: Execution would happen here - in real scenario, assigned agents implement
        print("\n" + "-"*60)
        print("⚒️  PHASE 2: EXECUTION (Agent implementation phase)")
        print("-"*60)
        print("Execution plan generated and assigned to product agents...")
        print("Agents implement the required changes...")
        
        # Simulate execution completion
        self.orchestrator.start_verification(work_id)
        
        # Step 3: Run Verification
        print("\n" + "-"*60)
        print("✅ PHASE 3: VERIFICATION")
        print("-"*60)
        
        verification_report = self.verification_agent.run_full_verification(work_item_data)
        self.orchestrator.complete_verification(work_id, verification_report)
        
        if work_item.status == WorkItemStatus.FAILED:
            print(f"\n❌ WORK ITEM FAILED verification")
            return work_id
            
        # Step 4: Collect Evidence
        print("\n" + "-"*60)
        print("📚 PHASE 4: EVIDENCE COLLECTION")
        print("-"*60)
        
        bundle_path = self.evidence_agent.create_evidence_bundle(work_item_data)
        print(f"\n📦 Evidence bundle saved to: {bundle_path}")
        
        # Complete the work item
        work_item.update_status(WorkItemStatus.COMPLETED)
        self.orchestrator.save_state()
        
        # Show final dashboard
        self.show_dashboard()
        
        print("\n" + "="*60)
        print(f"🎉 WORK ITEM {work_id} COMPLETED SUCCESSFULLY!")
        print("="*60 + "\n")
        
        return work_id
        
    def show_dashboard(self):
        """Display the current war room dashboard"""
        dashboard = self.orchestrator.get_war_room_dashboard()
        audit = self.evidence_agent.get_audit_trail()
        
        print("\n" + "="*60)
        print("🏠 EOS WAR ROOM DASHBOARD")
        print("="*60)
        print(f"📊 Active slices:     {dashboard['active_slices']}")
        print(f"✅ Shipped slices:    {dashboard['shipped_slices']}")
        print(f"⛔ Blocked slices:    {dashboard['blocked_slices']}")
        print(f"🔍 In review:         {dashboard['in_review']}")
        print(f"📦 Ready for release:  {dashboard['ready']}")
        print("\n📈 Cumulative Metrics:")
        print(f"   Total work items:  {dashboard['total_work_items']}")
        print(f"   Avg reuse rate:    {audit['average_reuse_rate']:.1f}%")
        print(f"   Total files mod:    {audit['total_files_modified']}")
        
        if dashboard['product_breakdown']:
            print("\n🗺️  Product Breakdown:")
            for product, count in dashboard['product_breakdown'].items():
                print(f"   {product}: {count} slices")
        print("="*60)
        
    def list_work_items(self):
        """List all work items and their status"""
        print("\n" + "="*60)
        print("📋 ALL WORK ITEMS")
        print("="*60)
        
        for work_id, item in self.orchestrator.work_items.items():
            status_color = ""
            if item.status == WorkItemStatus.COMPLETED:
                status_color = "✅"
            elif item.status == WorkItemStatus.BLOCKED:
                status_color = "⛔"
            elif item.status == WorkItemStatus.FAILED:
                status_color = "❌"
            elif item.status in [WorkItemStatus.EXECUTION_IN_PROGRESS, WorkItemStatus.VERIFICATION_IN_PROGRESS]:
                status_color = "🔄"
            else:
                status_color = "⏳"
                
            print(f"{status_color} {work_id}: {item.status.value} - {item.product}")
            
        print("="*60)
        
    def get_audit_report(self):
        """Generate and display the full audit trail"""
        audit = self.evidence_agent.get_audit_trail()
        
        print("\n" + "="*60)
        print("📜 EOS AUDIT TRAIL")
        print("="*60)
        print(f"Total work items:     {audit['total_work_items']}")
        print(f"Completed items:      {audit['completed_work_items']}")
        print(f"Total files modified: {audit['total_files_modified']}")
        print(f"Average reuse rate:   {audit['average_reuse_rate']:.1f}%")
        print("="*60)

@click.group()
def cli():
    """EOS Self-Execution Command Line Interface"""
    pass

@cli.command()
@click.argument('work_item_file', type=click.Path(exists=True))
def process(work_item_file):
    """Process a work item through the entire execution pipeline"""
    eos = EOSMain()
    eos.process_work_item(work_item_file)

@cli.command()
def dashboard():
    """Display the current war room dashboard"""
    eos = EOSMain()
    eos.show_dashboard()

@cli.command()
def list():
    """List all work items and their status"""
    eos = EOSMain()
    eos.list_work_items()

@cli.command()
def audit():
    """Display the complete audit trail"""
    eos = EOSMain()
    eos.get_audit_report()

@cli.command()
@click.argument('work_id')
def show(work_id):
    """Show detailed information about a specific work item"""
    eos = EOSMain()
    if work_id in eos.orchestrator.work_items:
        item = eos.orchestrator.work_items[work_id]
        print(f"\nWork Item: {work_id}")
        print(f"Status: {item.status.value}")
        print(f"Product: {item.product}")
        print(f"User Job: {item.user_job}")
        print(f"Created: {item.created_at}")
        print(f"Updated: {item.updated_at}")
    else:
        print(f"Work item {work_id} not found")

if __name__ == '__main__':
    cli()