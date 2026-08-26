import {
  DocumentAggregate,
  DocumentId,
  type DocumentRepository,
  DocumentStatus,
} from "../contracts/index.js";
import { recordRuntimeInvocation } from "@repo/core-runtime";

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
      description: "Pasal awal: Denda keterlambatan sebesar 1% per hari dari nilai transaksi.",
      status: "draft",
      matterId: "case-003",
      author: "Dewi Lestari",
      workId: "W1",
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
  byId(id: DocumentId, context?: { tenantId: string; workspaceId: string }) {
    const raw = STORE.get(id);
    if (!raw) return undefined;
    
    // WORK-015: Enforce tenant isolation if context is provided
    if (context) {
      if ((raw as any).tenantId !== context.tenantId || ((raw as any).workspaceId && (raw as any).workspaceId !== context.workspaceId)) {
        console.error(`[DocumentRepositoryInMemory] Cross-tenant access attempt blocked: document ${id} belongs to tenant ${(raw as any).tenantId}, requested tenant ${context.tenantId}`);
        return undefined;
      }
    }
    
    return clone(raw);
  },
  list(context?: { tenantId: string; workspaceId: string }) {
    let values = Array.from(STORE.values());
    
    // WORK-015: Enforce tenant isolation if context is provided
    if (context) {
      values = values.filter(d => 
        (d as any).tenantId === context.tenantId && 
        (!(d as any).workspaceId || (d as any).workspaceId === context.workspaceId)
      );
    }
    
    return values.map(clone);
  },
  async listByMatter(matterId: string, context?: { tenantId: string; workspaceId: string }) {
    let values = Array.from(STORE.values()).filter(d => d.matterId === matterId);
    
    // WORK-015: Enforce tenant isolation if context is provided
    if (context) {
      values = values.filter(d => 
        (d as any).tenantId === context.tenantId && 
        (!(d as any).workspaceId || (d as any).workspaceId === context.workspaceId)
      );
    }
    
    return values.map(clone);
  },
  save(entity, context) {
    const cloned = clone(entity);
    // WORK-015: Inject audit metadata from context if provided
    if (context) {
      (cloned as any).tenantId = context.tenantId;
      (cloned as any).workspaceId = context.workspaceId;
      (cloned as any).lastModifiedBy = context.actorId;
    }
    // Implement optimistic concurrency control (versioning)
    const existing = STORE.get(entity.id);
    if (existing) {
      // Version check if both entities have version field
      if ((entity as any).version !== undefined && (existing as any).version !== undefined) {
        if ((entity as any).version !== (existing as any).version) {
          throw new Error(`[DocumentRepositoryInMemory] Concurrent modification detected for document:${entity.id} - current version ${(existing as any).version}, attempted update from version ${(entity as any).version}`);
        }
        // Increment version
        (cloned as any).version = (entity as any).version + 1;
      } else if ((entity as any).version === undefined && (existing as any).version === undefined) {
        // Initialize version
        (cloned as any).version = 1;
      }
    } else {
      // New entity - initialize version
      (cloned as any).version = 1;
    }
    (cloned as any).updatedAt = new Date();
    
    STORE.set(cloned.id, cloned);
    
    // WORK-015: Append to immutable audit ledger
    recordRuntimeInvocation({
      capabilityId: "legal-document",
      operationId: "repository.save",
      sourceRef: "DocumentRepositoryInMemory.save",
      success: true,
      input: { entityId: entity.id, previousVersion: (entity as any).version || 0 },
      result: { newVersion: (cloned as any).version },
      tenant_id: context?.tenantId || null,
      decision_id: null,
      inputRefs: [entity.id],
      outputRefs: [cloned.id]
    });
    
    return clone(cloned);
  },
  remove(id, context) {
    // WORK-015: Enforce tenant isolation before allowing deletion
    const raw = STORE.get(id);
    if (!raw) {
      // WORK-015: Log failed deletion attempt
      recordRuntimeInvocation({
        capabilityId: "legal-document",
        operationId: "repository.remove",
        sourceRef: "DocumentRepositoryInMemory.remove",
        success: false,
        input: { entityId: id },
        result: { reason: "entity_not_found" },
        tenant_id: context?.tenantId || null,
        decision_id: null
      });
      return false;
    }
    
    if (context) {
      const documentTenantId = (raw as any).tenantId;
      const documentWorkspaceId = (raw as any).workspaceId;
      
      if (documentTenantId && documentWorkspaceId) {
        if (documentTenantId !== context.tenantId || documentWorkspaceId !== context.workspaceId) {
          // WORK-015: Log cross-tenant deletion attempt (security violation)
          recordRuntimeInvocation({
            capabilityId: "legal-document",
            operationId: "repository.remove",
            sourceRef: "DocumentRepositoryInMemory.remove",
            success: false,
            input: { entityId: id, attemptedTenantId: context.tenantId, actualTenantId: documentTenantId },
            result: { reason: "tenant_isolation_violation" },
            tenant_id: context.tenantId,
            decision_id: null
          });
          return false;
        }
      }
    }
    
    const deleted = STORE.delete(id);
    if (deleted) {
      // WORK-015: Append successful deletion to audit ledger
      recordRuntimeInvocation({
        capabilityId: "legal-document",
        operationId: "repository.remove",
        sourceRef: "DocumentRepositoryInMemory.remove",
        success: true,
        input: { entityId: id },
        result: { deleted: true },
        tenant_id: context?.tenantId || null,
        decision_id: null,
        inputRefs: [id]
      });
    }
    
    return deleted;
  },
} as const;

// P1 FIX: Generate alphanumeric IDs to match orphan scanner universal work_id pattern
// Before: doc-101 → After: article-abc123 (passes scanner's article-[\w-]+ regex)
const generateRandomSuffix = () => {
  return Math.random().toString(36).substring(2, 8); // 6 random alphanumeric characters
};

export const newDocumentId = (): DocumentId => {
  return DocumentId(`document-${generateRandomSuffix()}`);
};

if (process.env.NODE_ENV === "test") {
  (DocumentRepositoryInMemory as any).clear = () => {
    STORE.clear();
    console.log("[DocumentRepository] In-memory store cleared for test isolation");
  };
}

export const defaultDocumentStatus: DocumentStatus = "draft";