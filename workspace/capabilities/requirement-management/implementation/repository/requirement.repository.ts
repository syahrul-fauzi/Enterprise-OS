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
      status: "verified",
      priority: "critical",
      owner: "Architecture Agent",
      source: "EOS-001",
      linkedCapabilityIds: ["EOS-001"],
      acceptanceCriteria: [
        "Requirement can be created from UI and API",
        "Requirement can be searched by title and owner",
        "Requirement keeps linked capability IDs",
      ],
      verificationStatus: "passed",
      dependsOn: [],
      createdAt: d(9),
      updatedAt: d(1),
      approvedAt: d(8),
      implementedAt: d(2),
      verifiedAt: d(0),
    },
    {
      id: RequirementId("req-002"),
      title: "Requirement status must follow delivery progression",
      summary: "The platform needs visible requirement progression to manage delivery risk.",
      status: "verified",
      priority: "high",
      owner: "Delivery Agent",
      source: "EOS-001",
      linkedCapabilityIds: ["EOS-001", "EOS-002"],
      acceptanceCriteria: [
        "Status can move from draft to approved",
        "Implemented requirements can be verified",
      ],
      verificationStatus: "passed",
      dependsOn: [],
      createdAt: d(13),
      updatedAt: d(5),
      approvedAt: d(5),
      implementedAt: d(3),
      verifiedAt: d(0),
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
      status: "verified",
      priority: "medium",
      owner: "EOS QA Team",
      source: "EOS-003",
      linkedCapabilityIds: ["EOS-workflow-engine", "EOS-evidence-engine"],
      acceptanceCriteria: [
        "Unknown verification status triggers AI investigation",
        "AI performs root cause analysis on ambiguous requirement",
        "Workflow logs AI invocation for audit purposes"
      ],
      verificationStatus: "passed",
      dependsOn: [],
      createdAt: d(1),
      updatedAt: d(0),
      approvedAt: d(1),
      implementedAt: d(0),
      verifiedAt: d(0),
    },
    // ============================================================
    // LAWYERSHUB - REAL USER JOB REQUIREMENTS
    // ============================================================
    {
      id: RequirementId("req-lh-001"),
      title: "Create and manage corporate litigation matter",
      summary: "First real legal matter: PT Maju Bersama vs PT Teknologi Nusantara - corporate litigation dispute",
      description: "Real client matter for corporate litigation case with document management, timeline tracking, and client approval workflow.",
      status: "in_delivery",
      priority: "critical",
      owner: "Andi Pratama (Lead Lawyer)",
      source: "LawyersHub Production",
      linkedCapabilityIds: ["products/lawyershub/client-management", "products/lawyershub/matter-management"],
      acceptanceCriteria: [
        "Matter can be created with client information",
        "Documents can be attached to the matter",
        "Status can be tracked from draft to active to completed",
        "Client can review and approve matter updates"
      ],
      verificationStatus: "pending",
      dependsOn: [],
      createdAt: d(5),
      updatedAt: d(0),
      approvedAt: d(5),
      implementedAt: d(2),
      verifiedAt: undefined,
    },
    {
      id: RequirementId("req-lh-002"),
      title: "Client profile management for corporate clients",
      summary: "Manage PT Maju Bersama client profile with complete corporate information",
      description: "Client onboarding workflow for corporate legal clients with KYC verification and contact management.",
      status: "implemented",
      priority: "high",
      owner: "Siti Rahayu (Client Success)",
      source: "LawyersHub Production",
      linkedCapabilityIds: ["products/lawyershub/client-management"],
      acceptanceCriteria: [
        "Client profile stores corporate registration data",
        "KYC documents can be uploaded and verified",
        "Multiple contacts can be assigned to a client",
        "Client status tracks verification progress"
      ],
      verificationStatus: "passed",
      dependsOn: [],
      createdAt: d(10),
      updatedAt: d(1),
      approvedAt: d(10),
      implementedAt: d(5),
      verifiedAt: d(1),
    },
    {
      id: RequirementId("req-lh-003"),
      title: "Document version control for case materials",
      summary: "Track pleading document versions for PT Maju Bersama litigation case",
      description: "Version control system for legal documents with audit trail of all changes and approvals.",
      status: "in_delivery",
      priority: "high",
      owner: "Budi Santoso (Document Manager)",
      source: "LawyersHub Production",
      linkedCapabilityIds: ["products/lawyershub/document-management"],
      acceptanceCriteria: [
        "All document changes are versioned",
        "Audit trail shows who changed what and when",
        "Previous versions can be restored",
        "Approval workflow tracks document sign-offs"
      ],
      verificationStatus: "pending",
      dependsOn: [{ requirementId: "req-lh-001", relationType: "depends-on" }],
      createdAt: d(4),
      updatedAt: d(0),
      approvedAt: d(4),
      implementedAt: d(1),
      verifiedAt: undefined,
    },
    {
      id: RequirementId("req-lh-004"),
      title: "Court deadline tracking system",
      summary: "Track all filing deadlines for PT Maju Bersama vs PT Teknologi Nusantara case",
      description: "Automated deadline tracking with reminders for court filings, hearings, and client submissions.",
      status: "in_delivery",
      priority: "critical",
      owner: "Dewi Lestari (Case Manager)",
      source: "LawyersHub Production",
      linkedCapabilityIds: ["products/lawyershub/workflow-automation", "products/lawyershub/matter-management"],
      acceptanceCriteria: [
        "All court deadlines are logged in the system",
        "Automated reminders sent 7 and 3 days before deadline",
        "Calendar integration for hearing schedules",
        "Status tracking for deadline completion"
      ],
      verificationStatus: "pending",
      dependsOn: [{ requirementId: "req-lh-001", relationType: "depends-on" }],
      createdAt: d(3),
      updatedAt: d(0),
      approvedAt: d(3),
      implementedAt: d(1),
      verifiedAt: undefined,
    },
    // ============================================================
    // SERVICES.ID - REAL USER JOB REQUIREMENTS
    // ============================================================
    {
      id: RequirementId("req-svc-001"),
      title: "Find and request corporate legal services",
      summary: "User request: Find corporate lawyer for contract review in Jakarta",
      description: "First real service request - user searches for and engages a corporate lawyer to review IT service contract.",
      status: "in_delivery",
      priority: "high",
      owner: "Rina Wijaya (Service Coordinator)",
      source: "Services.ID Production",
      linkedCapabilityIds: ["products/services-id/service-discovery", "products/services-id/request-management"],
      acceptanceCriteria: [
        "Users can search service providers by location and expertise",
        "Service requests can be created with document attachments",
        "Providers receive notifications of new requests",
        "Request status tracks from submitted to completed"
      ],
      verificationStatus: "pending",
      dependsOn: [],
      createdAt: d(4),
      updatedAt: d(0),
      approvedAt: d(4),
      implementedAt: d(2),
      verifiedAt: undefined,
    },
    {
      id: RequirementId("req-svc-002"),
      title: "Provider profile verification for legal services",
      summary: "Verify corporate law firm profiles listed on Services.ID platform",
      description: "Verification workflow for service providers to confirm credentials, licenses, and professional liability insurance.",
      status: "implemented",
      priority: "critical",
      owner: "Agus Supriyanto (Provider Verification)",
      source: "Services.ID Production",
      linkedCapabilityIds: ["products/services-id/provider-management", "products/services-id/verification"],
      acceptanceCriteria: [
        "All providers submit professional license documents",
        "Liability insurance is verified with issuing carrier",
        "Provider references are contacted and validated",
        "Verified badge displays on provider profiles"
      ],
      verificationStatus: "passed",
      dependsOn: [],
      createdAt: d(8),
      updatedAt: d(2),
      approvedAt: d(8),
      implementedAt: d(4),
      verifiedAt: d(2),
    },
    {
      id: RequirementId("req-svc-003"),
      title: "Secure payment escrow for service delivery",
      summary: "Implement escrow payment system for IT contract review engagement",
      description: "Secure payment handling where funds are held in escrow until service is satisfactorily completed.",
      status: "in_delivery",
      priority: "high",
      owner: "Eko Prasetyo (Payment Operations)",
      source: "Services.ID Production",
      linkedCapabilityIds: ["products/services-id/payment-processing", "products/services-id/request-management"],
      acceptanceCriteria: [
        "Payments are securely processed via payment gateway",
        "Funds are held in escrow until client approval",
        "Provider receives payment upon successful completion",
        "Full audit trail of all payment transactions"
      ],
      verificationStatus: "pending",
      dependsOn: [{ requirementId: "req-svc-001", relationType: "depends-on" }],
      createdAt: d(3),
      updatedAt: d(0),
      approvedAt: d(3),
      implementedAt: d(1),
      verifiedAt: undefined,
    },
    // ============================================================
    // ILC - REAL USER JOB REQUIREMENTS
    // ============================================================
    {
      id: RequirementId("req-ilc-001"),
      title: "Publish Constitutional Law analysis",
      summary: "Article: Judicial Review in Indonesian Constitutional Court - 2024 Update",
      description: "First community contributed content analyzing recent constitutional court decisions on digital rights and internet regulation.",
      status: "implemented",
      priority: "high",
      owner: "Dr. Herman Yusuf (ILC Community Contributor)",
      source: "ILC Community",
      linkedCapabilityIds: ["products/ilc/content-publishing", "products/ilc/constitutional-law"],
      acceptanceCriteria: [
        "Content can be submitted with proper categorization",
        "Peer review workflow before publication",
        "Content is discoverable via topic search",
        "Community can comment and discuss the article"
      ],
      verificationStatus: "passed",
      dependsOn: [],
      createdAt: d(7),
      updatedAt: d(1),
      approvedAt: d(7),
      implementedAt: d(3),
      verifiedAt: d(1),
    },
    {
      id: RequirementId("req-ilc-002"),
      title: "International Trade Law discussion thread",
      summary: "Community discussion: ASEAN Digital Trade Agreement legal implications",
      description: "Engage community members in discussion about new ASEAN digital trade rules and their impact on Indonesian businesses.",
      status: "in_delivery",
      priority: "medium",
      owner: "ILC Community Moderation Team",
      source: "ILC Community",
      linkedCapabilityIds: ["products/ilc/community-discussion", "products/ilc/international-trade"],
      acceptanceCriteria: [
        "Discussion threads can be created by community members",
        "Participants can post comments and share resources",
        "Moderation tools available for thread management",
        "Thread notifications sent to subscribed members"
      ],
      verificationStatus: "pending",
      dependsOn: [],
      createdAt: d(1),
      updatedAt: d(0),
      approvedAt: d(1),
      implementedAt: d(0),
      verifiedAt: undefined,
    },
    {
      id: RequirementId("req-ilc-003"),
      title: "Human Rights Law webinar series",
      summary: "Upcoming webinar: Digital Privacy Rights after the 2024 Personal Data Protection Act",
      description: "Organize community webinar featuring speakers from Kominfo, civil society, and private sector on PDP implementation.",
      status: "draft",
      priority: "high",
      owner: "Maya Anggraini (ILC Events Coordinator)",
      source: "ILC Community",
      linkedCapabilityIds: ["products/ilc/events-management", "products/ilc/human-rights"],
      acceptanceCriteria: [
        "Webinar can be listed on the platform with registration",
        "Registration process captures attendee information",
        "Calendar reminders sent to registrants",
        "Recording published after webinar completion"
      ],
      verificationStatus: "pending",
      dependsOn: [],
      createdAt: d(2),
      updatedAt: d(0),
      approvedAt: d(2),
      implementedAt: d(0),
      verifiedAt: undefined,
    },
    {
      id: RequirementId("req-ilc-004"),
      title: "Digital Law resource repository",
      summary: "Collection of Indonesian digital legislation and regulatory guidance",
      description: "Curated repository of all Indonesian laws related to digital technology, data protection, and e-commerce with annotations.",
      status: "in_delivery",
      priority: "critical",
      owner: "ILC Legal Research Team",
      source: "ILC Community",
      linkedCapabilityIds: ["products/ilc/knowledge-repository", "products/ilc/digital-law"],
      acceptanceCriteria: [
        "All primary legislation documents are digitized and searchable",
        "Expert annotations explain complex provisions",
        "Regular updates when new laws are enacted",
        "Resources can be downloaded by community members"
      ],
      verificationStatus: "pending",
      dependsOn: [],
      createdAt: d(5),
      updatedAt: d(0),
      approvedAt: d(5),
      implementedAt: d(2),
      verifiedAt: undefined,
    },
    {
      id: RequirementId("req-012"),
      title: "Causal Trace untuk Requirement Dependencies",
      summary: "Tampilkan hubungan sebab-akibat antar requirement sehingga manusia dapat memahami mengapa sebuah requirement ada",
      description:
        "EOS harus mampu menunjukkan hubungan causal antar requirement yang sudah terbukti, dimulai dari REQ-009 yang meng-enable REQ-010. Setiap node dalam trace harus memiliki evidence reference yang nyata.",
      status: "verified",
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
      verificationStatus: "passed",
      dependsOn: [
        { requirementId: "req-011", relationType: "supports" }
      ],
      createdAt: d(0),
      updatedAt: d(0),
      approvedAt: d(0),
      implementedAt: d(0),
      verifiedAt: d(0),
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