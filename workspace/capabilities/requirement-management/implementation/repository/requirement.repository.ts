import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  RequirementAggregate,
  RequirementId,
  type RequirementRepository,
  type RequirementPriority,
  type RequirementStatus,
  type RequirementVerificationStatus,
  type RequirementDependency,
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
      dependsOn: [],
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
      dependsOn: [],
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
      dependsOn: [],
      createdAt: d(20),
      updatedAt: d(3),
      approvedAt: d(18),
      implementedAt: d(10),
      verifiedAt: d(3),
    },
    {
      id: RequirementId("req-009"),
      title: "BaseSearchBar Shared Component Refactor",
      summary: "Refactor komponen search bar menjadi BaseSearchBar yang reusable untuk menghilangkan duplikasi kode",
      description: "Membuat komponen BaseSearchBar shared yang dapat digunakan oleh semua halaman search (Community, Research) dengan dukungan filter dinamis.",
      status: "verified",
      priority: "high",
      owner: "EOS Front B",
      source: "EOS-001",
      linkedCapabilityIds: ["EOS-ui-components", "EOS-shared-libs"],
      acceptanceCriteria: [
        "BaseSearchBar mendukung multiple filter dinamis",
        "Dapat digunakan oleh CommunitySearchBar dan ResearchSearchBar",
        "Menghilangkan duplikasi logika routing antar search bar",
      ],
      verificationStatus: "passed",
      dependsOn: [],
      createdAt: d(3),
      updatedAt: d(2),
      approvedAt: d(3),
      implementedAt: d(2),
      verifiedAt: d(1),
    },
    {
      id: RequirementId("req-010"),
      title: "Location Filter untuk /community Page",
      summary: "Tambahkan filter lokasi pada halaman komunitas agar pengguna dapat menyaring anggota berdasarkan wilayah",
      status: "verified",
      priority: "medium",
      owner: "EOS Front B",
      source: "EOS-001",
      linkedCapabilityIds: ["EOS-community", "EOS-filtering"],
      acceptanceCriteria: [
        "Filter lokasi muncul di search bar halaman /community",
        "Anggota terfilter sesuai lokasi yang dipilih",
        "Integrasi dengan shared BaseSearchBar",
      ],
      verificationStatus: "passed",
      dependsOn: [
        { requirementId: "req-009", relationType: "enables" }
      ],
      createdAt: d(1),
      updatedAt: d(1),
      approvedAt: d(1),
      implementedAt: d(2),
      verifiedAt: d(3),
    },
    {
      id: RequirementId("req-011"),
      title: "Visible Proof Panel untuk Requirements Page",
      summary: "Tampilkan traceability dan proof status requirement secara end-to-end agar manusia dapat melihat bukti verifikasi",
      description:
        "EOS harus mampu menjawab 6 pertanyaan manusia untuk setiap requirement: apa yang diminta, di mana ditrace, implementasinya apa, evidence-nya apa, verdict-nya apa, dan apakah benar-benar proven.",
      status: "verified",
      priority: "critical",
      owner: "EOS Front B — EOS CORE",
      source: "EOS-001",
      linkedCapabilityIds: ["EOS-requirement-management", "EOS-evidence-registry", "EOS-governance-verification"],
      acceptanceCriteria: [
        "Proof panel menjawab 6 pertanyaan manusia",
        "Semua verified requirement bisa dipilih via selector",
        "Fallback ke static data jika runtime API unavailable",
        "Tidak ada refactor REQ-010, tidak ada abstraction baru, tidak ada dashboard besar",
      ],
      verificationStatus: "passed",
      dependsOn: [
        { requirementId: "req-010", relationType: "supports" }
      ],
      createdAt: d(0),
      updatedAt: d(0),
      approvedAt: d(0),
      implementedAt: d(0),
      verifiedAt: d(0),
    },
    {
      id: RequirementId("req-042"),
      title: "REQ-0042: Ambiguous verification state requirement",
      summary: "Test requirement with unknown verification status to trigger AI investigation",
      description: "Requirement created specifically to test the AI-on-demand path for ambiguous UNKNOWN verification status",
      status: "implemented",
      priority: "medium",
      owner: "EOS QA Team",
      source: "EOS-003",
      linkedCapabilityIds: ["EOS-workflow-engine", "EOS-evidence-engine"],
      acceptanceCriteria: [
        "Unknown verification status triggers AI investigation",
        "AI performs root cause analysis on ambiguous requirement",
        "Workflow logs AI invocation for audit purposes"
      ],
      verificationStatus: "unknown",
      dependsOn: [],
      createdAt: d(1),
      updatedAt: d(0),
      approvedAt: d(1),
      implementedAt: d(0),
    },
    {
      id: RequirementId("req-012"),
      title: "Causal Trace untuk Requirement Dependencies",
      summary: "Tampilkan hubungan sebab-akibat antar requirement sehingga manusia dapat memahami mengapa sebuah requirement ada",
      description:
        "EOS harus mampu menunjukkan hubungan causal antar requirement yang sudah terbukti, dimulai dari REQ-009 yang meng-enable REQ-010. Setiap node dalam trace harus memiliki evidence reference yang nyata.",
      status: "in_delivery",
      priority: "critical",
      owner: "EOS Front B — EOS CORE",
      source: "EOS-001",
      linkedCapabilityIds: ["EOS-requirement-management", "EOS-causal-trace", "EOS-governance-intelligence"],
      acceptanceCriteria: [
        "Ada relasi eksplisit REQ-009 → REQ-010 dengan semantics 'enables'",
        "Trace dapat ditelusuri dua arah (dari child ke parent dan sebaliknya)",
        "Setiap requirement tetap terhubung ke RTM, Implementation, Evidence, Verdict",
        "REQ-012 memiliki proof untuk dirinya sendiri sama seperti REQ-011",
        "Tidak ada graph database, tidak ada library visualisasi, gunakan artefak yang sudah ada",
      ],
      verificationStatus: "pending",
      dependsOn: [
        { requirementId: "req-011", relationType: "supports" }
      ],
      createdAt: d(0),
      updatedAt: d(0),
      approvedAt: d(0),
    },
  ];
};

