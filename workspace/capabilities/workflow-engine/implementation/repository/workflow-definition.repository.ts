import type {
  WorkflowDefinition,
  WorkflowDefinitionRepository,
} from "../contracts";

const DEFINITIONS: readonly WorkflowDefinition[] = Object.freeze([
  {
    id: "requirement-delivery-readiness",
    name: "Requirement Delivery Readiness",
    description:
      "Loads a requirement, resolves its RTM row, and gathers linked evidence to decide delivery readiness.",
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
