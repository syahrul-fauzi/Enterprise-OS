#!/usr/bin/env python3
from pathlib import Path
import json
from eke.passes import CompilerContext, PassPipeline
from eke.loader_pass import PackageLoaderPass
from eke.schema_validation_pass import SchemaValidationPass
from eke.semantic_validation_pass import SemanticValidationPass
from eke.symbol_resolution_pass import SymbolResolutionPass
from eke.reference_resolution_pass import ReferenceResolutionPass
from eke.constraint_engine_pass import ConstraintEnginePass
from eke.graph_builder import GraphBuilderPass
from eke.ir_builder_pass import IRBuilderPass
from eke.reasoning_pass import ReasoningPass
from eke.projection_engine import MarkdownDocumentationGenerator


def main():
    repo_root = Path(__file__).parent.parent.parent
    schema_dir = repo_root / "enterprise" / "schema"
    package_dir = repo_root / "enterprise" / "knowledge" / "packages" / "customer-management-v1"
    output_dir = repo_root / "implementation" / "eke" / "output"

    # Create output dir if it doesn't exist
    output_dir.mkdir(exist_ok=True)

    context = CompilerContext()
    pipeline = PassPipeline(context)

    # Add passes
    pipeline.add_pass(PackageLoaderPass(package_dir))
    pipeline.add_pass(SchemaValidationPass(schema_dir))
    pipeline.add_pass(SemanticValidationPass())
    pipeline.add_pass(SymbolResolutionPass())
    pipeline.add_pass(ReferenceResolutionPass())
    pipeline.add_pass(ConstraintEnginePass())
    pipeline.add_pass(GraphBuilderPass())
    pipeline.add_pass(IRBuilderPass())
    pipeline.add_pass(ReasoningPass())

    # Run pipeline
    if pipeline.run():
        print("\n=== Running Projections ===")
        doc_generator = MarkdownDocumentationGenerator(context.enterprise_ir, output_dir)
        doc_generator.generate()
        
        print("\n=== Saving Artifacts ===")
        # Save all artifacts to JSON files
        for artifact in context.artifacts.all():
            artifact_path = output_dir / f"{artifact.metadata.name}.json"
            with open(artifact_path, "w") as f:
                json.dump(artifact.to_dict(), f, indent=2)
            print(f"  ✅ Saved {artifact.metadata.kind.value}: {artifact_path}")
        
        print("\n✅ All tasks completed successfully!")
        return 0
    else:
        return 1


if __name__ == "__main__":
    exit(main())
