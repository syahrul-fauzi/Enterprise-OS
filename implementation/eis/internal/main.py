#!/usr/bin/env python3
"""
Enterprise Intelligence Services (EIS)
"""
import argparse
import logging
from pathlib import Path
import json

from eke.artifacts import Artifact, ArtifactRegistry, ArtifactKind, KnowledgePackage
from eke.knowledge_graph import KnowledgeGraph

from eis.services.register import register_all_services
from eis.engine import EnterpriseIntelligenceEngine


def load_artifact(artifact_path: Path):
    """Load an artifact from JSON file"""
    with open(artifact_path, "r") as f:
        artifact_dict = json.load(f)
        return Artifact.from_dict(artifact_dict)


def main():
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # Argument parser
    parser = argparse.ArgumentParser(
        description="Enterprise Intelligence Services (EIS)"
    )
    parser.add_argument(
        "--input-dir",
        "-i",
        type=Path,
        default=Path("/root/Enterprise-OS/implementation/eke/output"),
        help="Directory containing EKE artifacts (default: eke/output)"
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        type=Path,
        default=Path("/root/Enterprise-OS/implementation/eis/output"),
        help="Directory to write EIS artifacts (default: eis/output)"
    )
    args = parser.parse_args()

    # Ensure output dir exists
    args.output_dir.mkdir(exist_ok=True)

    # Register all services
    register_all_services()

    # Load EKE artifacts from input directory
    artifacts = ArtifactRegistry()

    # Load knowledge package and knowledge graph
    knowledge_package_path = args.input_dir / "knowledge_package.json"
    knowledge_graph_path = args.input_dir / "knowledge_graph.json"

    if not (knowledge_package_path.exists() and knowledge_graph_path.exists()):
        logging.error("Could not find knowledge_package.json or knowledge_graph.json in %s", args.input_dir)
        return 1

    logging.info("Loading artifacts from %s", args.input_dir)

    # Load knowledge package artifact
    kp_artifact = load_artifact(knowledge_package_path)
    artifacts.add(kp_artifact)

    # Load knowledge graph artifact
    kg_artifact = load_artifact(knowledge_graph_path)
    artifacts.add(kg_artifact)

    knowledge_package = kp_artifact.payload
    knowledge_graph = kg_artifact.payload

    # Run Enterprise Intelligence Engine
    logging.info("Running Enterprise Intelligence Engine")
    ei_engine = EnterpriseIntelligenceEngine()
    ei_package = ei_engine.execute(
        knowledge_package=knowledge_package,
        knowledge_graph=knowledge_graph,
        artifacts=artifacts,
        domains=["governance", "risk", "planning", "lifecycle", "compliance"],
    )

    # Create artifact for enterprise intelligence package
    ei_package_artifact = Artifact(
        metadata=ArtifactMetadata(
            name="enterprise-intelligence-package",
            kind=ArtifactKind.ENTERPRISE_INTELLIGENCE_PACKAGE,
            version="0.1.0",
            generated_by="EnterpriseIntelligenceEngine",
            depends_on=["knowledge_package", "knowledge_graph"],
        ),
        payload=ei_package,
    )
    artifacts.add(ei_package_artifact)

    # Add all generated artifacts
    for artifact in ei_package.generated_artifacts:
        artifacts.add(artifact)

    # Save all EIS artifacts to output dir
    logging.info("Saving artifacts to %s", args.output_dir)
    for artifact in artifacts.all():
        artifact_path = args.output_dir / f"{artifact.metadata.name}.json"
        with open(artifact_path, "w") as f:
            json.dump(artifact.to_dict(), f, indent=2)
        print(f"  ✅ Saved {artifact.metadata.kind.value}: {artifact_path}")

    print("\n✅ All tasks completed successfully!")
    return 0


if __name__ == "__main__":
    exit(main())
