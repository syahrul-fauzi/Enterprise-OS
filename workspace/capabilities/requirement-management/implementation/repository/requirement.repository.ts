import {
  RequirementAggregate,
  RequirementId,
  type RequirementRepository,
  type RequirementPriority,
  type RequirementStatus,
  type RequirementVerificationStatus,
} from "../contracts";

const seed = (): RequirementAggregate[] => {
  const now = Date.now();
  const d = (offsetDays: number): Date => new Date(now - 1000 * 60 * 60 * 24 * offsetDays);
  return [
    {
      id: RequirementId("req-001"),
      title: "Workspace can capture requirements as first-class records",
      summary: "Users need a canonical requirement register inside LawyersHub.",
      description:
        "Requirement records must preserve title, owner, priority, source, linked capability IDs, and acceptance criteria.",
      status: "in_delivery",
      priority: "critical",
      owner: "Architecture Agent",
      source: "EOS-001",
      linkedCapabilityIds: ["EOS-001"],
      acceptanceCriteria: [
        "Requirement can be created from UI and API",
        "Requirement can be searched by title and owner",
        "Requirement keeps linked capability IDs",
      ],
      verificationStatus: "pending",
      createdAt: d(9),
      updatedAt: d(1),
      approvedAt: d(8),
    },
    {
      id: RequirementId("req-002"),
      title: "Requirement status must follow delivery progression",
      summary: "The platform needs visible requirement progression to manage delivery risk.",
      status: "approved",
      priority: "high",
      owner: "Delivery Agent",
      source: "EOS-001",
      linkedCapabilityIds: ["EOS-001", "EOS-002"],
      acceptanceCriteria: [
        "Status can move from draft to approved",
        "Implemented requirements can be verified",
      ],
      verificationStatus: "not_ready",
      createdAt: d(13),
      updatedAt: d(5),
      approvedAt: d(5),
    },
    {
      id: RequirementId("req-003"),
      title: "Verified requirements unlock downstream traceability work",
      summary: "Requirement verification should prepare the system for RTM and evidence registry.",
      status: "verified",
      priority: "medium",
      owner: "QA Agent",
      source: "EOS-002",
      linkedCapabilityIds: ["EOS-002", "EOS-003"],
      acceptanceCriteria: [
        "Verified requirements expose stable IDs",
        "Verification status is queryable",
      ],
      verificationStatus: "passed",
      createdAt: d(20),
      updatedAt: d(3),
      approvedAt: d(18),
      implementedAt: d(10),
      verifiedAt: d(3),
    },
  ];
};

type Store = Map<string, RequirementAggregate>;

function hydrate(): Store {
  const store = new Map<string, RequirementAggregate>();
  for (const item of seed()) {
    store.set(item.id, item);
  }
  return store;
}

const STORE: Store = hydrate();

function clone(entity: RequirementAggregate): RequirementAggregate {
  return {
    ...entity,
    linkedCapabilityIds: [...entity.linkedCapabilityIds],
    acceptanceCriteria: [...entity.acceptanceCriteria],
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
    ...(entity.approvedAt !== undefined ? { approvedAt: new Date(entity.approvedAt) } : {}),
    ...(entity.implementedAt !== undefined
      ? { implementedAt: new Date(entity.implementedAt) }
      : {}),
    ...(entity.verifiedAt !== undefined ? { verifiedAt: new Date(entity.verifiedAt) } : {}),
  };
}

export const RequirementRepositoryInMemory: RequirementRepository = {
  kind: "repository",
  entityName: "Requirement",
  byId(id) {
    const raw = STORE.get(id);
    return raw !== undefined ? clone(raw) : undefined;
  },
  list() {
    return Array.from(STORE.values()).map(clone);
  },
  save(entity) {
    const updated: RequirementAggregate = {
      ...clone(entity),
      linkedCapabilityIds: [...entity.linkedCapabilityIds],
      acceptanceCriteria: [...entity.acceptanceCriteria],
      updatedAt: new Date(),
    };
    STORE.set(updated.id, updated);
    return clone(updated);
  },
  remove(id) {
    return STORE.delete(id);
  },
} as const;

export const newRequirementId = (() => {
  let seq = 100;
  return (): RequirementId => {
    seq += 1;
    return RequirementId(`req-${String(seq).padStart(3, "0")}`);
  };
})();

export const defaultRequirementStatus: RequirementStatus = "draft";
export const defaultRequirementPriority: RequirementPriority = "medium";
export const defaultRequirementVerificationStatus: RequirementVerificationStatus = "not_ready";
