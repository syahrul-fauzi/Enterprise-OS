import { PostgresRepository } from "./base.repository";
import {
  MembershipId,
  TenantId,
  UserId,
  WorkspaceId,
  type MembershipAggregate,
  type MembershipRepository,
} from "../contracts/index";

// PostgreSQL-backed membership repository implementation
class MembershipRepositoryPostgresImpl extends PostgresRepository<any> implements MembershipRepository {
  readonly entityName = "Membership" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("memberships");
  }

  // Convert database record to domain aggregate - implements base.repository.ts abstract protected method
  protected toAggregate(record: any): MembershipAggregate {
    return {
      id: MembershipId(record.id),
      userId: UserId(record.user_id),
      tenantId: TenantId(record.tenant_id),
      workspaceId: WorkspaceId(record.workspace_id),
      role: record.role,
      joinedAt: new Date(record.joined_at),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    } as MembershipAggregate;
  }

  // Convert domain aggregate to database record - implements base.repository.ts abstract protected method
  protected toRecord(entity: MembershipAggregate): any {
    return {
      id: entity.id,
      user_id: entity.userId,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      role: entity.role,
      joined_at: entity.joinedAt.toISOString(),
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

  async byId(id: MembershipId): Promise<MembershipAggregate | undefined> {
    const result = await this.pool.query("SELECT * FROM memberships WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async listByUser(userId: UserId): Promise<readonly MembershipAggregate[]> {
    const result = await this.pool.query("SELECT * FROM memberships WHERE user_id = $1 ORDER BY joined_at DESC", [userId]);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByTenant(tenantId: TenantId): Promise<readonly MembershipAggregate[]> {
    const result = await this.pool.query("SELECT * FROM memberships WHERE tenant_id = $1 ORDER BY joined_at DESC", [tenantId]);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByWorkspace(workspaceId: WorkspaceId): Promise<readonly MembershipAggregate[]> {
    const result = await this.pool.query("SELECT * FROM memberships WHERE workspace_id = $1 ORDER BY joined_at DESC", [workspaceId]);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async find(
    userId: UserId,
    tenantId: TenantId,
    workspaceId: WorkspaceId,
  ): Promise<MembershipAggregate | undefined> {
    const result = await this.pool.query(
      "SELECT * FROM memberships WHERE user_id = $1 AND tenant_id = $2 AND workspace_id = $3",
      [userId, tenantId, workspaceId]
    );
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(): Promise<readonly MembershipAggregate[]> {
    const result = await this.pool.query("SELECT * FROM memberships ORDER BY joined_at DESC", []);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: MembershipAggregate): Promise<MembershipAggregate> {
    const updated = { ...entity, updatedAt: new Date() };
    const record = this.toRecord(updated);
    
    const exists = await this.byId(entity.id);
    if (exists) {
      await this.pool.query(
        `UPDATE memberships SET 
          user_id = $1, tenant_id = $2, workspace_id = $3, role = $4, joined_at = $5, created_at = $6, updated_at = $7
          WHERE id = $8`,
        [
          record.user_id, record.tenant_id, record.workspace_id, record.role,
          record.joined_at, record.created_at, record.updated_at, record.id
        ]
      );
    } else {
      await this.pool.query(
        `INSERT INTO memberships (
          id, user_id, tenant_id, workspace_id, role, joined_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          record.id, record.user_id, record.tenant_id, record.workspace_id, record.role,
          record.joined_at, record.created_at, record.updated_at
        ]
      );
    }

    return this.byId(entity.id) as Promise<MembershipAggregate>;
  }

  async remove(id: MembershipId): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM memberships WHERE id = $1", [id]);
    return (result as any).rowCount > 0;
  }
}

let _instance: MembershipRepository | null = null;
export function getMembershipRepositoryPostgres(): MembershipRepository {
  if (!_instance) {
    _instance = new MembershipRepositoryPostgresImpl();
  }
  return _instance;
}

const _lazyPgMembershipRepo: MembershipRepository = new Proxy({} as MembershipRepository, {
  get(_target: any, prop: string | symbol) {
    const real = getMembershipRepositoryPostgres();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

export const MembershipRepositoryPostgres = _lazyPgMembershipRepo;