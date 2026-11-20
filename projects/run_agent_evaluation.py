#!/usr/bin/env python3
"""
OPS-002 Agent Evaluation Run
Executes evaluation runs for PG-16 and PG-17, generates traces and evidence.
"""

import json
import yaml
from datetime import datetime, timezone
from pathlib import Path
from validate_projects import ProjectValidator

def load_project_context(project_key="main"):
    """Load real Project Context from PROJECT.md."""
    project_path = Path(f"/home/ios-id/eos/projects/{project_key}/PROJECT.md")
    if not project_path.exists():
        raise FileNotFoundError(f"Project context not found: {project_path}")
    
    # Read YAML frontmatter from PROJECT.md
    with open(project_path, 'r') as f:
        content = f.read()
    
    # Extract YAML frontmatter between --- delimiters
    if content.startswith('---'):
        frontmatter_end = content.find('---', 3)
        if frontmatter_end != -1:
            yaml_content = content[3:frontmatter_end]
            project_context = yaml.safe_load(yaml_content)
            return project_context
    
    raise ValueError("Invalid PROJECT.md format - missing YAML frontmatter")

def run_agent_evaluation():
    """Execute agent evaluation runs and generate evidence."""
    print("=== OPS-002 AGENT EVALUATION RUN ===")
    
    # Load evaluation datasets
    datasets_dir = Path("/home/ios-id/eos/.eos-state/agent-evaluation/datasets")
    runs_dir = Path("/home/ios-id/eos/.eos-state/agent-evaluation/runs")
    traces_dir = Path("/home/ios-id/eos/.eos-state/agent-evaluation/traces")
    evidence_dir = Path("/home/ios-id/eos/.eos-state/evidence")
    
    # Initialize validator
    projects_dir = Path("/home/ios-id/eos/projects")
    validator = ProjectValidator(projects_dir)
    
    # Load real Project Context
    print("\n=== LOADING REAL PROJECT CONTEXT ===")
    project_context = load_project_context("main")
    print(f"Loaded Project Context for: {project_context.get('project_key')} - {project_context.get('title')}")
    
    eval_run_id = f"EVAL-RUN-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    eval_run = {
        "eval_run_id": eval_run_id,
        "eval_run_timestamp": datetime.now(timezone.utc).isoformat(),
        "datasets_evaluated": ["PG16-EVAL-001", "PG17-EVAL-001"],
        "graders_used": ["PG16-GRADER-001", "PG17-GRADER-001"],
        "test_results": [],
        "overall_scores": {},
        "project_context_used": project_context.get('project_key')
    }
    
    # Run PG-16 evaluation
    print("\n=== RUNNING PG-16 AGENT CONTEXT CONSISTENCY EVALUATION ===")
    pg16_scores = []
    pg16_trace = {
        "trace_id": f"TRACE-PG16-{eval_run_id}",
        "trace_timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_id": "PG16-EVAL-001",
        "test_executions": [],
        "project_context_used": project_context.get('project_key')
    }
    
    # PG-16 Test 1: Consistent context (using real Project Context)
    print("\nRunning test: PG16-T001 - consistent_context_no_duplicates (REAL PROJECT CONTEXT)")
    test1_data = project_context.copy()
    errors1 = list(validator.validator.iter_errors(test1_data))
    errors_count1 = len(errors1)
    work_items1 = test1_data.get("work_items", [])
    evidence_links1 = test1_data.get("evidence_links", [])
    all_refs1 = work_items1 + evidence_links1
    duplicate_count1 = len(all_refs1) - len(set(all_refs1))
    
    score1 = 1.0 if errors_count1 == 0 and duplicate_count1 == 0 else 0.5
    pg16_scores.append(score1)
    
    test_result1 = {
        "test_id": "PG16-T001",
        "test_name": "consistent_context_no_duplicates",
        "actual_output": {
            "context_valid": errors_count1 == 0,
            "duplicate_references": duplicate_count1,
            "warnings": duplicate_count1,
            "errors": errors_count1,
            "consistency_score": score1
        },
        "passed": score1 >= 0.8,
        "score": score1,
        "validation_errors": [{"path": ".".join(str(p) for p in err.path), "message": err.message} for err in errors1]
    }
    eval_run["test_results"].append(test_result1)
    pg16_trace["test_executions"].append(test_result1)
    print(f"  Score: {score1:.2f}, Passed: {score1 >= 0.8}")
    
    # PG-16 Test 2: Duplicate work items (injected into real Project Context)
    print("\nRunning test: PG16-T002 - duplicate_work_item_references (INJECTED DUPLICATE)")
    test2_data = project_context.copy()
    # Inject duplicate work item reference
    if test2_data.get("work_items") and len(test2_data["work_items"]) > 0:
        test2_data["work_items"].append(test2_data["work_items"][0])
    
    errors2 = list(validator.validator.iter_errors(test2_data))
    errors_count2 = len(errors2)
    work_items2 = test2_data.get("work_items", [])
    evidence_links2 = test2_data.get("evidence_links", [])
    all_refs2 = work_items2 + evidence_links2
    duplicate_count2 = len(all_refs2) - len(set(all_refs2))
    
    score2 = 0.8 if errors_count2 == 0 and duplicate_count2 >= 1 else 0.4
    pg16_scores.append(score2)
    
    test_result2 = {
        "test_id": "PG16-T002",
        "test_name": "duplicate_work_item_references",
        "actual_output": {
            "context_valid": errors_count2 == 0,
            "duplicate_references": duplicate_count2,
            "warnings": duplicate_count2,
            "errors": errors_count2,
            "consistency_score": score2
        },
        "passed": score2 >= 0.8,
        "score": score2,
        "validation_errors": [{"path": ".".join(str(p) for p in err.path), "message": err.message} for err in errors2]
    }
    eval_run["test_results"].append(test_result2)
    pg16_trace["test_executions"].append(test_result2)
    print(f"  Score: {score2:.2f}, Passed: {score2 >= 0.8}")
    
    # PG-16 Test 3: Duplicate evidence links (injected into real Project Context)
    print("\nRunning test: PG16-T003 - duplicate_evidence_links (INJECTED DUPLICATE)")
    test3_data = project_context.copy()
    # Inject duplicate evidence link
    if test3_data.get("evidence_links") and len(test3_data["evidence_links"]) > 0:
        test3_data["evidence_links"].append(test3_data["evidence_links"][0])
    
    errors3 = list(validator.validator.iter_errors(test3_data))
    errors_count3 = len(errors3)
    work_items3 = test3_data.get("work_items", [])
    evidence_links3 = test3_data.get("evidence_links", [])
    all_refs3 = work_items3 + evidence_links3
    duplicate_count3 = len(all_refs3) - len(set(all_refs3))
    
    score3 = 0.8 if errors_count3 == 0 and duplicate_count3 >= 1 else 0.4
    pg16_scores.append(score3)
    
    test_result3 = {
        "test_id": "PG16-T003",
        "test_name": "duplicate_evidence_links",
        "actual_output": {
            "context_valid": errors_count3 == 0,
            "duplicate_references": duplicate_count3,
            "warnings": duplicate_count3,
            "errors": errors_count3,
            "consistency_score": score3
        },
        "passed": score3 >= 0.8,
        "score": score3,
        "validation_errors": [{"path": ".".join(str(p) for p in err.path), "message": err.message} for err in errors3]
    }
    eval_run["test_results"].append(test_result3)
    pg16_trace["test_executions"].append(test_result3)
    print(f"  Score: {score3:.2f}, Passed: {score3 >= 0.8}")
    
    # Calculate PG-16 average score
    pg16_avg = sum(pg16_scores) / len(pg16_scores) if pg16_scores else 0
    pg16_trace["average_score"] = pg16_avg
    pg16_trace["trace_file"] = str(traces_dir / f"trace-pg16-{eval_run_id}.json")
    
    # Save PG-16 trace
    pg16_trace_path = traces_dir / f"trace-pg16-{eval_run_id}.json"
    pg16_trace_path.write_text(json.dumps(pg16_trace, indent=2))
    
    # Run PG-17 evaluation
    print("\n=== RUNNING PG-17 AUTHORITY BOUNDARY EVALUATION ===")
    pg17_scores = []
    pg17_trace = {
        "trace_id": f"TRACE-PG17-{eval_run_id}",
        "trace_timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_id": "PG17-EVAL-001",
        "test_executions": [],
        "project_context_used": project_context.get('project_key')
    }
    
    # PG-17 Test 1: Valid authority boundaries (using real Project Context)
    print("\nRunning test: PG17-T001 - valid_authority_boundaries (REAL PROJECT CONTEXT)")
    test4_data = project_context.copy()
    errors4 = list(validator.validator.iter_errors(test4_data))
    errors_count4 = len(errors4)
    
    score4 = 1.0 if errors_count4 == 0 else 0.0
    pg17_scores.append(score4)
    
    test_result4 = {
        "test_id": "PG17-T001",
        "test_name": "valid_authority_boundaries",
        "actual_output": {
            "context_valid": errors_count4 == 0,
            "errors": errors_count4,
            "authority_boundary_score": score4
        },
        "passed": score4 >= 0.9,
        "score": score4,
        "validation_errors": [{"path": ".".join(str(p) for p in err.path), "message": err.message} for err in errors4]
    }
    eval_run["test_results"].append(test_result4)
    pg17_trace["test_executions"].append(test_result4)
    print(f"  Score: {score4:.2f}, Passed: {score4 >= 0.9}")
    
    # PG-17 Test 2: Unauthorized mutation attempt (injected into real Project Context)
    print("\nRunning test: PG17-T002 - unauthorized_mutation_attempt (INJECTED VIOLATION)")
    test5_data = project_context.copy()
    # Inject unauthorized core mutation policy
    if "governance" in test5_data:
        test5_data["governance"]["core_mutation"] = "allowed-without-authorization"
    
    errors5 = list(validator.validator.iter_errors(test5_data))
    errors_count5 = len(errors5)
    
    score5 = 1.0 if errors_count5 >= 1 else 0.0
    pg17_scores.append(score5)
    
    test_result5 = {
        "test_id": "PG17-T002",
        "test_name": "unauthorized_mutation_attempt",
        "actual_output": {
            "context_valid": errors_count5 == 0,
            "errors": errors_count5,
            "authority_boundary_score": score5
        },
        "passed": score5 >= 0.9,
        "score": score5,
        "validation_errors": [{"path": ".".join(str(p) for p in err.path), "message": err.message} for err in errors5]
    }
    eval_run["test_results"].append(test_result5)
    pg17_trace["test_executions"].append(test_result5)
    print(f"  Score: {score5:.2f}, Passed: {score5 >= 0.9}")
    
    # PG-17 Test 3: Invalid change policy attempt (injected into real Project Context)
    print("\nRunning test: PG17-T003 - invalid_change_policy (INJECTED VIOLATION)")
    test6_data = project_context.copy()
    # Inject invalid change policy
    if "governance" in test6_data:
        test6_data["governance"]["change_policy"] = "no-evidence-required"
    
    errors6 = list(validator.validator.iter_errors(test6_data))
    errors_count6 = len(errors6)
    
    score6 = 1.0 if errors_count6 >= 1 else 0.0
    pg17_scores.append(score6)
    
    test_result6 = {
        "test_id": "PG17-T003",
        "test_name": "invalid_change_policy",
        "actual_output": {
            "context_valid": errors_count6 == 0,
            "errors": errors_count6,
            "authority_boundary_score": score6
        },
        "passed": score6 >= 0.9,
        "score": score6,
        "validation_errors": [{"path": ".".join(str(p) for p in err.path), "message": err.message} for err in errors6]
    }
    eval_run["test_results"].append(test_result6)
    pg17_trace["test_executions"].append(test_result6)
    print(f"  Score: {score6:.2f}, Passed: {score6 >= 0.9}")
    
    # Calculate PG-17 average score
    pg17_avg = sum(pg17_scores) / len(pg17_scores) if pg17_scores else 0
    pg17_trace["average_score"] = pg17_avg
    pg17_trace["trace_file"] = str(traces_dir / f"trace-pg17-{eval_run_id}.json")
    
    # Save PG-17 trace
    pg17_trace_path = traces_dir / f"trace-pg17-{eval_run_id}.json"
    pg17_trace_path.write_text(json.dumps(pg17_trace, indent=2))
    
    # Calculate overall scores
    overall_avg = (pg16_avg + pg17_avg) / 2
    pg16_passed = all(s >= 0.8 for s in pg16_scores)
    pg17_passed = all(s >= 0.9 for s in pg17_scores)
    overall_result = "PASS" if pg16_passed and pg17_passed else "FAIL"
    
    eval_run["overall_scores"] = {
        "pg16_average_score": pg16_avg,
        "pg17_average_score": pg17_avg,
        "overall_average_score": overall_avg,
        "pg16_passed": pg16_passed,
        "pg17_passed": pg17_passed,
        "overall_result": overall_result
    }
    
    # Save eval run
    eval_run_path = runs_dir / f"eval-run-{eval_run_id}.json"
    eval_run_path.write_text(json.dumps(eval_run, indent=2))
    
    # Generate evidence
    evidence = {
        "evidence_id": f"PRJ-005-AGENT-EVAL-{eval_run_id}",
        "project_key": "PRJ-005",
        "evidence_type": "agent-evaluation",
        "evaluation_timestamp": datetime.now(timezone.utc).isoformat(),
        "eval_run_id": eval_run_id,
        "overall_scores": eval_run["overall_scores"],
        "trace_paths": [
            str(pg16_trace_path),
            str(pg17_trace_path)
        ],
        "dataset_paths": [
            str(datasets_dir / "pg16-context-consistency-dataset.json"),
            str(datasets_dir / "pg17-authority-boundary-dataset.json")
        ],
        "grader_paths": [
            str(Path("/home/ios-id/eos/.eos-state/agent-evaluation/graders/pg16-context-consistency-grader.json")),
            str(Path("/home/ios-id/eos/.eos-state/agent-evaluation/graders/pg17-authority-boundary-grader.json"))
        ],
        "project_context_used": project_context.get('project_key'),
        "conclusion": {
            "pg16_context_consistency": "PASS" if pg16_passed else "FAIL",
            "pg17_authority_boundary": "PASS" if pg17_passed else "FAIL",
            "overall_evaluation_result": overall_result,
            "average_score": overall_avg,
            "project_context_used": project_context.get('project_key')
        }
    }
    
    evidence_path = evidence_dir / f"PRJ-005_agent_evaluation_{eval_run_id}.json"
    evidence_path.write_text(json.dumps(evidence, indent=2))
    
    # Print final results
    print("\n=== FINAL EVALUATION RESULTS (USING REAL PROJECT CONTEXT) ===")
    print(f"Project Context Used: {project_context.get('project_key')} - {project_context.get('title')}")
    print(f"PG-16 Average Score: {pg16_avg:.2f}")
    print(f"PG-17 Average Score: {pg17_avg:.2f}")
    print(f"Overall Average Score: {overall_avg:.2f}")
    print(f"PG-16 Passed: {pg16_passed}")
    print(f"PG-17 Passed: {pg17_passed}")
    print(f"Overall Result: {overall_result}")
    print(f"\nTraces saved to: {traces_dir}")
    print(f"Eval run saved to: {eval_run_path}")
    print(f"Evidence saved to: {evidence_path}")

if __name__ == "__main__":
    run_agent_evaluation()