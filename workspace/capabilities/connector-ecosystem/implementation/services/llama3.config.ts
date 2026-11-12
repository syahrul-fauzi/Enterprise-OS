// W-010-08: Llama3 Runtime Configuration Service - PostgreSQL-backed tenant-isolated config storage
// 100% reuse from comfyui.config.ts / whatsapp.config.ts (PostgreSQL RLS pattern)
// Maintains full backward API compatibility while adhering to EOS tenant isolation principles

import { Pool } from 'pg';

// Initialize PostgreSQL connection pool (reuses service-directory database configuration)
const pool = new Pool({
  connectionString: process.env.EOS_POSTGRES_CONNECTION_STRING || 'postgresql://localhost:5432/eos',
});

interface Llama3Config {
  apiKey: string;
  baseUrl: string;
  modelVersion: string;
  webhookUrl?: string;
  isConfigured: boolean;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Set RLS session context for tenant isolation (TENANT-ISOLATION-001 compliance)
 * Reused exactly from service-postgres.repository.ts pattern
 */
async function setSessionContext(tenantId: string, workspaceId?: string, workId?: string) {
  await pool.query(`SET app.current_tenant = $1`, [tenantId]);
  if (workspaceId) await pool.query(`SET app.current_workspace = $1`, [workspaceId]);
  if (workId) await pool.query(`SET app.current_work = $1`, [workId]);
}

/**
 * Clear RLS session context to prevent cross-tenant contamination
 */
async function clearSessionContext() {
  await pool.query(`RESET app.current_tenant`);
  await pool.query(`RESET app.current_workspace`);
  await pool.query(`RESET app.current_work`);
}

/**
 * Convert database record to domain config object (CMBCD deserialization)
 */
function toLlama3Config(record: any): Llama3Config {
  return JSON.parse(record.config_data);
}

/**
 * Convert domain config object to database record (CMBCD serialization)
 */
function toRecord(tenantId: string, config: Llama3Config): Omit<any, 'id' | 'created_at' | 'updated_at'> {
  return {
    tenant_id: tenantId,
    channel_type: 'llama3',
    config_data: JSON.stringify({ ...config, isConfigured: true })
  };
}

// Lazy initialization flag for default tenant config
let defaultConfigInitialized = false;

/**
 * Initialize default tenant configuration from environment variables (lazy loaded)
 */
async function initializeDefaultTenantConfig() {
  if (defaultConfigInitialized) return;
  
  const defaultTenantId = process.env.EOS_DEFAULT_TENANT_ID || "default-tenant";
  if (process.env.EOS_LLAMA3_API_KEY && process.env.EOS_LLAMA3_BASE_URL && process.env.EOS_LLAMA3_MODEL_VERSION) {
    await setSessionContext(defaultTenantId);
    try {
      // Check if default config already exists
      const existing = await pool.query(
        `SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'llama3'`,
        [defaultTenantId]
      );
      
      if (existing.rows.length === 0) {
        const defaultConfig: Llama3Config = {
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
        
        await pool.query(
          `INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
          [defaultTenantId, 'llama3', record.config_data, now, now]
        );
      }
    } finally {
      await clearSessionContext();
    }
  }
  
  defaultConfigInitialized = true;
}

/**
 * Get Llama3 configuration for a specific tenant (tenant-isolated RLS query)
 */
export async function getLlama3ConfigForTenant(tenantId: string): Promise<Llama3Config | null> {
  await initializeDefaultTenantConfig();
  
  await setSessionContext(tenantId);
  try {
    const result = await pool.query(
      `SELECT config_data FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'llama3'`,
      [tenantId]
    );
    
    if (result.rows.length === 0) {
      // Jika tidak ada config khusus tenant, coba ambil default tenant config
      if (tenantId !== process.env.EOS_DEFAULT_TENANT_ID) {
        return getLlama3ConfigForTenant(process.env.EOS_DEFAULT_TENANT_ID || "default-tenant");
      }
      return null;
    }
    
    return toLlama3Config(result.rows[0]);
  } finally {
    await clearSessionContext();
  }
}

/**
 * Set Llama3 configuration for a specific tenant (tenant-isolated RLS query)
 */
export async function setLlama3ConfigForTenant(tenantId: string, config: Llama3Config): Promise<void> {
  await setSessionContext(tenantId);
  try {
    // Cek apakah config sudah ada
    const existing = await pool.query(
      `SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'llama3'`,
      [tenantId]
    );
    
    const record = toRecord(tenantId, config);
    const now = new Date().toISOString();
    
    if (existing.rows.length === 0) {
      // Insert config baru
      await pool.query(
        `INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, 'llama3', record.config_data, now, now]
      );
    } else {
      // Update config yang sudah ada
      await pool.query(
        `UPDATE tenant_channel_configs SET config_data = $1, updated_at = $2 WHERE tenant_id = $3 AND channel_type = 'llama3'`,
        [record.config_data, now, tenantId, 'llama3']
      );
    }
  } finally {
    await clearSessionContext();
  }
}

/**
 * Delete Llama3 configuration for a specific tenant (tenant-isolated RLS query)
 */
export async function deleteLlama3ConfigForTenant(tenantId: string): Promise<void> {
  await setSessionContext(tenantId);
  try {
    await pool.query(
      `DELETE FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'llama3'`,
      [tenantId]
    );
  } finally {
    await clearSessionContext();
  }
}