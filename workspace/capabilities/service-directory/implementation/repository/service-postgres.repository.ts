import { Pool } from "pg";
import { PostgresRepository } from "../../../identity/implementation/repositories/base.repository.js";
import {
  ServiceRequestId,
  ServiceProviderId,
  type ServiceRequestAggregate,
  type ServiceProviderAggregate,
  type ServiceRequestRepository,
  type ServiceProviderRepository,
  ServiceRequestStatus,
  ServiceProviderCategory,
} from "../contracts/service.contracts.js";
import { initIdentitySchema } from "../../../identity/implementation/repositories/identity-schema.js";

// PostgreSQL-backed service request repository implementation
class ServiceRequestRepositoryPostgresImpl extends PostgresRepository<any> implements ServiceRequestRepository {
  readonly entityName = "ServiceRequest" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("service_requests");
  }

  // Convert database record to domain aggregate
  private toAggregate(record: any): ServiceRequestAggregate {
    return {
      id: ServiceRequestId(record.id),
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
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id,
      actorId: record.actor_id,
    } as ServiceRequestAggregate;
  }

  // Convert domain aggregate to database record
  private toRecord(entity: ServiceRequestAggregate): any {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      category: entity.category,
      status: entity.status,
      requester_name: entity.requesterName,
      provider_id: entity.providerId,
      budget: entity.budget,
      deadline: entity.deadline?.toISOString(),
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      delivered_at: entity.deliveredAt?.toISOString(),
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      actor_id: (entity as any).actorId,
    };
  }

  async byId(id: ServiceRequestId): Promise<ServiceRequestAggregate | undefined> {
    const result = await this.pool.query(
      "SELECT * FROM service_requests WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(): Promise<readonly ServiceRequestAggregate[]> {
    const result = await this.pool.query("SELECT * FROM service_requests");
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

  async listByWorkspace(workspaceId: string): Promise<readonly ServiceRequestAggregate[]> {
    const result = await this.pool.query(
      "SELECT * FROM service_requests WHERE workspace_id = $1",
      [workspaceId]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByTenant(tenantId: string): Promise<readonly ServiceRequestAggregate[]> {
    const result = await this.pool.query(
      "SELECT * FROM service_requests WHERE tenant_id = $1",
      [tenantId]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: ServiceRequestAggregate): Promise<ServiceRequestAggregate> {
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

    return this.toAggregate(record);
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

  // Convert database record to domain aggregate
  private toAggregate(record: any): ServiceProviderAggregate {
    return {
      id: ServiceProviderId(record.id),
      name: record.name,
      category: record.category as ServiceProviderCategory,
      description: record.description,
      rating: record.rating,
      location: record.location,
      verified: record.verified,
      createdAt: new Date(record.created_at),
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id,
      actorId: record.actor_id,
    } as ServiceProviderAggregate;
  }

  // Convert domain aggregate to database record
  private toRecord(entity: ServiceProviderAggregate): any {
    return {
      id: entity.id,
      name: entity.name,
      category: entity.category,
      description: entity.description,
      rating: entity.rating,
      location: entity.location,
      verified: entity.verified,
      created_at: entity.createdAt.toISOString(),
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      actor_id: (entity as any).actorId,
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

  async listByWorkspace(workspaceId: string): Promise<readonly ServiceProviderAggregate[]> {
    const result = await this.pool.query(
      "SELECT * FROM service_providers WHERE workspace_id = $1",
      [workspaceId]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByTenant(tenantId: string): Promise<readonly ServiceProviderAggregate[]> {
    const result = await this.pool.query(
      "SELECT * FROM service_providers WHERE tenant_id = $1",
      [tenantId]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: ServiceProviderAggregate): Promise<ServiceProviderAggregate> {
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

// Lazy initialization functions to avoid eager Postgres pool creation
let serviceRequestRepositoryPostgresInstance: ServiceRequestRepositoryPostgresImpl | null = null;
let serviceProviderRepositoryPostgresInstance: ServiceProviderRepositoryPostgresImpl | null = null;

export function getServiceRequestRepositoryPostgres(): ServiceRequestRepository {
  if (!serviceRequestRepositoryPostgresInstance) {
    serviceRequestRepositoryPostgresInstance = new ServiceRequestRepositoryPostgresImpl();
  }
  return serviceRequestRepositoryPostgresInstance;
}

export function getServiceProviderRepositoryPostgres(): ServiceProviderRepository {
  if (!serviceProviderRepositoryPostgresInstance) {
    serviceProviderRepositoryPostgresInstance = new ServiceProviderRepositoryPostgresImpl();
  }
  return serviceProviderRepositoryPostgresInstance;
}