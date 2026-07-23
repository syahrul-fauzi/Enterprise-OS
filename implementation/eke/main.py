#!/usr/bin/env python3
import argparse
import logging
from pathlib import Path
import json
from eke.passes import CompilerContext, PassPipeline
from eke.loader_pass import PackageLoaderPass
from eke.schema_validation_pass import SchemaValidationPass
from eke.profiles import PROFILES, DEFAULT_PROFILE
from eke.projection_engine import MarkdownDocumentationGenerator
from eke.artifacts import Artifact, ArtifactKind


def main():
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # Argument parser for profile selection
    parser = argparse.ArgumentParser(
        description="Enterprise Knowledge Engine (EKL) Compiler"
    )
    parser.add_argument(
        "--profile",
        "-p",
        type=str,
        choices=list(PROFILES.keys()),
        default=DEFAULT_PROFILE.name,
        help=f"Compiler profile to use (default: {DEFAULT_PROFILE.name})"
    )
    args = parser.parse_args()

    # Get selected profile
    profile = PROFILES.get(args.profile, DEFAULT_PROFILE)

    repo_root = Path(__file__).parent.parent.parent
    schema_dir = repo_root / "enterprise" / "schema"
    package_dir = repo_root / "enterprise" / "knowledge" / "packages" / "customer-management-v1"
    output_dir = repo_root / "implementation" / "eke" / "output"

    # Create output dir if it doesn't exist
    output_dir.mkdir(exist_ok=True)

    context = CompilerContext()
    pipeline = PassPipeline(context)

    print(f"=== Using compiler profile: {profile.name} ===")

    # Add passes from profile, handling PackageLoaderPass and SchemaValidationPass specially
    for pass_class in profile.passes:
        if pass_class == PackageLoaderPass:
            pipeline.add_pass(PackageLoaderPass(package_dir))
        elif pass_class == SchemaValidationPass:
            pipeline.add_pass(SchemaValidationPass(schema_dir))
        else:
            pipeline.add_pass(pass_class())

    # Run pipeline
    if pipeline.run():
        # Only run MarkdownDocumentationGenerator if we have EnterpriseIR (e.g., knowledge profile)
        if context.enterprise_ir:
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
