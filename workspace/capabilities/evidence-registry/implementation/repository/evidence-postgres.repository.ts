import { randomUUID } from "crypto";
const generateId = () => randomUUID();
import { PostgresRepository } from "../../../identity/implementation/repositories/base.repository.js";
import type { CapabilityRepository } from "@repo/core-kernel";
import type { EvidenceRecord, EvidenceRecordDetail, EvidenceRecordKind, EvidenceRecordScope } from "../contracts/evidence-registry.contracts.js";

// Extended interface to include database-specific fields that are required for persistence
interface EvidenceRecordWithPersistence extends EvidenceRecord {
  workId: string;
  actorId: string;
  tenantId: string;
  workspaceId: string;
  content: string;
  type: string;
  metadata?: Record<string, unknown>;
  version?: number;
}

export type EvidenceRepositoryPostgres = CapabilityRepository<EvidenceRecord> & {
  listByWorkId(workId: string): Promise<readonly EvidenceRecord[]>;
  listByTenant(tenantId: string, workspaceId: string): Promise<readonly EvidenceRecord[]>;
  saveEvidence(evidence: Omit<EvidenceRecordWithPersistence, "id" | "createdAt">): Promise<EvidenceRecordDetail>;
};

class EvidenceRepositoryPostgresImpl extends PostgresRepository<any> implements EvidenceRepositoryPostgres {
  kind: "repository" = "repository" as const;
  entityName: string = "evidence" as const;

  constructor() {
    super("evidence"); // Table name in PostgreSQL matches migration 005
  }

  async byId(id: string): Promise<EvidenceRecordDetail | undefined> {
    const record = await super.byId(id);
    return record ? this.toAggregateDetail(record) : undefined;
  }

  async list(): Promise<readonly EvidenceRecord[]> {
    const records = await super.list();
    return records.map(record => this.toAggregate(record));
  }

  async listByWorkId(workId: string): Promise<readonly EvidenceRecord[]> {
    const records = await super.find({ work_id: workId });
    return records.map(record => this.toAggregate(record));
  }

  async listByTenant(tenantId: string, workspaceId: string): Promise<readonly EvidenceRecord[]> {
    const records = await super.find({ tenant_id: tenantId, workspace_id: workspaceId });
    return records.map(record => this.toAggregate(record));
  }

  /**
   * Convert domain aggregate to database record (camelCase → snake_case)
   * Matches evidence table schema from migration 005
   */
  protected toRecord(entity: EvidenceRecordWithPersistence & { id: string }): Record<string, any> {
    const record = {
      id: entity.id,
      work_id: entity.workId,
      actor_id: entity.actorId,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      content: entity.content,
      type: entity.type,
      metadata: entity.metadata || null
    };
    // Hapus version field jika ada (ditambahkan oleh base repository)
    if ('version' in record) delete record.version;
    return record;
  }

  /**
   * Convert database record to domain aggregate (snake_case → camelCase)
   */
  protected toAggregate(record: Record<string, any>): EvidenceRecord {
    // Prevent double-mapping: jika sudah memiliki workId (camelCase), kembalikan langsung
    if (record.workId) return record as EvidenceRecord;
    return {
      id: record.id,
      workId: record.work_id,
      actorId: record.actor_id,
      name: record.name || `Evidence ${record.id}`,
      kind: (record.type as EvidenceRecordKind) || "record",
      scope: (record.scope as EvidenceRecordScope) || "requirement",
      path: record.path || "",
      sizeBytes: record.size_bytes || 0,
      createdAt: record.created_at?.toISOString() || new Date().toISOString(),
      updatedAt: record.updated_at?.toISOString() || record.created_at?.toISOString() || new Date().toISOString(),
      runId: record.run_id,
      requirementRefs: record.requirement_refs || [],
      tags: record.tags || []
    } as EvidenceRecord;
  }

  /**
   * Convert database record to detailed evidence record with tenant/workspace context
   */
  protected toAggregateDetail(record: Record<string, any>): EvidenceRecordDetail {
    const base = this.toAggregate(record);
    return {
      ...base,
      preview: record.preview || "",
      lineCount: record.line_count || 0
    } as EvidenceRecordDetail;
  }

  /**
   * Save new evidence - enforces immutability (only insert, never update)
   * Matches evidence table's INSERT-only RLS policy from migration 005
   */
  async saveEvidence(
    evidence: Omit<EvidenceRecordWithPersistence, "id" | "createdAt">
  ): Promise<EvidenceRecordDetail> {
    // Set RLS session context before insert to pass policy checks
    await this.setSessionContext(evidence.tenantId, evidence.workspaceId);
    
    const id = `evidence_${generateId()}`;
    const createdAt = new Date().toISOString();
    
    // Langsung jalankan query INSERT tanpa memanggil super.save() untuk menghindari version field yang tidak diperlukan
    await this.pool.query(
      `INSERT INTO evidence (id, work_id, actor_id, tenant_id, workspace_id, content, type, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, evidence.workId, evidence.actorId, evidence.tenantId, evidence.workspaceId, evidence.content, evidence.type, JSON.stringify(evidence.metadata || {}), createdAt]
    );

    await this.clearSessionContext();
    const newEvidence = { id, ...evidence, created_at: createdAt };
    return this.toAggregateDetail(newEvidence);
  }

  /**
   * Override base save() to enforce immutability - evidence can never be updated or deleted
   */
  async save(entity: any): Promise<never> {
    throw new Error("[EvidenceRepositoryPostgres] Evidence is immutable - use saveEvidence() for new records cannot update existing ones");
  }
  
  /**
   * Override base remove() to enforce immutability
   */
  async remove(id: string): Promise<never> {
    throw new Error("[EvidenceRepositoryPostgres] Evidence is immutable - cannot delete records");
  }
}

// Singleton instance - matches existing repository pattern from work-postgres.repository.ts
let evidenceRepositoryPostgresInstance: EvidenceRepositoryPostgresImpl | null = null;

export function getEvidenceRepositoryPostgres(): EvidenceRepositoryPostgres {
  if (!evidenceRepositoryPostgresInstance) {
    evidenceRepositoryPostgresInstance = new EvidenceRepositoryPostgresImpl();
  }
  return evidenceRepositoryPostgresInstance;
}