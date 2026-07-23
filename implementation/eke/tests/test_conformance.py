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
    from eke.semantic_validation_pass import SemanticValidationPass
    from eke.symbol_resolution_pass import SymbolResolutionPass
    from eke.reference_resolution_pass import ReferenceResolutionPass
    from eke.constraint_engine_pass import ConstraintEnginePass
    from eke.graph_builder import GraphBuilderPass
    from eke.ir_builder_pass import IRBuilderPass
    from eke.reasoning_pass import ReasoningPass
    from eke.projection_engine import MarkdownDocumentationGenerator

    context = CompilerContext()
    pipeline = PassPipeline(context)

    pipeline.add_pass(PackageLoaderPass(package_dir))
    pipeline.add_pass(SchemaValidationPass(schema_dir))
    pipeline.add_pass(SemanticValidationPass())
    pipeline.add_pass(SymbolResolutionPass())
    pipeline.add_pass(ReferenceResolutionPass())
    pipeline.add_pass(ConstraintEnginePass())
    pipeline.add_pass(GraphBuilderPass())
    pipeline.add_pass(IRBuilderPass())
    pipeline.add_pass(ReasoningPass())

    assert pipeline.run(), "Conformance test failed"
    assert context.canonical_graph is not None
    assert context.enterprise_ir is not None
    assert context.knowledge_graph is not None
    assert len(context.canonical_graph.nodes) == 9
    assert len(context.canonical_graph.edges) == 5
    assert len(context.enterprise_ir.relationships) == 5  # EnterpriseIR no longer gets inferred rels added
    assert len(context.knowledge_graph.declared_edges) == 5
    assert len(context.knowledge_graph.inferred_edges) == 1

    # Test that projections work
    doc_generator = MarkdownDocumentationGenerator(context.enterprise_ir, output_dir)
    doc_generator.generate()

    output_file = output_dir / "enterprise_knowledge.md"
    assert output_file.exists()
