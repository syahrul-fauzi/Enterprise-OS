// W-010-08: Llama3 Runtime Configuration Service - PostgreSQL-backed tenant-isolated config storage
// 100% reuse from comfyui.config.ts / whatsapp.config.ts (PostgreSQL RLS pattern)
// Maintains full backward API compatibility while adhering to EOS tenant isolation principles
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
function toLlama3Config(record) {
    return JSON.parse(record.config_data);
}
/**
 * Convert domain config object to database record (CMBCD serialization)
 */
function toRecord(tenantId, config) {
    return {
        tenant_id: tenantId,
        channel_type: 'llama3',
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
        if (process.env.EOS_LLAMA3_API_KEY && process.env.EOS_LLAMA3_BASE_URL && process.env.EOS_LLAMA3_MODEL_VERSION) {
            yield setSessionContext(defaultTenantId);
            try {
                // Check if default config already exists
                const existing = yield pool.query(`SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'llama3'`, [defaultTenantId]);
                if (existing.rows.length === 0) {
                    const defaultConfig = {
                        apiKey: process.env.EOS_LLAMA3_API_KEY,
                        baseUrl: process.env.EOS_LLAMA3_BASE_URL,
                        modelVersion: process.env.EOS_LLAMA3_MODEL_VERSION,
                        webhookUrl: process.env.EOS_LLAMA3_WEBHOOK_URL,
                        maxTokens: process.env.EOS_LLAMA3_MAX_TOKENS ? parseInt(process.env.EOS_LLAMA3_MAX_TOKENS) : 4096,
                        temperature: process.env.EOS_LLAMA3_TEMPERATURE ? parseFloat(process.env.EOS_LLAMA3_TEMPERATURE) : 0.7,
                        isConfigured: true
                    };
                    const record = toRecord(defaultTenantId, defaultConfig);
                    const now = new Date().toISOString();
                    yield pool.query(`INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`, [defaultTenantId, 'llama3', record.config_data, now, now]);
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
 * Get Llama3 configuration for a specific tenant (tenant-isolated RLS query)
 */
export function getLlama3ConfigForTenant(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield initializeDefaultTenantConfig();
        yield setSessionContext(tenantId);
        try {
            const result = yield pool.query(`SELECT config_data FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'llama3'`, [tenantId]);
            if (result.rows.length === 0) {
                // Jika tidak ada config khusus tenant, coba ambil default tenant config
                if (tenantId !== process.env.EOS_DEFAULT_TENANT_ID) {
                    return getLlama3ConfigForTenant(process.env.EOS_DEFAULT_TENANT_ID || "default-tenant");
                }
                return null;
            }
            return toLlama3Config(result.rows[0]);
        }
        finally {
            yield clearSessionContext();
        }
    });
}
/**
 * Set Llama3 configuration for a specific tenant (tenant-isolated RLS query)
 */
export function setLlama3ConfigForTenant(tenantId, config) {
    return __awaiter(this, void 0, void 0, function* () {
        yield setSessionContext(tenantId);
        try {
            // Cek apakah config sudah ada
            const existing = yield pool.query(`SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'llama3'`, [tenantId]);
            const record = toRecord(tenantId, config);
            const now = new Date().toISOString();
            if (existing.rows.length === 0) {
                // Insert config baru
                yield pool.query(`INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`, [tenantId, 'llama3', record.config_data, now, now]);
            }
            else {
                // Update config yang sudah ada
                yield pool.query(`UPDATE tenant_channel_configs SET config_data = $1, updated_at = $2 WHERE tenant_id = $3 AND channel_type = 'llama3'`, [record.config_data, now, tenantId, 'llama3']);
            }
        }
        finally {
            yield clearSessionContext();
        }
    });
}
/**
 * Delete Llama3 configuration for a specific tenant (tenant-isolated RLS query)
 */
export function deleteLlama3ConfigForTenant(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield setSessionContext(tenantId);
        try {
            yield pool.query(`DELETE FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'llama3'`, [tenantId]);
        }
        finally {
            yield clearSessionContext();
        }
    });
}
