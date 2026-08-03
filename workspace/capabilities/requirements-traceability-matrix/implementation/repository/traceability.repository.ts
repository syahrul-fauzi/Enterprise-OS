import type {
  TraceabilityArtifact,
  TraceabilityArtifactRepository,
} from "../contracts";

const ARTIFACTS: readonly TraceabilityArtifact[] = Object.freeze([
  {
    id: "capability-eos-001",
    title: "EOS-001 Requirement Management",
    description: "Execution graph anchor for delivered requirement management.",
    kind: "capability",
    reference: "enterprise/execution/CAPABILITY-REGISTRY.yaml",
    referenceKind: "repo_path",
    requirementIds: ["req-001", "req-002"],
    linkedCapabilityIds: ["EOS-001"],
    verification: "not_applicable",
  },
  {
    id: "api-requirements-collection",
    title: "Requirements Collection API",
    description: "Creates and searches requirement aggregates.",
    kind: "api",
    reference: "/api/requirements",
    referenceKind: "api_route",
    requirementIds: ["req-001"],
    linkedCapabilityIds: ["EOS-001"],
    verification: "passed",
  },
  {
    id: "api-requirements-item",
    title: "Requirement Lifecycle API",
    description: "Reads and advances requirement lifecycle transitions.",
    kind: "api",
    reference: "/api/requirements/:id",
    referenceKind: "api_route",
    requirementIds: ["req-002"],
    linkedCapabilityIds: ["EOS-001"],
    verification: "passed",
  },
  {
    id: "source-requirement-service",
    title: "Requirement Management Service",
    description: "Canonical service surface for requirement lifecycle operations.",
    kind: "source",
    reference:
      "workspace/capabilities/requirement-management/implementation/services/requirement.service.ts",
    referenceKind: "repo_path",
    requirementIds: ["req-001", "req-002"],
    linkedCapabilityIds: ["EOS-001"],
    verification: "not_applicable",
  },
  {
    id: "test-requirement-management",
    title: "Requirement Management Tests",
    description: "Verifies requirement lifecycle and search behaviors.",
    kind: "test",
    reference:
      "workspace/capabilities/requirement-management/tests/requirement-management.test.ts",
    referenceKind: "repo_path",
    requirementIds: ["req-001", "req-002", "req-003"],
    linkedCapabilityIds: ["EOS-001", "EOS-002"],
    verification: "passed",
  },
  {
    id: "spec-req-0001",
    title: "REQ-0001 Canonical Requirement Specification",
    description: "Frozen requirement specification that anchors traceability identity.",
    kind: "specification",
    reference: "workspace/examples/vertical-slice/REQ-0001/req-0001.els.yaml",
    referenceKind: "repo_path",
    requirementIds: ["req-003"],
    linkedCapabilityIds: ["EOS-002", "EOS-003"],
    verification: "passed",
    externalRequirementRefs: ["REQ-0001"],
  },
  {
    id: "evidence-req-0001-eir",
    title: "REQ-0001 EIR Output",
    description: "Transformation output proving identity propagation from the canonical requirement.",
    kind: "evidence",
    reference: "workspace/examples/vertical-slice/REQ-0001/eir-output/REQ-0001.eir.json",
    referenceKind: "repo_path",
    requirementIds: ["req-003"],
    linkedCapabilityIds: ["EOS-002", "EOS-003"],
    verification: "passed",
    externalRequirementRefs: ["REQ-0001"],
  },
  {
    id: "capability-eos-002",
    title: "EOS-002 Requirements Traceability Matrix",
    description: "Execution graph anchor for RTM delivery.",
    kind: "capability",
    reference: "enterprise/execution/CAPABILITY-REGISTRY.yaml",
    referenceKind: "repo_path",
    requirementIds: ["req-003"],
    linkedCapabilityIds: ["EOS-002"],
    verification: "not_applicable",
  },
  {
    id: "api-rtm-collection",
    title: "RTM Collection API",
    description: "Searches matrix rows across requirements and delivery artifacts.",
    kind: "api",
    reference: "/api/rtm",
    referenceKind: "api_route",
    requirementIds: ["req-003"],
    linkedCapabilityIds: ["EOS-002"],
    verification: "passed",
  },
  {
    id: "api-rtm-item",
    title: "RTM Detail API",
    description: "Returns a single traceability row for a requirement.",
    kind: "api",
    reference: "/api/rtm/:id",
    referenceKind: "api_route",
    requirementIds: ["req-003"],
    linkedCapabilityIds: ["EOS-002"],
    verification: "passed",
  },
  {
    id: "source-rtm-service",
    title: "RTM Service",
    description: "Builds the derived traceability matrix from requirements and artifacts.",
    kind: "source",
    reference:
      "workspace/capabilities/requirements-traceability-matrix/implementation/services/traceability.service.ts",
    referenceKind: "repo_path",
    requirementIds: ["req-003"],
    linkedCapabilityIds: ["EOS-002"],
    verification: "not_applicable",
  },
  {
    id: "test-rtm",
    title: "RTM Capability Tests",
    description: "Verifies matrix assembly, filtering, and evidence linking.",
    kind: "test",
    reference:
      "workspace/capabilities/requirements-traceability-matrix/tests/requirements-traceability-matrix.test.ts",
    referenceKind: "repo_path",
    requirementIds: ["req-003"],
    linkedCapabilityIds: ["EOS-002"],
    verification: "passed",
  },
]);

function cloneArtifact(artifact: TraceabilityArtifact): TraceabilityArtifact {
  return {
    ...artifact,
    requirementIds: [...artifact.requirementIds],
    linkedCapabilityIds: [...artifact.linkedCapabilityIds],
    ...(artifact.externalRequirementRefs !== undefined
      ? { externalRequirementRefs: [...artifact.externalRequirementRefs] }
      : {}),
  };
}

export const TraceabilityArtifactRepositoryInMemory: TraceabilityArtifactRepository = {
  kind: "repository",
  entityName: "TraceabilityArtifact",
  list() {
    return ARTIFACTS.map(cloneArtifact);
  },
} as const;
