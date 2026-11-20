import sys
from pathlib import Path

# Add the skills directory to path
skills_dir = Path(__file__).parent / "skills"
sys.path.insert(0, str(skills_dir))

# Try importing state_utils first
from state_utils import state_path, get_repository_root

# Import Command Center from its specific path
import importlib.util
command_center_path = skills_dir / "eos-command-center" / "main.py"
spec = importlib.util.spec_from_file_location("command_center", command_center_path)
command_center_module = importlib.util.module_from_spec(spec)
sys.modules["command_center"] = command_center_module
spec.loader.exec_module(command_center_module)
CommandCenter = command_center_module.CommandCenter

# Import Self-Execution Orchestrator from its specific path
orchestrator_path = skills_dir / "eos-self-execution" / "orchestrator.py"
spec = importlib.util.spec_from_file_location("orchestrator", orchestrator_path)
orchestrator_module = importlib.util.module_from_spec(spec)
sys.modules["orchestrator"] = orchestrator_module
spec.loader.exec_module(orchestrator_module)
EOSOrchestrator = orchestrator_module.EOSOrchestrator

# Initialize orchestrators
cc = CommandCenter()
se_orch = EOSOrchestrator()

# Get War Room Dashboard
dashboard = se_orch.get_war_room_dashboard()
print("=== WAR ROOM DASHBOARD ===")
for key, value in dashboard.items():
    print(f"  {key}: {value}")

# Check work items
print("\n=== WORK ITEMS ===")
for work_id, work_item in se_orch.work_items.items():
    print(f"  {work_id}:")
    print(f"    Status: {work_item.status.value}")
    print(f"    User job: {work_item.user_job}")
    print(f"    Created at: {work_item.created_at}")
    print(f"    Updated at: {work_item.updated_at}")

# Check saved state file
state_file = state_path("workitems.json")
print(f"\n=== SAVED STATE FILE ===")
print(f"State file path: {state_file}")
if state_file.exists():
    import json
    with open(state_file, 'r') as f:
        saved_state = json.load(f)
        print(f"Saved work items: {list(saved_state.keys())}")
        for work_id, data in saved_state.items():
            print(f"  {work_id}: status={data['status']}")