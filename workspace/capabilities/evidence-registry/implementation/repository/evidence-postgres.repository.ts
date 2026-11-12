import type { CapabilityRepository } from "@repo/core-kernel";
import type { EvidenceRecord, EvidenceRecordDetail } from "../contracts/evidence-registry.contracts.js";
// Perbaikan Gate A requirement: import dari work-core, bukan langsung dari identity
import { getPool } from "../../../work-core/implementation/repository/work-postgres.repository.js";

// Reuse base Pool interface dari identity repository (Rule of Two compliance - sudah dipakai di work-postgres.repository)
interface Queryable {
  query: (query: string, values?: any[]) => Promise<{ rows: Record<string, any>[] }>;
}

interface EvidenceRecordWithPersistence extends EvidenceRecord {
    workId: string;
    actorId: string;
    tenantId: string;
    workspaceId?: string;
    content: string;
    recordType: string;
    metadata?: Record<string, unknown>;
    version?: number;
}

export type EvidenceRepositoryPostgres = CapabilityRepository<EvidenceRecord> & {
    listByWorkId(workId: string): Promise<readonly EvidenceRecord[]>;
    listByWorkIds(workIds: string[]): Promise<readonly EvidenceRecord[]>;
    saveEvidence(evidence: Omit<EvidenceRecordWithPersistence, "id" | "createdAt">): Promise<EvidenceRecordDetail>;
};

// Implementasi lazy singleton sesuai pola getPool() dari base.repository.ts
let instance: EvidenceRepositoryPostgres | null = null;

export function getEvidenceRepositoryPostgres(): EvidenceRepositoryPostgres {
  if (!instance) {
    const pool = getPool(); // Reuse pool initialization logic yang sudah teruji

    // Implementasi semua method sesuai type declaration dengan RLS compliance
    // Serta CapabilityRepository interface yang dibutuhkan
    instance = {
      // CapabilityRepository required properties
      kind: "postgres" as const,
      entityName: "EvidenceRecord" as const,

      // CapabilityRepository base methods
      async byId(id: string): Promise<EvidenceRecord | null> {
        const result = await pool.query("SELECT * FROM evidence_records WHERE id = $1", [id]);
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
          id: row.id,
          name: row.name,
          kind: row.kind,
          scope: row.scope,
          path: row.path,
          workspace_id: row.workspace_id,
          tenant_id: row.tenant_id,
          created_at: row.created_at,
          content: row.content,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        } as EvidenceRecord;
      },

      async list(): Promise<readonly EvidenceRecord[]> {
        const result = await pool.query("SELECT * FROM evidence_records ORDER BY created_at DESC");
        return result.rows.map(row => ({
          id: row.id,
          name: row.name,
          kind: row.kind,
          scope: row.scope,
          path: row.path,
          workspace_id: row.workspace_id,
          tenant_id: row.tenant_id,
          created_at: row.created_at,
          content: row.content,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        } as EvidenceRecord));
      },

      async save(entity: EvidenceRecord): Promise<EvidenceRecord> {
        // Reuse saveEvidence untuk menyimpan evidence record
        await this.saveEvidence({
          workId: entity.work_id!,
          actorId: entity.actor_id!,
          tenantId: entity.tenant_id!,
          workspaceId: entity.workspace_id,
          content: entity.content,
          recordType: "record",
          metadata: entity.metadata,
          version: 1,
          ...entity
        });
        return entity;
      },

      // Custom methods untuk Postgres evidence repository
      async listByWorkId(workId: string): Promise<readonly EvidenceRecord[]> {
        const result = await pool.query(
          "SELECT * FROM evidence_records WHERE work_id = $1 ORDER BY created_at DESC",
          [workId]
        );
        return result.rows.map(row => ({
          id: row.id,
          name: row.name,
          kind: row.kind,
          scope: row.scope,
          path: row.path,
          workspace_id: row.workspace_id,
          tenant_id: row.tenant_id,
          created_at: row.created_at,
          content: row.content,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        } as EvidenceRecord));
      },

      async listByWorkIds(workIds: string[]): Promise<readonly EvidenceRecord[]> {
        const placeholders = workIds.map((_, i) => `$${i + 1}`).join(",");
        const result = await pool.query(
          `SELECT * FROM evidence_records WHERE work_id IN (${placeholders}) ORDER BY created_at DESC`,
          workIds
        );
        return result.rows.map(row => ({
          id: row.id,
          name: row.name,
          kind: row.kind,
          scope: row.scope,
          path: row.path,
          workspace_id: row.workspace_id,
          tenant_id: row.tenant_id,
          created_at: row.created_at,
          content: row.content,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        } as EvidenceRecord));
      },

      async saveEvidence(evidence: Omit<EvidenceRecordWithPersistence, "id" | "createdAt"> & { meta_checksum?: string }): Promise<EvidenceRecordDetail> {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          if (evidence.meta_checksum) {
            const existingChecksum = await client.query(
              `SELECT id, created_at FROM evidence_records WHERE work_id = $1 AND meta_checksum = $2 LIMIT 1`,
              [evidence.workId, evidence.meta_checksum]
            );
            if (existingChecksum.rows.length > 0) {
              console.log(`[EvidenceRepositoryPostgres] ⚠️ Evidence already exists for checksum ${evidence.meta_checksum}, skipping duplicate insert`);
              await client.query('COMMIT');
              return {
                id: existingChecksum.rows[0].id,
                created_at: existingChecksum.rows[0].created_at,
                ...evidence
              } as EvidenceRecordDetail;
            }
          }
          
          const result = await client.query(
            `INSERT INTO evidence_records (
              work_id, actor_id, tenant_id, workspace_id, content, type, metadata, version,
              name, kind, scope, path, meta_checksum
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, created_at`,
            [
              evidence.workId,
              evidence.actorId,
              evidence.tenantId,
              evidence.workspaceId || null,
              evidence.content,
              evidence.recordType,
              evidence.metadata ? JSON.stringify(evidence.metadata) : null,
              evidence.version || 1,
              evidence.name || `evidence-${Date.now()}`,
              evidence.kind || "record",
              evidence.scope || "requirement",
              evidence.path || `/evidence/${evidence.workId}/${Date.now()}`,
              evidence.meta_checksum || null
            ]
          );
          await client.query('COMMIT');
          console.log(`[EvidenceRepositoryPostgres] ✅ saveEvidence success for workId ${evidence.workId} with checksum ${evidence.meta_checksum}`);
          return {
            id: result.rows[0].id,
            created_at: result.rows[0].created_at,
            ...evidence
          } as EvidenceRecordDetail;
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`[EvidenceRepositoryPostgres] saveEvidence error for workId ${evidence.workId}:`, err);
          throw err;
        } finally {
          client.release();
        }
      }
    };
  }
  return instance;
}