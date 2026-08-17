import {
  CaseAggregate,
  CaseId,
  type CaseRepository,
  CaseStatus,
  CasePriority,
} from "../contracts/index.js";

const seed = (): CaseAggregate[] => [
  {
    id: CaseId("case-001"),
    title: "Vendor Agreement Review",
    description: "Review and finalize vendor contract for Q3 procurement.",
    status: "open",
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
  },
  {
    id: CaseId("case-002"),
    title: "IP Filing — Trade Secret Protection",
    description:
      "Prepare and file intellectual property trade secret documentation package.",
    status: "in_progress",
    priority: "critical",
    lawyerId: "lawyer-007",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
  },
  {
    id: CaseId("case-003"),
    title: "Employment Handbook Update",
    status: "draft",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
];

type Store = Map<string, CaseAggregate>;

function hydrate(): Store {
  const store = new Map<string, CaseAggregate>();
  for (const c of seed()) {
    store.set(c.id, c);
  }
  return store;
}

const STORE: Store = (globalThis as any).__EOS_LEGAL_CASE_STORE__ ??= hydrate();

function clone<T extends CaseAggregate>(entity: T): T {
  return {
    ...entity,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
    ...(entity.closedAt !== undefined ? { closedAt: new Date(entity.closedAt) } : {}),
  } as T;
}

export const CaseRepositoryInMemory: CaseRepository = {
  kind: "repository",
  entityName: "Case",
  async byId(id) {
    const raw = STORE.get(id);
    return raw !== undefined ? clone(raw) : undefined;
  },
  async list() {
    return Array.from(STORE.values()).map(clone);
  },
  async listByTenant(tenantId: string) {
    // In-memory implementation - filter by tenant if available on aggregate
    return Array.from(STORE.values())
      .filter(c => (c as any).tenantId === tenantId)
      .map(clone);
  },
  async listByWorkspace(workspaceId: string) {
    // In-memory implementation - filter by workspace if available on aggregate
    return Array.from(STORE.values())
      .filter(c => (c as any).workspaceId === workspaceId)
      .map(clone);
  },
  async save(entity) {
    const updated: CaseAggregate = { ...clone(entity), updatedAt: new Date() };
    STORE.set(updated.id, updated);
    return clone(updated);
  },
  async remove(id) {
    return STORE.delete(id);
  },
} as const;

export const newCaseId = (() => {
  let seq = 100;
  return (): CaseId => {
    seq += 1;
    return CaseId(`case-${String(seq).padStart(3, "0")}`);
  };
})();

export const defaultCaseStatus: CaseStatus = "draft";
export const defaultCasePriority: CasePriority = "medium";