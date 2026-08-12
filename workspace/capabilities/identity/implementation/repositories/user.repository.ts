import { PostgresRepository } from "./base.repository";
import {
  UserId,
  type UserAggregate,
  type UserRepository,
} from "../contracts/identity.contracts";

// PostgreSQL-backed user repository implementation
class UserRepositoryPostgresImpl extends PostgresRepository<any> implements UserRepository {
  readonly entityName = "User" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("users");
  }

  // Convert database record to domain aggregate
  private toAggregate(record: any): UserAggregate {
    return {
      id: UserId(record.id),
      email: record.email,
      displayName: record.display_name,
      passwordHash: record.password_hash,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    } as UserAggregate;
  }

  // Convert domain aggregate to database record
  private toRecord(entity: UserAggregate): any {
    return {
      id: entity.id,
      email: entity.email,
      display_name: entity.displayName,
      password_hash: entity.passwordHash,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

  async byId(id: UserId): Promise<UserAggregate | undefined> {
    const result = await this.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.length === 0) return undefined;
    return this.toAggregate(result[0]);
  }

  async byEmail(email: string): Promise<UserAggregate | undefined> {
    const needle = email.trim().toLowerCase();
    const result = await this.query("SELECT * FROM users WHERE LOWER(email) = $1", [needle]);
    if (result.length === 0) return undefined;
    return this.toAggregate(result[0]);
  }

  async list(): Promise<readonly UserAggregate[]> {
    const result = await this.query("SELECT * FROM users ORDER BY created_at DESC", []);
    return result.map((row: any) => this.toAggregate(row));
  }

  async save(entity: UserAggregate): Promise<UserAggregate> {
    const updated = { ...entity, updatedAt: new Date() };
    const record = this.toRecord(updated);
    
    const exists = await this.byId(entity.id);
    if (exists) {
      await this.query(
        `UPDATE users SET 
          email = $1, display_name = $2, password_hash = $3, created_at = $4, updated_at = $5
          WHERE id = $6`,
        [
          record.email, record.display_name, record.password_hash,
          record.created_at, record.updated_at, record.id
        ]
      );
    } else {
      await this.query(
        `INSERT INTO users (
          id, email, display_name, password_hash, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          record.id, record.email, record.display_name, record.password_hash,
          record.created_at, record.updated_at
        ]
      );
    }

    return this.byId(entity.id) as Promise<UserAggregate>;
  }

  async remove(id: UserId): Promise<boolean> {
    const result = await this.query("DELETE FROM users WHERE id = $1", [id]);
    return (result as any).rowCount > 0;
  }
}

export const UserRepositoryPostgres: UserRepository = new UserRepositoryPostgresImpl();
  }

  async remove(id: UserId): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }
}

export const UserRepositoryPostgres: UserRepository = new UserRepositoryPostgresImpl();