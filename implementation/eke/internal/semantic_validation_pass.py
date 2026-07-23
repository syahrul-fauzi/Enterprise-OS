#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Semantic Validation Pass
Validates semantic consistency: relationship type compatibility, cardinality, etc.
"""
from typing import Dict, Set
from eke.passes import CompilerPass, CompilerContext
from eke.relationship_types import RelationshipTypes


# Relationship Type Registry: maps relationship type to allowed source types and target types
RELATIONSHIP_TYPE_REGISTRY: Dict[str, Dict[str, Set[str]]] = {
    RelationshipTypes.REALIZES: {
        "source_types": {"BusinessCapability"},
        "target_types": {"BusinessService"}
    },
    RelationshipTypes.IMPLEMENTED_BY: {
        "source_types": {"BusinessService"},
        "target_types": {"PlatformCapability"}
    },
    RelationshipTypes.OWNS: {
        "source_types": {"Actor"},
        "target_types": {"BusinessCapability", "BusinessService", "PlatformCapability", "Policy", "Evidence"}
    },
    RelationshipTypes.GOVERNS: {
        "source_types": {"Actor"},
        "target_types": {"BusinessCapability", "BusinessService", "PlatformCapability", "Policy"}
    },
    RelationshipTypes.APPLIES_TO: {
        "source_types": {"Policy"},
        "target_types": {"BusinessCapability", "BusinessService", "PlatformCapability"}
    },
    RelationshipTypes.INDIRECTLY_SUPPORTED_BY: {  # This is a derived relationship
        "source_types": {"BusinessCapability"},
        "target_types": {"PlatformCapability"}
    }
}


def get_object_type(obj_data: Dict) -> str:
    """Helper to get object type from loaded object data"""
    return obj_data.get("canonical", {}).get("type") or obj_data.get("semantics", {}).get("type")


def get_relationship_type(rel_data: Dict) -> str:
    """Helper to get relationship type from loaded relationship data"""
    return rel_data.get("relationship", {}).get("type")


def get_relationship_source(rel_data: Dict) -> str:
    """Helper to get relationship source from loaded relationship data"""
    return rel_data.get("relationship", {}).get("source")


def get_relationship_target(rel_data: Dict) -> str:
    """Helper to get relationship target from loaded relationship data"""
    return rel_data.get("relationship", {}).get("target")


class SemanticValidationPass(CompilerPass):
    def run(self, context: CompilerContext) -> bool:
        print("  Running semantic validation...")
        objects = context.objects
        relationships = context.relationships

        # Build a map of object_id to its type for quick lookup
        object_types_by_id = {}
        for obj_id, obj_data in objects.items():
            obj_type = get_object_type(obj_data)
            if obj_type:
                object_types_by_id[obj_id] = obj_type

        # Validate 1: Check that all objects have valid types (from known library types)
        valid_object_types = {"BusinessCapability", "BusinessService", "PlatformCapability", "Actor", "Policy", "Evidence"}
        for obj_id, obj_data in objects.items():
            obj_type = get_object_type(obj_data)
            if not obj_type or obj_type not in valid_object_types:
                context.diagnostics.error(
                    code="EKL-2001",
                    message="Invalid or missing object type",
                    object_id=obj_id,
                    details=f"Type '{obj_type}' is not a valid EKL object type" if obj_type else "Object type is missing"
                )

        # Validate 2: Check relationship type is registered
        for rel_id, rel_data in relationships.items():
            rel_type = get_relationship_type(rel_data)
            if not rel_type or rel_type not in RELATIONSHIP_TYPE_REGISTRY:
                context.diagnostics.error(
                    code="EKL-2002",
                    message="Unknown or missing relationship type",
                    relationship_id=rel_id,
                    details=f"Relationship type '{rel_type}' is not registered" if rel_type else "Relationship type is missing"
                )
                continue  # Skip further checks for invalid type

            # Get valid source and target types for this relationship
            valid_sources = RELATIONSHIP_TYPE_REGISTRY[rel_type]["source_types"]
            valid_targets = RELATIONSHIP_TYPE_REGISTRY[rel_type]["target_types"]

            # Get source and target ids from relationship
            source_id = get_relationship_source(rel_data)
            target_id = get_relationship_target(rel_data)

            # Validate 3: Check that source object exists and has valid type
            if source_id:
                if source_id not in object_types_by_id:
                    context.diagnostics.error(
                        code="EKL-2003",
                        message="Relationship source not found",
                        relationship_id=rel_id,
                        details=f"Source: {source_id}"
                    )
                else:
                    source_type = object_types_by_id[source_id]
                    if source_type not in valid_sources:
                        context.diagnostics.error(
                            code="EKL-2003",
                            message="Invalid source type for relationship",
                            relationship_id=rel_id,
                            details=f"Source type '{source_type}' is not valid for relationship type '{rel_type}'"
                        )
            else:
                context.diagnostics.error(
                    code="EKL-2003",
                    message="Relationship source missing",
                    relationship_id=rel_id
                )

            # Validate 4: Check that target object exists and has valid type
            if target_id:
                if target_id not in object_types_by_id:
                    context.diagnostics.error(
                        code="EKL-2004",
                        message="Relationship target not found",
                        relationship_id=rel_id,
                        details=f"Target: {target_id}"
                    )
                else:
                    target_type = object_types_by_id[target_id]
                    if target_type not in valid_targets:
                        context.diagnostics.error(
                            code="EKL-2004",
                            message="Invalid target type for relationship",
                            relationship_id=rel_id,
                            details=f"Target type '{target_type}' is not valid for relationship type '{rel_type}'"
                        )
            else:
                context.diagnostics.error(
                    code="EKL-2004",
                    message="Relationship target missing",
                    relationship_id=rel_id
                )

        # Validate 5: Check for duplicate relationships (same source-target-type)
        seen_relationships = set()
        for rel_id, rel_data in relationships.items():
            rel_type = get_relationship_type(rel_data)
            source_id = get_relationship_source(rel_data)
            target_id = get_relationship_target(rel_data)
            key = (source_id, target_id, rel_type)
            if key in seen_relationships:
                context.diagnostics.warning(
                    code="EKL-2006",
                    message="Duplicate relationship",
                    relationship_id=rel_id,
                    details=f"Relationship ({source_id} --{rel_type}--> {target_id}) already exists"
                )
            seen_relationships.add(key)

        # Validate 6: Check for cycles (simple check for now)
        # (future enhancement: more sophisticated cycle detection)

        print("  ✅ Semantic validation complete")
        return not context.diagnostics.has_errors
