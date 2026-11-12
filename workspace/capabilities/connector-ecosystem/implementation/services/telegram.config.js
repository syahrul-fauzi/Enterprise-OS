var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Telegram configuration service with tenant isolation (W-009: PostgreSQL persistence)
 * Implements tenant-isolated credentials for Telegram channel using PostgreSQL RLS
 * Reuses service-directory PostgreSQL patterns and maintains backward API compatibility
 */
import { getPool } from "../../../identity/implementation/repositories/base.repository.js";
// Initialize connection pool with unified connection string
const pool = getPool();
// Set RLS session context before database operations (TENANT-ISOLATION-001)
function setSessionContext(tenantId, workspaceId, workId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield pool.query(`SET app.current_tenant = $1`, [tenantId]);
        if (workspaceId)
            yield pool.query(`SET app.current_workspace = $1`, [workspaceId]);
        if (workId)
            yield pool.query(`SET app.current_work = $1`, [workId]);
    });
}
// Clear session context after database operations
function clearSessionContext() {
    return __awaiter(this, void 0, void 0, function* () {
        yield pool.query(`RESET app.current_tenant`);
        yield pool.query(`RESET app.current_workspace`);
        yield pool.query(`RESET app.current_work`);
    });
}
// Convert database record to domain aggregate
function toTelegramConfig(record) {
    return JSON.parse(record.config_data);
}
// Convert domain aggregate to database record
function toRecord(tenantId, config) {
    return {
        tenant_id: tenantId,
        channel_type: 'telegram',
        config_data: JSON.stringify(Object.assign(Object.assign({}, config), { isConfigured: true }))
    };
}
/**
 * Get Telegram configuration for a specific tenant (enforces tenant isolation)
 * @param tenantId - Canonical EOS tenant ID
 * @returns Telegram configuration or undefined if not configured
 */
export function getTelegramConfigForTenant(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tenantId) {
            throw new Error("[Telegram Config Service] Cannot get config without tenantId (identity boundary violation)");
        }
        yield setSessionContext(tenantId);
        try {
            const result = yield pool.query(`SELECT * FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'telegram' LIMIT 1`, [tenantId]);
            if (result.rows.length === 0)
                return undefined;
            return toTelegramConfig(result.rows[0]);
        }
        finally {
            yield clearSessionContext();
        }
    });
}
/**
 * Set Telegram configuration for a specific tenant (enforces tenant isolation)
 * @param tenantId - Canonical EOS tenant ID
 * @param config - Telegram configuration to store
 */
export function setTelegramConfigForTenant(tenantId, config) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tenantId) {
            throw new Error("[Telegram Config Service] Cannot set config without tenantId (identity boundary violation)");
        }
        if (!config.botToken || !config.apiUrl) {
            throw new Error("[Telegram Config Service] Invalid configuration: botToken and apiUrl are required");
        }
        yield setSessionContext(tenantId);
        try {
            // Check if record exists
            const existing = yield pool.query(`SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'telegram'`, [tenantId]);
            const record = toRecord(tenantId, config);
            const now = new Date().toISOString();
            if (existing.rows.length > 0) {
                // Update existing
                yield pool.query(`UPDATE tenant_channel_configs SET config_data = $1, updated_at = $2 WHERE tenant_id = $3 AND channel_type = 'telegram'`, [record.config_data, now, tenantId]);
            }
            else {
                // Insert new
                yield pool.query(`INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`, [tenantId, 'telegram', record.config_data, now, now]);
            }
        }
        finally {
            yield clearSessionContext();
        }
    });
}
/**
 * Delete Telegram configuration for a specific tenant (for cleanup/rollback)
 * @param tenantId - Canonical EOS tenant ID
 */
export function deleteTelegramConfigForTenant(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tenantId) {
            throw new Error("[Telegram Config Service] Cannot delete config without tenantId (identity boundary violation)");
        }
        yield setSessionContext(tenantId);
        try {
            yield pool.query(`DELETE FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'telegram'`, [tenantId]);
        }
        finally {
            yield clearSessionContext();
        }
    });
}
/**
 * List all tenants that have Telegram configured (for admin operations only)
 * @returns Array of tenant IDs with active Telegram configurations
 */
export function listTelegramConfiguredTenants() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield pool.query(`SELECT DISTINCT tenant_id FROM tenant_channel_configs WHERE channel_type = 'telegram'`);
        return result.rows.map((row) => row.tenant_id);
    });
}
// Initialize default tenant configuration from environment variables
const defaultTenantId = process.env.EOS_DEFAULT_TENANT_ID || "default-tenant";
if (process.env.TELEGRAM_BOT_TOKEN) {
    // Lazy initialization - will be called on first access if no record exists
    setTelegramConfigForTenant(defaultTenantId, {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        apiUrl: "https://api.telegram.org",
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL
    }).catch(err => {
        console.warn("[Telegram Config Service] Could not initialize default tenant config:", err);
    });
}
