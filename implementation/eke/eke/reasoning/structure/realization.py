#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Capability Realization Reasoning
Infers indirect support relationships between capabilities and platforms
"""
from __future__ import annotations
from typing import List
from eke.ir import IRRelationship, Provenance
from eke.reasoning.base import InferenceRule
from eke.ir.views.enterprise_ir_view import EnterpriseIRView
from eke.relationship_types import RelationshipTypes
from eke.rules import RuleMetadata


class CapabilityIndirectSupportRule(InferenceRule):
    metadata = RuleMetadata(
        id="EKL-R-001",
        name="Capability Indirect Support",
        description="Infers indirectly_supported_by relationships between capabilities and platforms",
        category="capability",
        domain="structure",
        type="inference",
        produces=["relationships"]
    )

    def execute(self, view: EnterpriseIRView) -> List[IRRelationship]:
        inferred_relationships: List[IRRelationship] = []

        for capability in view.capabilities():
            services = view.realizations(capability)
            for service in services:
                # Find the actual source relationship (capability -> service)
                source_rels = view.outgoing_relationships(capability, RelationshipTypes.REALIZES)
                for service_rel in source_rels:
                    platforms = view.implementations(service)
                    for platform in platforms:
                        # Find the actual source relationship (service -> platform)
                        implementation_rels = view.outgoing_relationships(service, RelationshipTypes.IMPLEMENTED_BY)
                        for impl_rel in implementation_rels:
                            rel_id = f"urn:ekl:relationship:derived:{capability.id}:{platform.id}"
                            inferred_rel = IRRelationship(
                                id=rel_id,
                                type=RelationshipTypes.INDIRECTLY_SUPPORTED_BY,
                                source=capability.id,
                                target=platform.id,
                                provenance=Provenance(
                                    rule_id=self.metadata.id,
                                    rule_version=self.metadata.version,
                                    sources=[service_rel.id, impl_rel.id],
                                    explanation=f"Inferred because capability {capability.id} is realized by service {service.id}, which is implemented by platform {platform.id}"
                                )
                            )
                            inferred_relationships.append(inferred_rel)

        return inferred_relationships


def infer_indirect_support(view: EnterpriseIRView) -> List[IRRelationship]:
    return CapabilityIndirectSupportRule().execute(view)
