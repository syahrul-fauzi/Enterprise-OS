"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseRepositoryPostgres = void 0;
const base_repository_1 = require("../../../identity/implementation/repositories/base.repository");
const case_contracts_1 = require("../contracts/case.contracts");
// PostgreSQL-backed case repository implementation
class CaseRepositoryPostgresImpl extends base_repository_1.PostgresRepository {
    entityName = "Case";
    kind = "repository";
    constructor() {
        super("cases");
    }
    // Convert database record to domain aggregate
    toAggregate(record) {
        return {
            id: (0, case_contracts_1.CaseId)(record.id),
            title: record.title,
            description: record.description,
            status: record.status,
            priority: record.priority,
            lawyerId: record.lawyer_id,
            createdAt: new Date(record.created_at),
            updatedAt: new Date(record.updated_at),
            ...(record.closed_at && { closedAt: new Date(record.closed_at) }),
        };
    }
    // Convert domain aggregate to database record
    toRecord(entity) {
        return {
            id: entity.id,
            title: entity.title,
            description: entity.description,
            status: entity.status,
            priority: entity.priority,
            lawyer_id: entity.lawyerId,
            tenant_id: entity.tenantId,
            workspace_id: entity.workspaceId,
            created_at: entity.createdAt,
            updated_at: entity.updatedAt,
            ...(entity.closedAt && { closed_at: entity.closedAt }),
        };
    }
    async byId(id) {
        const result = await this.pool.query("SELECT * FROM cases WHERE id = $1", [id]);
        if (result.rows.length === 0)
            return undefined;
        return this.toAggregate(result.rows[0]);
    }
    async list() {
        const result = await this.pool.query("SELECT * FROM cases");
        return result.rows.map((row) => this.toAggregate(row));
    }
    async listByTenant(tenantId) {
        const result = await this.pool.query("SELECT * FROM cases WHERE tenant_id = $1", [tenantId]);
        return result.rows.map((row) => this.toAggregate(row));
    }
    async listByWorkspace(workspaceId) {
        const result = await this.pool.query("SELECT * FROM cases WHERE workspace_id = $1", [workspaceId]);
        return result.rows.map((row) => this.toAggregate(row));
    }
    async save(entity) {
        const exists = await this.byId(entity.id);
        const record = this.toRecord(entity);
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
        if (exists) {
            // Update existing
            const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");
            await this.pool.query(`UPDATE cases SET ${setClause} WHERE id = $${values.length + 1}`, [...values, entity.id]);
        }
        else {
            // Insert new
            await this.pool.query(`INSERT INTO cases (${columns.join(", ")}) VALUES (${placeholders})`, values);
        }
        const updated = { ...entity, updatedAt: new Date() };
        return this.toAggregate(this.toRecord(updated));
    }
    async remove(id) {
        const result = await this.pool.query("DELETE FROM cases WHERE id = $1 RETURNING id", [id]);
        return result.rows.length > 0;
    }
}
exports.CaseRepositoryPostgres = new CaseRepositoryPostgresImpl();
