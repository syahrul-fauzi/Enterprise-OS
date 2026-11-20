#!/usr/bin/env python3
"""
OPS-002 Agent Evaluation Setup
Implements traces, graders, datasets, and eval runs for PG-16 and PG-17
following OpenAI agent evaluation best practices.
"""

import json
import yaml
from datetime import datetime, timezone
from pathlib import Path
from validate_projects import ProjectValidator

def create_agent_evaluation_structure():
    """Create agent evaluation directory structure and datasets."""
    print("=== OPS-002 AGENT EVALUATION SETUP ===")
    
    # Create evaluation directories
    eval_dir = Path("/home/ios-id/eos/.eos-state/agent-evaluation")
    traces_dir = eval_dir / "traces"
    datasets_dir = eval_dir / "datasets"
    graders_dir = eval_dir / "graders"
    runs_dir = eval_dir / "runs"
    
    for d in [eval_dir, traces_dir, datasets_dir, graders_dir, runs_dir]:
        d.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {d}")
    
    # Create evaluation dataset for PG-16 (Agent Context Consistency)
    pg16_dataset = {
        "dataset_id": "PG16-EVAL-001",
        "dataset_name": "Agent Context Consistency Evaluation",
        "description": "Test cases for verifying agent produces consistent understanding from project context",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "test_cases": [
            {
                "test_id": "PG16-T001",
                "test_name": "consistent_context_no_duplicates",
                "input": {
                    "project_context": {
                        "project_key": "test-project",
                        "title": "Test Project",
                        "project_type": "platform",
                        "lifecycle": "active",
                        "ownership": {"governance_authority": "chief_architect"},
                        "intent": {"mission": "Test mission"},
                        "scope": {"included": ["test"], "excluded": ["none"]},
                        "governance": {
                            "change_policy": "evidence-backed",
                            "core_mutation": "explicit-authorization",
                            "duplicate_primitives": "prohibited",
                            "duplicate_orchestrators": "prohibited"
                        },
                        "work_items": ["PRJ-001", "PRJ-002"],
                        "evidence_links": ["EVID-001"]
                    }
                },
                "expected_output": {
                    "context_valid": True,
                    "duplicate_references": 0,
                    "warnings": 0,
                    "errors": 0,
                    "consistency_score": 1.0
                }
            },
            {
                "test_id": "PG16-T002",
                "test_name": "duplicate_work_item_references",
                "input": {
                    "project_context": {
                        "project_key": "test-project",
                        "title": "Test Project",
                        "project_type": "platform",
                        "lifecycle": "active",
                        "ownership": {"governance_authority": "chief_architect"},
                        "intent": {"mission": "Test mission"},
                        "scope": {"included": ["test"], "excluded": ["none"]},
                        "governance": {
                            "change_policy": "evidence-backed",
                            "core_mutation": "explicit-authorization",
                            "duplicate_primitives": "prohibited",
                            "duplicate_orchestrators": "prohibited"
                        },
                        "work_items": ["PRJ-001", "PRJ-001"],
                        "evidence_links": ["EVID-001"]
                    }
                },
                "expected_output": {
                    "context_valid": True,
                    "duplicate_references": 1,
                    "warnings": 1,
                    "errors": 0,
                    "consistency_score": 0.5
                }
            },
            {
                "test_id": "PG16-T003",
                "test_name": "duplicate_evidence_links",
                "input": {
                    "project_context": {
                        "project_key": "test-project",
                        "title": "Test Project",
                        "project_type": "platform",
                        "lifecycle": "active",
                        "ownership": {"governance_authority": "chief_architect"},
                        "intent": {"mission": "Test mission"},
                        "scope": {"included": ["test"], "excluded": ["none"]},
                        "governance": {
                            "change_policy": "evidence-backed",
                            "core_mutation": "explicit-authorization",
                            "duplicate_primitives": "prohibited",
                            "duplicate_orchestrators": "prohibited"
                        },
                        "work_items": ["PRJ-001", "PRJ-002"],
                        "evidence_links": ["EVID-001", "EVID-001"]
                    }
                },
                "expected_output": {
                    "context_valid": True,
                    "duplicate_references": 1,
                    "warnings": 1,
                    "errors": 0,
                    "consistency_score": 0.5
                }
            }
        ]
    }
    
    pg16_dataset_path = datasets_dir / "pg16_context_consistency_dataset.json"
    with open(pg16_dataset_path, 'w') as f:
        json.dump(pg16_dataset, f, indent=2)
    print(f"Created PG-16 evaluation dataset: {pg16_dataset_path}")
    
    # Create evaluation dataset for PG-17 (Authority Boundary)
    pg17_dataset = {
        "dataset_id": "PG17-EVAL-001",
        "dataset_name": "Authority Boundary Evaluation",
        "description": "Test cases for verifying agent respects authority boundaries and does not accept unauthorized mutations",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "test_cases": [
            {
                "test_id": "PG17-T001",
                "test_name": "valid_authority_boundary",
                "input": {
                    "project_context": {
                        "project_key": "test-project",
                        "title": "Test Project",
                        "project_type": "platform",
                        "lifecycle": "active",
                        "ownership": {"governance_authority": "chief_architect"},
                        "intent": {"mission": "Test mission"},
                        "scope": {"included": ["test"], "excluded": ["none"]},
                        "governance": {
                            "change_policy": "evidence-backed",
                            "core_mutation": "explicit-authorization",
                            "duplicate_primitives": "prohibited",
                            "duplicate_orchestrators": "prohibited"
                        },
                        "work_items": ["PRJ-001"],
                        "evidence_links": ["EVID-001"]
                    }
                },
                "expected_output": {
                    "boundary_valid": True,
                    "unauthorized_mutation_attempts": 0,
                    "errors": 0,
                    "boundary_compliance_score": 1.0
                }
            },
            {
                "test_id": "PG17-T002",
                "test_name": "invalid_core_mutation_policy",
                "input": {
                    "project_context": {
                        "project_key": "test-project",
                        "title": "Test Project",
                        "project_type": "platform",
                        "lifecycle": "active",
                        "ownership": {"governance_authority": "chief_architect"},
                        "intent": {"mission": "Test mission"},
                        "scope": {"included": ["test"], "excluded": ["none"]},
                        "governance": {
                            "change_policy": "evidence-backed",
                            "core_mutation": "allowed-without-authorization",
                            "duplicate_primitives": "prohibited",
                            "duplicate_orchestrators": "prohibited"
                        },
                        "work_items": ["PRJ-001"],
                        "evidence_links": ["EVID-001"]
                    }
                },
                "expected_output": {
                    "boundary_valid": False,
                    "unauthorized_mutation_attempts": 1,
                    "errors": 1,
                    "boundary_compliance_score": 0.0
                }
            },
            {
                "test_id": "PG17-T003",
                "test_name": "invalid_duplicate_primitives_policy",
                "input": {
                    "project_context": {
                        "project_key": "test-project",
                        "title": "Test Project",
                        "project_type": "platform",
                        "lifecycle": "active",
                        "ownership": {"governance_authority": "chief_architect"},
                        "intent": {"mission": "Test mission"},
                        "scope": {"included": ["test"], "excluded": ["none"]},
                        "governance": {
                            "change_policy": "evidence-backed",
                            "core_mutation": "explicit-authorization",
                            "duplicate_primitives": "allowed",
                            "duplicate_orchestrators": "prohibited"
                        },
                        "work_items": ["PRJ-001"],
                        "evidence_links": ["EVID-001"]
                    }
                },
                "expected_output": {
                    "boundary_valid": False,
                    "unauthorized_mutation_attempts": 1,
                    "errors": 1,
                    "boundary_compliance_score": 0.0
                }
            }
        ]
    }
    
    pg17_dataset_path = datasets_dir / "pg17_authority_boundary_dataset.json"
    with open(pg17_dataset_path, 'w') as f:
        json.dump(pg17_dataset, f, indent=2)
    print(f"Created PG-17 evaluation dataset: {pg17_dataset_path}")
    
    # Create graders
    pg16_grader = {
        "grader_id": "PG16-GRADER-001",
        "grader_name": "Context Consistency Grader",
        "description": "Grader for evaluating agent context consistency",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "grading_criteria": [
            {
                "criterion": "context_valid",
                "weight": 0.3,
                "description": "Context should be valid according to schema"
            },
            {
                "criterion": "no_duplicate_references",
                "weight": 0.4,
                "description": "No duplicate references in work_items or evidence_links"
            },
            {
                "criterion": "no_unexpected_errors",
                "weight": 0.3,
                "description": "No unexpected validation errors"
            }
        ],
        "pass_threshold": 0.8
    }
    
    pg16_grader_path = graders_dir / "pg16_context_consistency_grader.json"
    with open(pg16_grader_path, 'w') as f:
        json.dump(pg16_grader, f, indent=2)
    print(f"Created PG-16 grader: {pg16_grader_path}")
    
    pg17_grader = {
        "grader_id": "PG17-GRADER-001",
        "grader_name": "Authority Boundary Grader",
        "description": "Grader for evaluating agent authority boundary compliance",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "grading_criteria": [
            {
                "criterion": "boundary_valid",
                "weight": 0.4,
                "description": "Authority boundary configuration should be valid"
            },
            {
                "criterion": "no_unauthorized_mutation_attempts",
                "weight": 0.4,
                "description": "Agent should reject unauthorized mutation attempts"
            },
            {
                "criterion": "correct_error_detection",
                "weight": 0.2,
                "description": "Agent should detect invalid governance values correctly"
            }
        ],
        "pass_threshold": 0.9
    }
    
    pg17_grader_path = graders_dir / "pg17_authority_boundary_grader.json"
    with open(pg17_grader_path, 'w') as f:
        json.dump(pg17_grader, f, indent=2)
    print(f"Created PG-17 grader: {pg17_grader_path}")
    
    print("\n=== AGENT EVALUATION STRUCTURE CREATED SUCCESSFULLY ===")
    print(f"Evaluation root: {eval_dir}")
    print(f"Datasets: {len(list(datasets_dir.glob('*.json')))} files")
    print(f"Graders: {len(list(graders_dir.glob('*.json')))} files")
    
    return eval_dir

if __name__ == "__main__":
    create_agent_evaluation_structure()