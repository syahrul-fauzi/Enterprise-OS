#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Package Loader Pass
Loads a knowledge package manifest and all its objects/relationships.
"""
from pathlib import Path
import yaml
from eke.passes import CompilerPass, CompilerContext
from eke.diagnostics import DiagnosticSeverity


class NoTimestampLoader(yaml.SafeLoader):
    def construct_yaml_timestamp(self, node):
        return self.construct_scalar(node)


NoTimestampLoader.add_constructor(
    'tag:yaml.org,2002:timestamp',
    NoTimestampLoader.construct_yaml_timestamp
)


class PackageLoaderPass(CompilerPass):
    def __init__(self, package_dir: Path):
        self.package_dir = package_dir

    def run(self, context: CompilerContext) -> bool:
        print(f"  Loading package from {self.package_dir}")
        context.package_dir = str(self.package_dir)

        # Step 1: Load manifest
        manifest_path = self.package_dir / "manifest.yaml"
        if not manifest_path.exists():
            context.diagnostics.error(
                code="EKL-0001",
                message="Package manifest not found",
                details=f"Expected manifest at {manifest_path}"
            )
            return False
        try:
            with open(manifest_path, "r") as f:
                manifest = yaml.load(f, Loader=NoTimestampLoader)
        except Exception as e:
            context.diagnostics.error(
                code="EKL-0002",
                message="Failed to load manifest",
                details=str(e)
            )
            return False
        context.manifest = manifest

        # Step 2: Load all objects
        objects_by_id = {}
        for obj_entry in manifest.get("package", {}).get("objects", []):
            obj_id = obj_entry.get("id")
            obj_location = obj_entry.get("location")
            if not obj_id or not obj_location:
                context.diagnostics.error(
                    code="EKL-0003",
                    message="Invalid object entry in manifest",
                    details=f"Object entry missing id or location: {obj_entry}"
                )
                continue
            obj_path = self.package_dir / obj_location
            try:
                with open(obj_path, "r") as f:
                    obj_data = yaml.load(f, Loader=NoTimestampLoader)
            except Exception as e:
                context.diagnostics.error(
                    code="EKL-0004",
                    message="Failed to load object file",
                    object_id=obj_id,
                    details=str(e)
                )
                continue
            objects_by_id[obj_id] = obj_data
        print(f"  Loaded {len(objects_by_id)} objects")
        context.objects = objects_by_id

        # Step 3: Load all relationships
        relationships_by_id = {}
        for rel_entry in manifest.get("package", {}).get("relationships", []):
            rel_id = rel_entry.get("id")
            rel_location = rel_entry.get("location")
            if not rel_id or not rel_location:
                context.diagnostics.error(
                    code="EKL-0005",
                    message="Invalid relationship entry in manifest",
                    details=f"Relationship entry missing id or location: {rel_entry}"
                )
                continue
            rel_path = self.package_dir / rel_location
            try:
                with open(rel_path, "r") as f:
                    rel_data = yaml.load(f, Loader=NoTimestampLoader)
            except Exception as e:
                context.diagnostics.error(
                    code="EKL-0006",
                    message="Failed to load relationship file",
                    relationship_id=rel_id,
                    details=str(e)
                )
                continue
            relationships_by_id[rel_id] = rel_data
        print(f"  Loaded {len(relationships_by_id)} relationships")
        context.relationships = relationships_by_id

        return not context.diagnostics.has_errors
