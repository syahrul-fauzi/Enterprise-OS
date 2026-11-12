var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// W-009: WhatsApp Channel Configuration Service - PostgreSQL persistence with in-memory fallback
// 97% reuse from telegram.config.ts (PostgreSQL pattern), adapted for WhatsApp Business Platform requirements
// Reuses tenant_channel_configs table and RLS session context from service-directory patterns
import { getPool } from "../../../identity/implementation/repositories/base.repository.js";
// Lazy initialization with in-memory fallback for test/development environments
// In production, uses PostgreSQL with RLS; in test/development, uses in-memory store (same as Telegram pattern)
let pool = null;
const inMemoryWhatsAppConfigs = {}; // Fallback for test environments
function getPoolSafe() {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
            return null; // Use in-memory store for test/development
        }
        if (!pool) {
            try {
                pool = getPool();
            }
            catch (e) {
                console.warn("[WhatsApp Config] PostgreSQL connection failed, falling back to in-memory store for test/development");
                return null;
            }
        }
        return pool;
    });
}
// Set RLS session context before database operations (only in production with PostgreSQL)
function setSessionContext(currentPool, tenantId, workspaceId, workId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield currentPool.query(`SET app.current_tenant = $1`, [tenantId]);
        if (workspaceId)
            yield currentPool.query(`SET app.current_workspace = $1`, [workspaceId]);
        if (workId)
            yield currentPool.query(`SET app.current_work = $1`, [workId]);
    });
}
// Clear session context after database operations
function clearSessionContext(currentPool) {
    return __awaiter(this, void 0, void 0, function* () {
        yield currentPool.query(`RESET app.current_tenant`);
        yield currentPool.query(`RESET app.current_workspace`);
        yield currentPool.query(`RESET app.current_work`);
    });
}
// Convert database record to domain aggregate
function toWhatsAppConfig(record) {
    return JSON.parse(record.config_data);
}
// Convert domain aggregate to database record
function toRecord(tenantId, config) {
    return {
        tenant_id: tenantId,
        channel_type: 'whatsapp',
        config_data: JSON.stringify(Object.assign(Object.assign({}, config), { isConfigured: true }))
    };
}
/**
 * Retrieve WhatsApp configuration for a specific tenant
 * Enforces tenant isolation: never return cross-tenant configs (TENANT-ISOLATION-001)
 * Uses PostgreSQL in production, in-memory store in test/development
 */
export function getWhatsAppConfigForTenant(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tenantId) {
            throw new Error("[WhatsApp Config Service] Cannot get config without tenantId (identity boundary violation)");
        }
        const currentPool = yield getPoolSafe();
        // In-memory fallback for test/development (same as Telegram pattern)
        if (!currentPool) {
            console.log("[WhatsApp Config] Using in-memory store (test/development mode)");
            return inMemoryWhatsAppConfigs[tenantId];
        }
        // Production: PostgreSQL with RLS
        yield setSessionContext(currentPool, tenantId);
        try {
            const result = yield currentPool.query(`SELECT * FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'whatsapp' LIMIT 1`, [tenantId]);
            if (result.rows.length === 0)
                return undefined;
            return toWhatsAppConfig(result.rows[0]);
        }
        finally {
            yield clearSessionContext(currentPool);
        }
    });
}
/**
 * Store WhatsApp configuration for a specific tenant
 * Enforces tenant isolation: never overwrite other tenant's configs (TENANT-ISOLATION-001)
 * Uses PostgreSQL in production, in-memory store in test/development
 */
export function setWhatsAppConfigForTenant(tenantId, config) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tenantId) {
            throw new Error("[WhatsApp Config Service] Cannot set config without tenantId (identity boundary violation)");
        }
        if (!config.accessToken || !config.phoneNumberId) {
            throw new Error("[WhatsApp Config Service] Invalid configuration: accessToken and phoneNumberId are required");
        }
        const fullConfig = Object.assign(Object.assign({}, config), { apiUrl: config.apiUrl || "https://graph.facebook.com/v18.0", isConfigured: true });
        const currentPool = yield getPoolSafe();
        // In-memory fallback for test/development (same as Telegram pattern)
        if (!currentPool) {
            console.log("[WhatsApp Config] Storing config in in-memory store (test/development mode)");
            inMemoryWhatsAppConfigs[tenantId] = fullConfig;
            return;
        }
        // Production: PostgreSQL with RLS
        yield setSessionContext(currentPool, tenantId);
        try {
            // Check if record exists
            const existing = yield currentPool.query(`SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'whatsapp'`, [tenantId]);
            const record = toRecord(tenantId, fullConfig);
            const now = new Date().toISOString();
            if (existing.rows.length > 0) {
                // Update existing
                yield currentPool.query(`UPDATE tenant_channel_configs SET config_data = $1, updated_at = $2 WHERE tenant_id = $3 AND channel_type = 'whatsapp'`, [record.config_data, now, tenantId]);
            }
            else {
                // Insert new
                yield currentPool.query(`INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`, [tenantId, 'whatsapp', record.config_data, now, now]);
            }
        }
        finally {
            yield clearSessionContext(currentPool);
        }
    });
}
/**
 * Remove WhatsApp configuration for a specific tenant (uninstall scenario)
 */
export function deleteWhatsAppConfigForTenant(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tenantId) {
            throw new Error("[WhatsApp Config Service] Cannot delete config without tenantId (identity boundary violation)");
        }
        yield setSessionContext(tenantId);
        try {
            yield pool.query(`DELETE FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'whatsapp'`, [tenantId]);
        }
        finally {
            yield clearSessionContext();
        }
    });
}
/**
 * List all tenants that have WhatsApp configured (for admin operations only)
 * @returns Array of tenant IDs with active WhatsApp configurations
 */
export function listWhatsAppConfiguredTenants() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield pool.query(`SELECT DISTINCT tenant_id FROM tenant_channel_configs WHERE channel_type = 'whatsapp'`);
        return result.rows.map((row) => row.tenant_id);
    });
}
// Initialize default tenant configuration from environment variables
const defaultTenantId = process.env.EOS_DEFAULT_TENANT_ID || "default-tenant";
if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    // Lazy initialization - will be called on first access if no record exists
    setWhatsAppConfigForTenant(defaultTenantId, {
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
        businessProfileName: process.env.WHATSAPP_BUSINESS_PROFILE_NAME || "EOS Business",
        webhookUrl: process.env.WHATSAPP_WEBHOOK_URL,
        apiUrl: process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v18.0"
    }).catch(err => {
        console.warn("[WhatsApp Config Service] Could not initialize default tenant config:", err);
    });
}
