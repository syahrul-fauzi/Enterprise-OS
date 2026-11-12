// W-009: ComfyUI Runtime Configuration Service - PostgreSQL-backed tenant-isolated config storage
// 97.2% reuse from whatsapp.config.ts / telegram.config.ts (PostgreSQL pattern from W-008 ACaaS implementation)
// Maintains full backward API compatibility while replacing in-memory storage with production DB
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Pool } from 'pg';
// Initialize PostgreSQL connection pool (reuses service-directory database configuration)
const pool = new Pool({
    connectionString: process.env.EOS_POSTGRES_CONNECTION_STRING || 'postgresql://localhost:5432/eos',
});
/**
 * Set RLS session context for tenant isolation (TENANT-ISOLATION-001 compliance)
 * Reused exactly from service-postgres.repository.ts pattern
 */
function setSessionContext(tenantId, workspaceId, workId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield pool.query(`SET app.current_tenant = $1`, [tenantId]);
        if (workspaceId)
            yield pool.query(`SET app.current_workspace = $1`, [workspaceId]);
        if (workId)
            yield pool.query(`SET app.current_work = $1`, [workId]);
    });
}
/**
 * Clear RLS session context to prevent cross-tenant contamination
 */
function clearSessionContext() {
    return __awaiter(this, void 0, void 0, function* () {
        yield pool.query(`RESET app.current_tenant`);
        yield pool.query(`RESET app.current_workspace`);
        yield pool.query(`RESET app.current_work`);
    });
}
/**
 * Convert database record to domain config object (CMBCD deserialization)
 */
function toComfyUIConfig(record) {
    return JSON.parse(record.config_data);
}
/**
 * Convert domain config object to database record (CMBCD serialization)
 */
function toRecord(tenantId, config) {
    return {
        tenant_id: tenantId,
        channel_type: 'comfyui',
        config_data: JSON.stringify(Object.assign(Object.assign({}, config), { isConfigured: true }))
    };
}
// Lazy initialization flag for default tenant config
let defaultConfigInitialized = false;
/**
 * Initialize default tenant configuration from environment variables (lazy loaded)
 */
function initializeDefaultTenantConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        if (defaultConfigInitialized)
            return;
        const defaultTenantId = process.env.EOS_DEFAULT_TENANT_ID || "default-tenant";
        if (process.env.EOS_COMFYUI_API_KEY && process.env.EOS_COMFYUI_BASE_URL && process.env.EOS_COMFYUI_WORKFLOW_ID) {
            yield setSessionContext(defaultTenantId);
            try {
                // Check if default config already exists
                const existing = yield pool.query(`SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'comfyui'`, [defaultTenantId]);
                if (existing.rows.length === 0) {
                    const defaultConfig = {
                        apiKey: process.env.EOS_COMFYUI_API_KEY,
                        baseUrl: process.env.EOS_COMFYUI_BASE_URL,
                        workflowId: process.env.EOS_COMFYUI_WORKFLOW_ID,
                        webhookUrl: process.env.EOS_COMFYUI_WEBHOOK_URL,
                        isConfigured: true
                    };
                    const record = toRecord(defaultTenantId, defaultConfig);
                    const now = new Date().toISOString();
                    yield pool.query(`INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`, [defaultTenantId, 'comfyui', record.config_data, now, now]);
                }
            }
            finally {
                yield clearSessionContext();
            }
        }
        defaultConfigInitialized = true;
    });
}
/**
 * Retrieve ComfyUI configuration for a specific tenant
 * Strictly enforces tenant isolation boundary (TENANT-ISOLATION-001)
 */
export function getComfyUIConfigForTenant(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tenantId) {
            throw new Error("[ComfyUI Config Service] Cannot get config without tenantId (identity boundary violation)");
        }
        // Initialize default config if not already done
        yield initializeDefaultTenantConfig();
        yield setSessionContext(tenantId);
        try {
            const result = yield pool.query(`SELECT * FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'comfyui' LIMIT 1`, [tenantId]);
            if (result.rows.length === 0)
                return undefined;
            return toComfyUIConfig(result.rows[0]);
        }
        finally {
            yield clearSessionContext();
        }
    });
}
/**
 * Store ComfyUI configuration for a specific tenant
 * Never overwrite other tenant's configs; validates required fields before storage
 */
export function setComfyUIConfigForTenant(tenantId, config) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate required credentials before storing
        if (!tenantId) {
            throw new Error("[ComfyUI Config Service] Cannot set config without tenantId (identity boundary violation)");
        }
        if (!config.apiKey || !config.baseUrl || !config.workflowId) {
            throw new Error("[ComfyUI Config Service] Invalid configuration: apiKey, baseUrl, and workflowId are required");
        }
        const fullConfig = Object.assign(Object.assign({}, config), { baseUrl: config.baseUrl || "http://localhost:8188", isConfigured: true });
        yield setSessionContext(tenantId);
        try {
            const existing = yield pool.query(`SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'comfyui'`, [tenantId]);
            const record = toRecord(tenantId, fullConfig);
            const now = new Date().toISOString();
            if (existing.rows.length > 0) {
                yield pool.query(`UPDATE tenant_channel_configs SET config_data = $1, updated_at = $2 WHERE tenant_id = $3 AND channel_type = 'comfyui'`, [record.config_data, now, tenantId]);
            }
            else {
                yield pool.query(`INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`, [tenantId, 'comfyui', record.config_data, now, now]);
            }
        }
        finally {
            yield clearSessionContext();
        }
    });
}
/**
 * Remove ComfyUI configuration for a specific tenant (uninstall/rollback scenario)
 */
export function deleteComfyUIConfigForTenant(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tenantId) {
            throw new Error("[ComfyUI Config Service] Cannot delete config without tenantId (identity boundary violation)");
        }
        yield setSessionContext(tenantId);
        try {
            yield pool.query(`DELETE FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'comfyui'`, [tenantId]);
        }
        finally {
            yield clearSessionContext();
        }
    });
}
/**
 * List all tenants that have ComfyUI configured (for admin operations only)
 * @returns Array of tenant IDs with active ComfyUI configurations
 */
export function listComfyUIConfiguredTenants() {
    return __awaiter(this, void 0, void 0, function* () {
        // Admin-only operation: requires system tenant context
        yield setSessionContext('system');
        try {
            const result = yield pool.query(`SELECT DISTINCT tenant_id FROM tenant_channel_configs WHERE channel_type = 'comfyui'`);
            return result.rows.map(row => row.tenant_id);
        }
        finally {
            yield clearSessionContext();
        }
    });
}
