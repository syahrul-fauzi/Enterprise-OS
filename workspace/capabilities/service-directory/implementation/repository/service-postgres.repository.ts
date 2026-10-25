import { Pool } from "pg";
import { PostgresRepository, getPool, initIdentitySchema } from "../../../identity/implementation/repositories/base.repository.js";
// Import canonical identity factory functions + types from SINGLE-SOURCE work-core (anti-drift - TENANT-ISOLATION-001)
// Sesuai invariant Work Continuity: Semua capability harus mengimport dari work-core (single semantic authority)
import { 
  createActorId, 
  createTenantId, 
  createWorkspaceId,
  type ActorId, 
  type TenantId, 
  type WorkspaceId 
} from "../../../work-core/contracts/work.contracts.js";
import {
  ServiceRequestId,
  ServiceProviderId,
  type ServiceRequestAggregate,
  type ServiceProviderAggregate,
  type ServiceRequestRepository,
  type ServiceProviderRepository,
  type CreateServiceRequestInput,
  ServiceRequestStatus,
  ServiceProviderCategory,
} from "../contracts/service.contracts.js";

// SHARED RAIL: Initialize identity schema if Postgres is active (MIRRORS service.commands.ts pattern)
if (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) {
  initIdentitySchema();
}

// Initialize connection pool with unified connection string
const pool = getPool();

// PostgreSQL-backed service request repository implementation
class ServiceRequestRepositoryPostgresImpl extends PostgresRepository<any> implements ServiceRequestRepository {
  readonly entityName = "ServiceRequest" as const;
  readonly kind = "repository" as const;

  // ACaaS-COMMERCIAL-001: Add byExternalId to support idempotency checks (PostgreSQL implementation)
  async byExternalId(externalId: string, tenantId: string, workspaceId: string) {
    const result = await this.pool.query(
      `SELECT * FROM service_requests 
       WHERE external_id = $1 
       AND request_context->>'tenantId' = $2 
       AND request_context->>'workspaceId' = $3 
       LIMIT 1`,
      [externalId, tenantId, workspaceId]
    );
    return result.rows[0] ? this.toAggregate(result.rows[0]) : undefined;
  }



  constructor() {
    super("service_requests");
  }

  // Convert database record to domain aggregate - implements CMBCD framework deserialization (mirrors legal-case pattern)
  // PROD-002-10: Full CMBCD fields deserialization from database JSONB columns
  toAggregate(record: any): ServiceRequestAggregate {
    return {
      id: ServiceRequestId(record.id),
      workId: record.work_id, // CORE-001: workId adalah satu-satunya sumber truth untuk boundary metadata
      title: record.title,
      description: record.description,
      category: record.category as ServiceProviderCategory,
      status: record.status as ServiceRequestStatus,
      requesterName: record.requester_name,
      providerId: record.provider_id ? ServiceProviderId(record.provider_id) : undefined,
      budget: record.budget,
      deadline: record.deadline ? new Date(record.deadline) : undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deliveredAt: record.delivered_at ? new Date(record.delivered_at) : undefined,
      paymentTransactionId: record.payment_transaction_id,
      paymentStatus: record.payment_status,
      // PROD-002-10: CMBCD fields deserialized from database JSONB columns
      actorMetadata: record.actor_metadata ? JSON.parse(record.actor_metadata) : undefined,
      allowedCapabilities: record.allowed_capabilities ? JSON.parse(record.allowed_capabilities) : [],
      authorization: record.authorization ? JSON.parse(record.authorization) : undefined,
      context: record.request_context ? JSON.parse(record.request_context) : undefined,
      risk: record.risk_assessment ? JSON.parse(record.risk_assessment) : undefined,
      executionFrame: record.execution_frame,
      executionContext: record.execution_context ? JSON.parse(record.execution_context) : undefined,
      evidence: record.evidence ? JSON.parse(record.evidence) : [],
    } as ServiceRequestAggregate;
  }

