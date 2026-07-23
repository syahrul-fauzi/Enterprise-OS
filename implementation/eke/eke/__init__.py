#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Schema Validator
Validates EKL knowledge packages against canonical schemas.
"""

import os
import yaml
from jsonschema import Draft202012Validator
from pathlib import Path


class NoTimestampLoader(yaml.SafeLoader):
    """YAML loader that doesn't parse timestamps as datetime objects."""
    def construct_yaml_timestamp(self, node):
        return self.construct_scalar(node)


NoTimestampLoader.add_constructor(
    'tag:yaml.org,2002:timestamp',
    NoTimestampLoader.construct_yaml_timestamp
)


class EKLSchemaValidator:
    def __init__(self, schema_dir: Path):
        self.schema_dir = Path(schema_dir)
        self.validators = self._load_schemas()

    def _load_schemas(self):
        validators = {}
        for schema_file in self.schema_dir.glob("*.schema.yaml"):
            schema_name = schema_file.stem.replace(".schema", "")
            with open(schema_file) as f:
                schema = yaml.load(f, Loader=NoTimestampLoader)
            validators[schema_name] = Draft202012Validator(schema)
        return validators

    def validate_file(self, file_path: Path, schema_type: str) -> bool:
        with open(file_path) as f:
            instance = yaml.load(f, Loader=NoTimestampLoader)
        validator = self.validators[schema_type]
        errors = list(validator.iter_errors(instance))
        if errors:
            print(f"Validation errors in {file_path}:")
            for error in errors:
                print(f"  - {error.message}")
            return False
        print(f"✓ {file_path} is valid against {schema_type} schema")
        return True

    def validate_package(self, package_dir: Path) -> bool:
        package_dir = Path(package_dir)
        all_valid = True

        # Validate manifest
        manifest_path = package_dir / "manifest.yaml"
        if not self.validate_file(manifest_path, "manifest"):
            all_valid = False

        # Load manifest to get objects and relationships
        with open(manifest_path) as f:
            manifest = yaml.load(f, Loader=NoTimestampLoader)

        # Validate objects
        for obj in manifest.get("package", {}).get("objects", []):
            obj_path = package_dir / obj["location"]
            if not self.validate_file(obj_path, "canonical-object"):
                all_valid = False

        # Validate relationships
        for rel in manifest.get("package", {}).get("relationships", []):
            rel_path = package_dir / rel["location"]
            if not self.validate_file(rel_path, "relationship"):
                all_valid = False

        return all_valid
