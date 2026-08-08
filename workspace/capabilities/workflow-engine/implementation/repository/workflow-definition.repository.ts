import type {
  WorkflowDefinition,
  WorkflowDefinitionRepository,
} from "../contracts";

const DEFINITIONS: readonly WorkflowDefinition[] = Object.freeze([
  {
    id: "requirement-delivery-readiness",
    name: "Requirement Delivery Readiness",
    description:
      "Loads a requirement, resolves its RTM row, gathers linked evidence, closes traceability loop by verifying requirements if ready.",
    requiredInputs: ["requirementId"],
    steps: [
      {
        id: "load-requirement",
        kind: "requirement.get",
        description: "Load requirement aggregate from Requirement Management.",
      },
      {
        id: "resolve-traceability",
        kind: "traceability.get",
        description: "Resolve RTM row and coverage gaps for the requirement.",
      },
      {
        id: "collect-linked-evidence",
        kind: "evidence.search",
        description: "Search Evidence Registry for external requirement evidence linked by RTM.",
      },
      {
        id: "close-traceability-loop",
        kind: "requirement.verify",
        description: "Automatically verify requirement if traceability is complete and evidence is sufficient to close the traceability loop.",
      },
    ],
  },
  {
    id: "evidence-run-review",
    name: "Evidence Run Review",
    description:
      "Collects evidence records for a run and summarizes acceptance plus metrics coverage.",
    requiredInputs: ["runId"],
    steps: [
      {
        id: "collect-run-evidence",
        kind: "evidence.search",
        description: "Search Evidence Registry by run identifier.",
      },
    ],
  },
  {
    id: "ai-investigate-requirement",
    name: "AI Requirement Investigation",
    description:
      "AI-powered analysis of a requirement with unknown verification status to resolve ambiguity and generate structured investigation results.",
    requiredInputs: ["requirementId"],
    steps: [
      {
        id: "ai-investigate",
        kind: "ai.analyze",
        description: "Perform AI analysis on the ambiguous requirement.",
      },
      {
        id: "validate-investigation",
        kind: "result.validate",
        description: "Validate AI investigation results against minimum confidence threshold.",
      },
      {
        id: "update-requirement-state",
        kind: "requirement.update",
        description: "Update the requirement's verification status based on investigation results.",
      },
    ],
  },
]);

export const WorkflowDefinitionRepositoryInMemory: WorkflowDefinitionRepository = {
  kind: "repository",
  entityName: "WorkflowDefinition",
  list() {
    return DEFINITIONS.map((definition) => ({
      ...definition,
      requiredInputs: [...definition.requiredInputs],
      steps: definition.steps.map((step) => ({ ...step })),
    }));
  },
  byId(id) {
    const definition = DEFINITIONS.find((item) => item.id === id);
    return definition === undefined
      ? undefined
      : {
          ...definition,
          requiredInputs: [...definition.requiredInputs],
          steps: definition.steps.map((step) => ({ ...step })),
        };
  },
} as const;