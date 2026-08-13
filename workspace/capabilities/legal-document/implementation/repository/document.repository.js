import { DocumentId, } from "../contracts";
const seed = () => {
    const now = Date.now();
    const d = (offsetDays) => new Date(now - 1000 * 60 * 60 * 24 * offsetDays);
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
            description: "Kuitansi hukum terkait pemutusan hubungan kerja karyawan senior",
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
function hydrate() {
    const store = new Map();
    for (const c of seed()) {
        store.set(c.id, c);
    }
    return store;
}
const STORE = hydrate();
function clone(entity) {
    return {
        ...entity,
        createdAt: new Date(entity.createdAt),
        updatedAt: new Date(entity.updatedAt),
        ...(entity.signedAt !== undefined ? { signedAt: new Date(entity.signedAt) } : {}),
        ...(entity.archivedAt !== undefined
            ? { archivedAt: new Date(entity.archivedAt) }
            : {}),
    };
}
export const DocumentRepositoryInMemory = {
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
        const updated = { ...clone(entity), updatedAt: new Date() };
        STORE.set(updated.id, updated);
        return clone(updated);
    },
    remove(id) {
        return STORE.delete(id);
    },
};
export const newDocumentId = (() => {
    let seq = 100;
    return () => {
        seq += 1;
        return DocumentId(`doc-${String(seq).padStart(3, "0")}`);
    };
})();
export const defaultDocumentStatus = "draft";