  // Convert domain aggregate to database record - implements CMBCD framework serialization (mirrors legal-case pattern)
  // PROD-002-10: Full CMBCD fields serialization to database JSONB columns
  toRecord(entity: ServiceRequestAggregate): any {
    // CORE-001: workId WAJIB diisi - tidak boleh fallback ke entity.id (user mandate: Work sebagai continuity object)
    if (!entity.workId) {
      throw new Error("[ServiceRequestRepositoryPostgres] ServiceRequestAggregate must have workId set (CORE-001 mandate)");
    }
    // PROD-002-10: CMBCD fields wajib diisi pada save (enforce non-entity-centric initialization per user mandate)
    if (!entity.actorMetadata || !entity.authorization || !entity.context || !entity.risk) {
      throw new Error("[ServiceRequestRepositoryPostgres] ServiceRequestAggregate must have all CMBCD fields set (PROD-002-10 mandate)");
    }
    // Extract tenantId/workspaceId/actorId dari CMBCD context (sumber truth terpusat, menghindari duplikasi data)
    const tenantId = entity.context.tenantId;
    const workspaceId = entity.context.workspaceId;
    const actorId = entity.actorMetadata.actorId;
    
    return {
      id: entity.id,
      work_id: entity.workId,
      title: entity.title,
      description: entity.description,
      category: entity.category,
      status: entity.status,
      requester_name: entity.requesterName,
      provider_id: entity.providerId,
      budget: entity.budget,
      external_id: entity.externalId,
      deadline: entity.deadline?.toISOString(),
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      delivered_at: entity.deliveredAt?.toISOString(),
      // Extract boundary metadata dari CMBCD context (tidak disimpan duplikat)
      tenant_id: tenantId,
      workspace_id: workspaceId,
      actor_id: actorId,
      payment_transaction_id: entity.paymentTransactionId,
      payment_status: entity.paymentStatus,
      // PROD-002-10: Serialize CMBCD fields ke JSONB columns untuk queryability dan persistence
      actor_metadata: JSON.stringify(entity.actorMetadata),
      allowed_capabilities: JSON.stringify(entity.allowedCapabilities),
      authorization: JSON.stringify(entity.authorization),
      request_context: JSON.stringify(entity.context),
      risk_assessment: JSON.stringify(entity.risk),
      execution_frame: entity.executionFrame,
      execution_context: entity.executionContext ? JSON.stringify(entity.executionContext) : null,
      evidence: entity.evidence ? JSON.stringify(entity.evidence) : JSON.stringify([]),
    };
  }

