#!/usr/bin/env python3
"""
Conformance test suite for EKL Compiler.
Tests that customer-management-v1 compiles successfully with all passes.
"""
import sys
from pathlib import Path


def test_customer_management_v1_conformance():
    repo_root = Path(__file__).parent.parent.parent.parent
    schema_dir = repo_root / "enterprise" / "schema"
    package_dir = repo_root / "enterprise" / "knowledge" / "packages" / "customer-management-v1"
    output_dir = repo_root / "implementation" / "eke" / "output" / "test"

    sys.path.insert(0, str(repo_root / "implementation" / "eke"))

    from eke.passes import CompilerContext, PassPipeline
    from eke.loader_pass import PackageLoaderPass
    from eke.schema_validation_pass import SchemaValidationPass
    from eke.profiles import KNOWLEDGE_PROFILE
    from eke.projection_engine import MarkdownDocumentationGenerator

    context = CompilerContext()
    pipeline = PassPipeline(context)

    # Add passes from KNOWLEDGE_PROFILE
    for pass_class in KNOWLEDGE_PROFILE.passes:
        if pass_class == PackageLoaderPass:
            pipeline.add_pass(PackageLoaderPass(package_dir))
        elif pass_class == SchemaValidationPass:
            pipeline.add_pass(SchemaValidationPass(schema_dir))
        else:
            pipeline.add_pass(pass_class())

    assert pipeline.run(), "Conformance test failed"
    assert context.canonical_graph is not None
    assert context.enterprise_ir is not None
    assert context.knowledge_graph is not None
    assert len(context.canonical_graph.nodes) == 9
    assert len(context.canonical_graph.edges) == 5
    assert len(context.enterprise_ir.relationships) == 6  # EnterpriseIR now includes inferred relationships
    assert len(context.knowledge_graph.declared_edges) == 5
    assert len(context.knowledge_graph.inferred_edges) == 1
    
    # Check that we have both knowledge_graph and knowledge_package artifacts
    from eke.artifacts import ArtifactKind
    assert len(context.artifacts.find_by_kind(ArtifactKind.KNOWLEDGE_GRAPH)) == 1
    assert len(context.artifacts.find_by_kind(ArtifactKind.KNOWLEDGE_PACKAGE)) == 1

    # Test that projections work
    doc_generator = MarkdownDocumentationGenerator(context.enterprise_ir, output_dir)
    doc_generator.generate()

    output_file = output_dir / "enterprise_knowledge.md"
    assert output_file.exists()
