#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Constraint Engine Pass
Compiler pass that runs the constraint engine on the bound model and generates a report.
"""
import json
from pathlib import Path
from eke.base import CompilerPass, CompilerContext
from eke.constraint_engine import ConstraintEngine
from eke.constraints import default_constraints
from eke.constraints.base import ConstraintSeverity, ConstraintEvaluationResult


class ConstraintEnginePass(CompilerPass):
    def run(self, context: CompilerContext) -> bool:
        print("  Running constraint engine...")
        if not context.bound_model:
            context.diagnostics.error(
                code="EKL-6001",
                message="Constraint engine requires a BoundModel"
            )
            return False

        engine = ConstraintEngine(registry=default_constraints())
        evaluation_results: list[ConstraintEvaluationResult] = engine.evaluate(context.bound_model)
        context.constraint_results = evaluation_results

        # Collect all violations and report them as diagnostics
        all_violations = []
        for result in evaluation_results:
            all_violations.extend(result.violations)

        for violation in all_violations:
            if violation.severity == ConstraintSeverity.ERROR:
                context.diagnostics.error(
                    code=violation.constraint_id,
                    message=violation.message,
                    object_id=violation.object_id,
                    relationship_id=violation.relationship_id
                )
            elif violation.severity == ConstraintSeverity.WARNING:
                context.diagnostics.warning(
                    code=violation.constraint_id,
                    message=violation.message,
                    object_id=violation.object_id,
                    relationship_id=violation.relationship_id
                )
            elif violation.severity == ConstraintSeverity.INFO:
                context.diagnostics.info(
                    code=violation.constraint_id,
                    message=violation.message,
                    object_id=violation.object_id,
                    relationship_id=violation.relationship_id
                )

        # Generate constraint report
        self._generate_constraint_report(context, evaluation_results)

        print(f"  ✅ Constraint engine evaluated {len(evaluation_results)} constraints with {len(all_violations)} violations")
        return not any(
            result.passed is False and any(v.severity == ConstraintSeverity.ERROR for v in result.violations)
            for result in evaluation_results
        )

    def _generate_constraint_report(self, context: CompilerContext, results: list[ConstraintEvaluationResult]):
        """Generate a JSON constraint report in the output directory."""
        output_dir = Path(__file__).parent.parent / "output"
        output_dir.mkdir(exist_ok=True)
        report_path = output_dir / "constraint-report.json"

        model_name = (
            context.manifest.get("metadata", {}).get("name")
            or context.manifest.get("package", {}).get("name")
            or "unknown-model"
        )

        summary = {
            "constraints": len(results),
            "passed": sum(1 for r in results if r.passed),
            "failed": sum(1 for r in results if not r.passed)
        }

        results_data = []
        for result in results:
            results_data.append({
                "id": result.constraint_id,
                "name": result.constraint_name,
                "description": result.constraint_description,
                "status": "PASS" if result.passed else "FAIL",
                "violations": [
                    {
                        "message": v.message,
                        "severity": v.severity.value,
                        "object_id": v.object_id,
                        "relationship_id": v.relationship_id
                    }
                    for v in result.violations
                ],
                "execution_time_ms": round(result.execution_time_ms, 2)
            })

        report = {
            "model": model_name,
            "summary": summary,
            "results": results_data
        }

        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
