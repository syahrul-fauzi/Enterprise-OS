#!/usr/bin/env python3
"""
Enterprise Knowledge Engine (EKE) — Schema Validation Pass
Validates all package files against our canonical schemas.
"""
from pathlib import Path
import yaml
from jsonschema import Draft202012Validator
from eke.passes import CompilerPass, CompilerContext
from eke.diagnostics import DiagnosticSeverity


class NoTimestampLoader(yaml.SafeLoader):
    def construct_yaml_timestamp(self, node):
        return self.construct_scalar(node)


NoTimestampLoader.add_constructor(
    'tag:yaml.org,2002:timestamp',
    NoTimestampLoader.construct_yaml_timestamp
)


class SchemaValidationPass(CompilerPass):
    def __init__(self, schema_dir: Path):
        self.schema_dir = schema_dir
        self.validators = self._load_schemas()

    def _load_schemas(self):
        validators = {}
        for schema_file in self.schema_dir.glob("*.schema.yaml"):
            schema_name = schema_file.stem.replace(".schema", "")
            with open(schema_file) as f:
                schema = yaml.load(f, Loader=NoTimestampLoader)
            validators[schema_name] = Draft202012Validator(schema)
        return validators

    def run(self, context: CompilerContext) -> bool:
        print("  Validating schemas...")

        # Validate manifest
        manifest = context.manifest
        if manifest and "manifest" in self.validators:
            validator = self.validators["manifest"]
            errors = list(validator.iter_errors(manifest))
            for err in errors:
                context.diagnostics.error(
                    code="EKL-1001",
                    message=f"Schema validation failed for manifest: {err.message}",
                    details=str(err.relative_path) if err.relative_path else None
                )
            if not errors:
                print("  ✅ Manifest schema valid")

        # Validate objects
        objects = context.objects
        for obj_id, obj_data in objects.items():
            if "canonical-object" in self.validators:
                validator = self.validators["canonical-object"]
                errors = list(validator.iter_errors(obj_data))
                for err in errors:
                    context.diagnostics.error(
                        code="EKL-1002",
                        message="Object schema validation failed",
                        object_id=obj_id,
                        details=f"{err.message} at {err.relative_path}"
                    )
        if objects and not any(d.severity == DiagnosticSeverity.ERROR for d in context.diagnostics.diagnostics):
            print("  ✅ All object schemas valid")

        # Validate relationships
        relationships = context.relationships
        for rel_id, rel_data in relationships.items():
            if "relationship" in self.validators:
                validator = self.validators["relationship"]
                errors = list(validator.iter_errors(rel_data))
                for err in errors:
                    context.diagnostics.error(
                        code="EKL-1003",
                        message="Relationship schema validation failed",
                        relationship_id=rel_id,
                        details=f"{err.message} at {err.relative_path}"
                    )
        if relationships and not any(d.severity == DiagnosticSeverity.ERROR for d in context.diagnostics.diagnostics):
            print("  ✅ All relationship schemas valid")

        return not context.diagnostics.has_errors