type Store = Map<string, RequirementAggregate>;

interface RequirementRecord {
  readonly id: string;
  readonly title: string;
  readonly summary?: string;
  readonly description?: string;
  readonly status: RequirementStatus;
  readonly priority: RequirementPriority;
  readonly owner?: string;
  readonly source?: string;
  readonly linkedCapabilityIds: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly verificationStatus: RequirementVerificationStatus;
  readonly dependsOn?: readonly RequirementDependency[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly approvedAt?: string;
  readonly implementedAt?: string;
  readonly verifiedAt?: string;
}

function hydrate(): Store {
  const store = new Map<string, RequirementAggregate>();
  for (const item of seed()) {
    store.set(item.id, item);
  }
  return store;
}

const STORE: Store = hydrate();

function resolveRequirementStoragePath(): string | undefined {
  const raw = process.env.EOS_REQUIREMENT_STORAGE_PATH?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

function readFileStore(path: string): Store {
  if (!existsSync(path)) {
    return hydrate();
  }

  const raw = readFileSync(path, "utf8").trim();
  if (raw.length === 0) {
    return hydrate();
  }

  const parsed = JSON.parse(raw) as RequirementRecord[];
  const store = new Map<string, RequirementAggregate>();
  for (const item of parsed) {
    const entity = fromRecord(item);
    store.set(entity.id, entity);
  }
  return store;
}

function writeFileStore(path: string, store: Store): void {
  mkdirSync(dirname(path), { recursive: true });
  const payload = Array.from(store.values()).map(toRecord);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function clone(entity: RequirementAggregate): RequirementAggregate {
  return {
    ...entity,
    linkedCapabilityIds: [...entity.linkedCapabilityIds],
    acceptanceCriteria: [...entity.acceptanceCriteria],
    dependsOn: [...entity.dependsOn],
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
    ...(entity.approvedAt !== undefined ? { approvedAt: new Date(entity.approvedAt) } : {}),
    ...(entity.implementedAt !== undefined
      ? { implementedAt: new Date(entity.implementedAt) }
      : {}),
    ...(entity.verifiedAt !== undefined ? { verifiedAt: new Date(entity.verifiedAt) } : {}),
  };
}

function toRecord(entity: RequirementAggregate): RequirementRecord {
  return {
    id: entity.id,
    title: entity.title,
    ...(entity.summary !== undefined ? { summary: entity.summary } : {}),
    ...(entity.description !== undefined ? { description: entity.description } : {}),
    status: entity.status,
    priority: entity.priority,
    ...(entity.owner !== undefined ? { owner: entity.owner } : {}),
    ...(entity.source !== undefined ? { source: entity.source } : {}),
    linkedCapabilityIds: [...entity.linkedCapabilityIds],
    acceptanceCriteria: [...entity.acceptanceCriteria],
    verificationStatus: entity.verificationStatus,
    dependsOn: entity.dependsOn.map((d) => ({ ...d })),
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    ...(entity.approvedAt !== undefined
      ? { approvedAt: entity.approvedAt.toISOString() }
      : {}),
    ...(entity.implementedAt !== undefined
      ? { implementedAt: entity.implementedAt.toISOString() }
      : {}),
    ...(entity.verifiedAt !== undefined
      ? { verifiedAt: entity.verifiedAt.toISOString() }
      : {}),
  };
}

function fromRecord(record: RequirementRecord): RequirementAggregate {
  return {
    id: RequirementId(record.id),
    title: record.title,
    ...(record.summary !== undefined ? { summary: record.summary } : {}),
    ...(record.description !== undefined ? { description: record.description } : {}),
    status: record.status,
    priority: record.priority,
    ...(record.owner !== undefined ? { owner: record.owner } : {}),
    ...(record.source !== undefined ? { source: record.source } : {}),
    linkedCapabilityIds: [...record.linkedCapabilityIds],
    acceptanceCriteria: [...record.acceptanceCriteria],
    verificationStatus: record.verificationStatus,
    dependsOn: (record.dependsOn ?? []).map((d) => ({ ...d })),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    ...(record.approvedAt !== undefined ? { approvedAt: new Date(record.approvedAt) } : {}),
    ...(record.implementedAt !== undefined
      ? { implementedAt: new Date(record.implementedAt) }
      : {}),
    ...(record.verifiedAt !== undefined ? { verifiedAt: new Date(record.verifiedAt) } : {}),
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

export const RequirementRepositoryFileBacked: RequirementRepository = {
  kind: "repository",
  entityName: "Requirement",
  byId(id) {
    const path = resolveRequirementStoragePath();
    if (!path) {
      return RequirementRepositoryInMemory.byId(id);
    }
    const raw = readFileStore(path).get(id);
    return raw !== undefined ? clone(raw) : undefined;
  },
  list() {
    const path = resolveRequirementStoragePath();
    if (!path) {
      return RequirementRepositoryInMemory.list();
    }
    return Array.from(readFileStore(path).values()).map(clone);
  },
  save(entity) {
    const path = resolveRequirementStoragePath();
    if (!path) {
      return RequirementRepositoryInMemory.save(entity);
    }
    const store = readFileStore(path);
    const updated: RequirementAggregate = {
      ...clone(entity),
      linkedCapabilityIds: [...entity.linkedCapabilityIds],
      acceptanceCriteria: [...entity.acceptanceCriteria],
      updatedAt: new Date(),
    };
    store.set(updated.id, updated);
    writeFileStore(path, store);
    return clone(updated);
  },
  remove(id) {
    const path = resolveRequirementStoragePath();
    if (!path) {
      return RequirementRepositoryInMemory.remove(id);
    }
    const store = readFileStore(path);
    const removed = store.delete(id);
    writeFileStore(path, store);
    return removed;
  },
} as const;

export const RequirementRepositoryCurrent: RequirementRepository =
  resolveRequirementStoragePath() !== undefined
    ? RequirementRepositoryFileBacked
    : RequirementRepositoryInMemory;

export const newRequirementId = (() => {
  return (): RequirementId => {
    const highest = RequirementRepositoryCurrent.list()
      .map((item) => /^req-(\d+)$/.exec(item.id)?.[1])
      .map((value) => (value ? Number.parseInt(value, 10) : 0))
      .reduce((max, current) => Math.max(max, current), 100);
    return RequirementId(`req-${String(highest + 1).padStart(3, "0")}`);
  };
})();

export const defaultRequirementStatus: RequirementStatus = "draft";
export const defaultRequirementPriority: RequirementPriority = "medium";
export const defaultRequirementVerificationStatus: RequirementVerificationStatus = "not_ready";