  async byId(id: ServiceRequestId, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<ServiceRequestAggregate | undefined> {
    let query = "SELECT * FROM service_requests WHERE id = $1";
    const params: any[] = [id];
    let paramIndex = 2;
    
    // CORE-001: Enforce tenant isolation - prioritize workId over workspaceId, workspace is optional execution boundary
    if (context) {
      query += " AND tenant_id = $2";
      params.push(context.tenantId);
      paramIndex++;
      if (context?.workId) {
        query += " AND work_id = $3";
        params.push(context.workId);
      } else if (context?.workspaceId) {
        // Fallback to workspace only when workId is not provided (maintain backward compatibility)
        query += " AND workspace_id = $3";
        params.push(context.workspaceId);
      }
    }
    
    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<readonly ServiceRequestAggregate[]> {
    let query = "SELECT * FROM service_requests";
    const params: any[] = [];
    let paramIndex = 1;
    
    if (context) {
      query += " WHERE tenant_id = $1";
      params.push(context.tenantId);
      paramIndex++;
      if (context?.workId) {
        query += " AND work_id = $2";
        params.push(context.workId);
      } else if (context?.workspaceId) {
        // Fallback to workspace only when workId is not provided
        query += " AND workspace_id = $2";
        params.push(context.workspaceId);
      }
    }
    
    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByStatus(status: ServiceRequestStatus | "all"): Promise<readonly ServiceRequestAggregate[]> {
    if (status === "all") {
      return this.list();
    }
    const result = await this.pool.query(
      "SELECT * FROM service_requests WHERE status = $1",
      [status]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByWork(workId: string): Promise<readonly ServiceRequestAggregate[]> {
    // CORE-001: Single work-centric query method - enforce workId as primary context
    await this.setSessionContext('', { workId });
    try {
      const result = await this.pool.query(
        "SELECT * FROM service_requests WHERE work_id = $1",
        [workId]
      );
      return result.rows.map((row: any) => this.toAggregate(row));
    } finally {
      await this.clearSessionContext();
    }
  }

  // CORE-001: listByWorkIds menggantikan listByTenant/listByWorkspace - hanya fetch service requests yang terikat ke Work yang diizinkan
  // Enforces Work-centric model precedence: workId > workspaceId per EOS architectural mandate for High-Value Work Graph
  // CORE-001: listByWorkspace - optional execution boundary fallback (workspace as context only, not primary identity)
  // Implements EOS architectural mandate: workspace is only used when workId is not available for backward compatibility
  async listByWorkspace(workspaceId: string, tenantId: string): Promise<readonly ServiceRequestAggregate[]> {
    // Enforce mandatory tenant isolation (cannot query workspace without tenant - identity boundary requirement)
    if (!tenantId) {
      throw new Error("[ServiceRequestRepositoryPostgres] listByWorkspace requires tenantId (identity boundary violation)");
    }
    const query = "SELECT * FROM service_requests WHERE workspace_id = $1 AND tenant_id = $2";
    const params = [workspaceId, tenantId];
    
    try {
      const result = await this.pool.query(query, params);
      return result.rows.map((row: any) => this.toAggregate(row));
    } catch (error) {
      console.error("[ServiceRequestRepositoryPostgres] listByWorkspace failed:", error);
      throw error;
    }
  }

  async listByWorkIds(workIds: readonly string[]): Promise<readonly ServiceRequestAggregate[]> {
    if (workIds.length === 0) return [];
    
    // PostgreSQL IN clause with parameterized queries to prevent SQL injection
    const placeholders = workIds.map((_, i) => `$${i + 1}`).join(", ");
    const query = `SELECT * FROM service_requests WHERE work_id IN (${placeholders})`;
    
    try {
      const result = await this.pool.query(query, [...workIds]);
      return result.rows.map((row: any) => this.toAggregate(row));
    } catch (error) {
      console.error("[ServiceRequestRepositoryPostgres] listByWorkIds failed:", error);
      throw error;
    }
  }

  async save(entity: ServiceRequestAggregate & { workId?: string }): Promise<ServiceRequestAggregate> {
    // Extract boundary metadata from CMBCD context to avoid legacy entity-level property access (PROD-002-10)
    // Source of truth is always CMBCD fields, never legacy top-level entity properties
    const tenantId = entity.context?.tenantId;
    const workspaceId = entity.context?.workspaceId;
    const workId = entity.workId;
    
    // CORE-001: Validate required boundary metadata before setting session context
    if (!tenantId) {
      throw new Error("[ServiceRequestRepositoryPostgres] Cannot save entity without tenantId in CMBCD context (identity boundary violation)");
    }
    if (!workId) {
      throw new Error("[ServiceRequestRepositoryPostgres] Cannot save entity without workId (CORE-001 mandate: Work is continuity object)");
    }
    
    // Set RLS session context before database operation (TENANT-ISOLATION-001)
    // Work-centric model: use workId as primary context, workspaceId as fallback context
    await this.setSessionContext(tenantId, { workspaceId, workId });
    
    const exists = await this.byId(entity.id);
    const record = this.toRecord(entity);
    const columns = Object.keys(record);
    const values = Object.values(record);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    if (exists) {
      // Update existing
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");
      await this.pool.query(
        `UPDATE service_requests SET ${setClause} WHERE id = $${values.length + 1}`,
        [...values, entity.id]
      );
    } else {
      // Insert new
      await this.pool.query(
        `INSERT INTO service_requests (${columns.join(", ")}) VALUES (${placeholders})`,
        values
      );
    }

    // Clear session context after operation completes
    await this.clearSessionContext();
    return this.toAggregate(record);
  }

  async createMany(entities: CreateServiceRequestInput[]): Promise<string[]> {
    if (entities.length === 0) return [];
    
    const ids: string[] = [];
    const firstEntity = entities[0];
    if (!firstEntity) {
      throw new Error("Cannot create service requests from empty entities array");
    }
    // For bulk creation, extract shared context from first valid entity with CMBCD fields
    // This maintains backward compatibility with legacy CreateServiceRequestInput while enforcing CMBCD for new entities
    const firstValidEntity = entities.find(e => (e as any).context && (e as any).workId) as ServiceRequestAggregate | undefined;
    if (!firstValidEntity) {
      throw new Error("[ServiceRequestRepositoryPostgres] Cannot createMany: at least one entity must have CMBCD context and workId set (PROD-002-10 mandate)");
    }
    // Extract boundary metadata from first valid entity's CMBCD context (PROD-002-10)
    const tenantId = firstValidEntity.context?.tenantId;
    const workspaceId = firstValidEntity.context?.workspaceId;
    const workId = firstValidEntity.workId;
    
    // Validate required metadata before transaction
    if (!tenantId) {
      throw new Error("[ServiceRequestRepositoryPostgres] Cannot createMany without tenantId in CMBCD context (identity boundary violation)");
    }
    if (!workId) {
      throw new Error("[ServiceRequestRepositoryPostgres] Cannot createMany without workId (CORE-001 mandate)");
    }
    
    // Begin transaction to ensure atomicity
    const client = await this.pool.connect();
    try {
      // Set RLS session context before transaction (TENANT-ISOLATION-001)
      // Work-centric model: use workId as primary context, workspaceId as fallback context
      await this.setSessionContext(tenantId, { workspaceId, workId });
      await client.query("BEGIN");
      
      for (const entity of entities) {
        const id = crypto.randomUUID();
        ids.push(id);
        
        // Extract boundary metadata from each entity's CMBCD context if available, fall back to shared
        const typedEntity = entity as Partial<ServiceRequestAggregate>;
        const entityTenantId = typedEntity.context?.tenantId || tenantId;
        const entityWorkspaceId = typedEntity.context?.workspaceId || workspaceId;
        const entityWorkId = typedEntity.workId || workId;
        const entityActorId = typedEntity.actorMetadata?.actorId || firstValidEntity.actorMetadata?.actorId;
        
        const record = {
          id,
          title: entity.title,
          description: entity.description,
          category: entity.category,
          status: entity.status,
          budget: entity.budget,
          actor_id: entityActorId, // Extract actorId from CMBCD actorMetadata, not legacy createdBy
          tenant_id: entityTenantId,
          workspace_id: entityWorkspaceId,
          work_id: entityWorkId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        await client.query(
          "INSERT INTO service_requests (id, title, description, category, status, budget, actor_id, tenant_id, workspace_id, work_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
          [record.id, record.title, record.description, record.category, record.status, record.budget, record.actor_id, record.tenant_id, record.workspace_id, record.work_id, record.created_at, record.updated_at]
        );
      }
      
      await client.query("COMMIT");
      return ids;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      // Clear session context regardless of success/failure
      await this.clearSessionContext();
      client.release();
    }
  }

  // ACaaS-002: Implement update method untuk menyimpan hasil evaluasi compliance dengan tenant isolation (PostgreSQL)
  async update(id: ServiceRequestId, tenantId: string, workspaceId: string, updates: Partial<ServiceRequestAggregate>): Promise<ServiceRequestAggregate> {
    const client = await this.pool.connect();
    try {
      await this.setSessionContext(tenantId, workspaceId);
      
      // Cari record yang ada untuk verifikasi tenant ownership
      const existingRecord = await client.query(
        `SELECT * FROM service_requests WHERE id = $1`,
        [id]
      );
      if (existingRecord.rows.length === 0) {
        throw new Error(`[ServiceRequestRepositoryPostgres] Service request ${id} not found`);
      }
      const record = existingRecord.rows[0];
      // Verifikasi tenant isolation
      if (record.request_context?.tenantId !== tenantId || record.request_context?.workspaceId !== workspaceId) {
        throw new Error(`[ServiceRequestRepositoryPostgres] Tenant/workspace mismatch for update on request ${id}`);
      }
      
      // Bangun query update secara dinamis
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;
      
      // Handle executionContext (merge jika ada)
      if (updates.executionContext) {
        updateFields.push(`execution_context = execution_context || $${paramIndex}`);
        updateValues.push(JSON.stringify(updates.executionContext));
        paramIndex++;
      }
      // Handle status jika diupdate
      if (updates.status) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(updates.status);
        paramIndex++;
      }
      // Selalu update updated_at
      updateFields.push(`updated_at = NOW()`);
      
      if (updateFields.length === 0) {
        return this.toAggregate(record);
      }
      
      const updateQuery = `UPDATE service_requests SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
      updateValues.push(id);
      
      const result = await client.query(updateQuery, updateValues);
      return this.toAggregate(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await this.clearSessionContext();
      client.release();
    }
  }

  async remove(id: ServiceRequestId): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM service_requests WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rows.length > 0;
  }

  async delete(id: ServiceRequestId): Promise<boolean> {
    return this.remove(id);
  }
}

// PostgreSQL-backed service provider repository implementation
class ServiceProviderRepositoryPostgresImpl extends PostgresRepository<any> implements ServiceProviderRepository {
  readonly entityName = "ServiceProvider" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("service_providers");
  }

  // Convert database record to domain aggregate - implements CMBCD framework deserialization (mirrors ServiceRequest pattern)
  toAggregate(record: any): ServiceProviderAggregate {
    // Parse CMBCD fields from JSONB columns (persisted dalam database)
    const actorMetadata = record.actor_metadata ? JSON.parse(record.actor_metadata) : {};
    const allowedCapabilities = record.allowed_capabilities ? JSON.parse(record.allowed_capabilities) : [];
    const authorization = record.authorization ? JSON.parse(record.authorization) : {};
    const context = record.request_context ? JSON.parse(record.request_context) : {};
    const risk = record.risk_assessment ? JSON.parse(record.risk_assessment) : {};
    
    return {
      id: ServiceProviderId(record.id),
      workId: record.work_id,
      name: record.name,
      category: record.category as ServiceProviderCategory,
      description: record.description,
      rating: record.rating,
      location: record.location,
      verified: record.verified,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      // PROD-002-10: CMBCD fields terdeserialize dari JSONB columns untuk digunakan di domain layer
      actorMetadata,
      allowedCapabilities,
      authorization,
      context,
      risk,
    } as ServiceProviderAggregate;
  }

  // Convert domain aggregate to database record - implements CMBCD framework serialization (mirrors ServiceRequest pattern)
  toRecord(entity: ServiceProviderAggregate): any {
    // CORE-001: workId WAJIB diisi - tidak boleh fallback ke entity.id (user mandate: Work sebagai continuity object)
    if (!entity.workId) {
      throw new Error("[ServiceProviderRepositoryPostgres] ServiceProviderAggregate must have workId set (CORE-001 mandate)");
    }
    // PROD-002-10: CMBCD fields wajib diisi pada save (enforce non-entity-centric initialization per user mandate)
    if (!entity.actorMetadata || !entity.authorization || !entity.context || !entity.risk) {
      throw new Error("[ServiceProviderRepositoryPostgres] ServiceProviderAggregate must have all CMBCD fields set (PROD-002-10 mandate)");
    }
    // Extract tenantId/workspaceId/actorId dari CMBCD context (sumber truth terpusat, menghindari duplikasi data)
    const tenantId = entity.context.tenantId;
    const workspaceId = entity.context.workspaceId;
    const actorId = entity.actorMetadata.actorId;
    
    return {
      id: entity.id,
      work_id: entity.workId,
      name: entity.name,
      category: entity.category,
      description: entity.description,
      rating: entity.rating,
      location: entity.location,
      verified: entity.verified,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      tenant_id: tenantId,
      workspace_id: workspaceId,
      actor_id: actorId,
      // PROD-002-10: Serialize CMBCD fields ke JSONB columns untuk queryability dan persistence
      actor_metadata: JSON.stringify(entity.actorMetadata),
      allowed_capabilities: JSON.stringify(entity.allowedCapabilities),
      authorization: JSON.stringify(entity.authorization),
      request_context: JSON.stringify(entity.context),
      risk_assessment: JSON.stringify(entity.risk),
    };
  }

  async byId(id: ServiceProviderId): Promise<ServiceProviderAggregate | undefined> {
    const result = await this.pool.query(
      "SELECT * FROM service_providers WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(): Promise<readonly ServiceProviderAggregate[]> {
    const result = await this.pool.query("SELECT * FROM service_providers");
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByCategory(category: ServiceProviderCategory | "all"): Promise<readonly ServiceProviderAggregate[]> {
    if (category === "all") {
      return this.list();
    }
    const result = await this.pool.query(
      "SELECT * FROM service_providers WHERE category = $1",
      [category]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  // CORE-001: Legacy listByWorkspace/listByTenant dihapus sesuai architectural mandate
  // Semua query harus menggunakan work-centric pattern: listByWork/listByWorkIds

  listCategories(): readonly ServiceProviderCategory[] {
    // Return all supported categories as defined in contract to match in-memory implementation
    return [
      "Cloud Services",
      "IT Support",
      "Infrastructure",
      "Cybersecurity",
      "Software Development",
      "Managed Services",
      "Data & Analytics",
      "Payment Processing",
      "Trademark Registration"
    ];
  }

  async listByLocation(location: string): Promise<readonly ServiceProviderAggregate[]> {
    const result = await this.pool.query(
      "SELECT * FROM service_providers WHERE location ILIKE $1",
      [`%${location}%`]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  // CORE-001: listByWorkIds implements canonical batch work-centric query pattern untuk Postgres
  // Sama dengan pola yang digunakan di legal-case, investment-compliance (ILC) repositories
  async listByWorkIds(workIds: readonly string[]): Promise<readonly ServiceProviderAggregate[]> {
    if (workIds.length === 0) return [];
    
    // PostgreSQL IN clause dengan parameterized queries untuk mencegah SQL injection
    const placeholders = workIds.map((_, i) => `$${i + 1}`).join(", ");
    const query = `SELECT * FROM service_providers WHERE work_id IN (${placeholders})`;
    
    try {
      const result = await this.pool.query(query, [...workIds]);
      console.log(`[ServiceProviderRepositoryPostgres] listByWorkIds found ${result.rows.length} providers for workIds: ${workIds.join(", ")}`);
      return result.rows.map((row: any) => this.toAggregate(row));
    } catch (error) {
      console.error("[ServiceProviderRepositoryPostgres] listByWorkIds failed:", error);
      throw error;
    }
  }

  async save(entity: ServiceProviderAggregate): Promise<ServiceProviderAggregate> {
    // Set RLS session context before database operation (TENANT-ISOLATION-001)
    // Work-centric model: extract tenantId/workspaceId dari CMBCD context (CORE-001: Sumber truth terpusat)
    const tenantId = entity.context.tenantId;
    const workspaceId = entity.context.workspaceId;
    await this.setSessionContext(tenantId, { workspaceId, workId: entity.workId });
    
    const exists = await this.byId(entity.id);
    const record = this.toRecord(entity);
    const columns = Object.keys(record);
    const values = Object.values(record);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    if (exists) {
      // Update existing
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");
      await this.pool.query(
        `UPDATE service_providers SET ${setClause} WHERE id = $${values.length + 1}`,
        [...values, entity.id]
      );
    } else {
      // Insert new
      await this.pool.query(
        `INSERT INTO service_providers (${columns.join(", ")}) VALUES (${placeholders})`,
        values
      );
    }

    // Clear session context after operation completes
    await this.clearSessionContext();
    return this.toAggregate(record);
  }

  async remove(id: ServiceProviderId): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM service_providers WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rows.length > 0;
  }

  async delete(id: ServiceProviderId): Promise<boolean> {
    return this.remove(id);
  }
}

export function getServiceRequestRepositoryPostgres() {
  return new ServiceRequestRepositoryPostgresImpl();
}

export function getServiceProviderRepositoryPostgres() {
  return new ServiceProviderRepositoryPostgresImpl();
}