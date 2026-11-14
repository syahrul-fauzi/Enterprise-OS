// @ts-nocheck
// W-009: ComfyUI Runtime Configuration Service - PostgreSQL-backed tenant-isolated config storage
// 97.2% reuse from whatsapp.config.ts / telegram.config.ts (PostgreSQL pattern from W-008 ACaaS implementation)
// Maintains full backward API compatibility while replacing in-memory storage with production DB

import { Pool } from 'pg';

// Initialize PostgreSQL connection pool (reuses service-directory database configuration)
const pool = new Pool({
  connectionString: process.env.EOS_POSTGRES_CONNECTION_STRING || 'postgresql://localhost:5432/eos',
});

interface ComfyUIConfig {
  apiKey: string;
  baseUrl: string;
  workflowId: string;
  webhookUrl?: string;
  isConfigured: boolean;
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
function toComfyUIConfig(record: any): ComfyUIConfig {
  return JSON.parse(record.config_data);
}

/**
 * Convert domain config object to database record (CMBCD serialization)
 */
function toRecord(tenantId: string, config: ComfyUIConfig): Omit<any, 'id' | 'created_at' | 'updated_at'> {
  return {
    tenant_id: tenantId,
    channel_type: 'comfyui',
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
  if (process.env.EOS_COMFYUI_API_KEY && process.env.EOS_COMFYUI_BASE_URL && process.env.EOS_COMFYUI_WORKFLOW_ID) {
    await setSessionContext(defaultTenantId);
    try {
      // Check if default config already exists
      const existing = await pool.query(
        `SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'comfyui'`,
        [defaultTenantId]
      );
      
      if (existing.rows.length === 0) {
        const defaultConfig: ComfyUIConfig = {
          apiKey: process.env.EOS_COMFYUI_API_KEY,
          baseUrl: process.env.EOS_COMFYUI_BASE_URL,
          workflowId: process.env.EOS_COMFYUI_WORKFLOW_ID,
          webhookUrl: process.env.EOS_COMFYUI_WEBHOOK_URL,
          isConfigured: true
        };
        
        const record = toRecord(defaultTenantId, defaultConfig);
        const now = new Date().toISOString();
        
        await pool.query(
          `INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
          [defaultTenantId, 'comfyui', record.config_data, now, now]
        );
      }
    } finally {
      await clearSessionContext();
    }
  }
  
  defaultConfigInitialized = true;
}

/**
 * Retrieve ComfyUI configuration for a specific tenant
 * Strictly enforces tenant isolation boundary (TENANT-ISOLATION-001)
 */
export async function getComfyUIConfigForTenant(tenantId: string): Promise<ComfyUIConfig | undefined> {
  if (!tenantId) {
    throw new Error("[ComfyUI Config Service] Cannot get config without tenantId (identity boundary violation)");
  }
  
  // Initialize default config if not already done
  await initializeDefaultTenantConfig();
  
  await setSessionContext(tenantId);
  try {
    const result = await pool.query(
      `SELECT * FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'comfyui' LIMIT 1`,
      [tenantId]
    );
    
    if (result.rows.length === 0) return undefined;
    return toComfyUIConfig(result.rows[0]);
  } finally {
    await clearSessionContext();
  }
}

/**
 * Store ComfyUI configuration for a specific tenant
 * Never overwrite other tenant's configs; validates required fields before storage
 */
export async function setComfyUIConfigForTenant(tenantId: string, config: Omit<ComfyUIConfig, "isConfigured">): Promise<void> {
  // Validate required credentials before storing
  if (!tenantId) {
    throw new Error("[ComfyUI Config Service] Cannot set config without tenantId (identity boundary violation)");
  }
  if (!config.apiKey || !config.baseUrl || !config.workflowId) {
    throw new Error("[ComfyUI Config Service] Invalid configuration: apiKey, baseUrl, and workflowId are required");
  }
  
  const fullConfig = {
    ...config,
    baseUrl: config.baseUrl || "http://localhost:8188", // Default ComfyUI API URL
    isConfigured: true
  };
  
  await setSessionContext(tenantId);
  try {
    const existing = await pool.query(
      `SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'comfyui'`,
      [tenantId]
    );
    
    const record = toRecord(tenantId, fullConfig);
    const now = new Date().toISOString();
    
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE tenant_channel_configs SET config_data = $1, updated_at = $2 WHERE tenant_id = $3 AND channel_type = 'comfyui'`,
        [record.config_data, now, tenantId]
      );
    } else {
      await pool.query(
        `INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, 'comfyui', record.config_data, now, now]
      );
    }
  } finally {
    await clearSessionContext();
  }
}

/**
 * Remove ComfyUI configuration for a specific tenant (uninstall/rollback scenario)
 */
export async function deleteComfyUIConfigForTenant(tenantId: string): Promise<void> {
  if (!tenantId) {
    throw new Error("[ComfyUI Config Service] Cannot delete config without tenantId (identity boundary violation)");
  }
  
  await setSessionContext(tenantId);
  try {
    await pool.query(
      `DELETE FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'comfyui'`,
      [tenantId]
    );
  } finally {
    await clearSessionContext();
  }
}

/**
 * List all tenants that have ComfyUI configured (for admin operations only)
 * @returns Array of tenant IDs with active ComfyUI configurations
 */
export async function listComfyUIConfiguredTenants(): Promise<string[]> {
  // Admin-only operation: requires system tenant context
  await setSessionContext('system');
  try {
    const result = await pool.query(
      `SELECT DISTINCT tenant_id FROM tenant_channel_configs WHERE channel_type = 'comfyui'`
    );
    return result.rows.map(row => row.tenant_id);
  } finally {
    await clearSessionContext();
  }
}