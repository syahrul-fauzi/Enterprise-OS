import {
  DocumentAggregate,
  DocumentId,
  type DocumentRepository,
  DocumentStatus,
} from "../contracts/index.js";

const seed = (): DocumentAggregate[] => {
  const now = Date.now();
  const d = (offsetDays: number): Date => new Date(now - 1000 * 60 * 60 * 24 * offsetDays);
  return [
    {
      id: DocumentId("doc-001"),
      title: "Perjanjian Sewa Kantor - Jakarta Pusat",
      description: "Perjanjian sewa gedung untuk periode 2024-2027",
      status: "signed",
      matterId: "case-001",
      author: "Sarah Wijaya",
      createdAt: d(74),
      updatedAt: d(10),
      signedAt: d(10),
    },
    {
      id: DocumentId("doc-002"),
      title: "Kuilitas Hukum - Ketenagakerjaan",
      description:
        "Kuitansi hukum terkait pemutusan hubungan kerja karyawan senior",
      status: "review",
      matterId: "case-002",
      author: "Budi Santoso",
      createdAt: d(37),
      updatedAt: d(7),
    },
    {
      id: DocumentId("doc-003"),
      title: "Draft Perjanjian Jual Beli Saham",
      status: "draft",
      matterId: "case-003",
      author: "Dewi Lestari",
      createdAt: d(23),
      updatedAt: d(2),
    },
    {
      id: DocumentId("doc-004"),
      title: "Pendapat Hukum - Tata Kelola Perusahaan",
      description: "Opini hukum terkait struktur GCG PT XYZ yang baru",
      status: "archived",
      author: "Sarah Wijaya",
      createdAt: d(118),
      updatedAt: d(60),
      archivedAt: d(60),
    },
  ];
};

type Store = Map<string, DocumentAggregate>;

function hydrate(): Store {
  const store = new Map<string, DocumentAggregate>();
  for (const c of seed()) {
    store.set(c.id, c);
  }
  return store;
}

const STORE: Store = (globalThis as any).__EOS_LEGAL_DOCUMENT_STORE__ ??= hydrate();

function clone<T extends DocumentAggregate>(entity: T): T {
  return {
    ...entity,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
    ...(entity.signedAt !== undefined ? { signedAt: new Date(entity.signedAt) } : {}),
    ...(entity.archivedAt !== undefined
      ? { archivedAt: new Date(entity.archivedAt) }
      : {}),
  } as T;
}

export const DocumentRepositoryInMemory: DocumentRepository = {
  kind: "repository",
  entityName: "Document",
  byId(id) {
    const raw = STORE.get(id);
    return raw !== undefined ? clone(raw) : undefined;
  },
  list() {
    return Array.from(STORE.values()).map(clone);
  },
  save(entity) {
    const updated: DocumentAggregate = { ...clone(entity), updatedAt: new Date() };
    STORE.set(updated.id, updated);
    return clone(updated);
  },
  remove(id) {
    return STORE.delete(id);
  },
} as const;

export const newDocumentId = (() => {
  let seq = 100;
  return (): DocumentId => {
    seq += 1;
    return DocumentId(`doc-${String(seq).padStart(3, "0")}`);
  };
})();

export const defaultDocumentStatus: DocumentStatus = "draft";
