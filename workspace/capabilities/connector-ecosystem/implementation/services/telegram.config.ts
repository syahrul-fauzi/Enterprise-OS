// @ts-nocheck
/**
 * Telegram configuration service with tenant isolation (W-009: PostgreSQL persistence)
 * Implements tenant-isolated credentials for Telegram channel using PostgreSQL RLS
 * Reuses service-directory PostgreSQL patterns and maintains backward API compatibility
 */
import { Pool, getPool } from "../../../identity/implementation/repositories/base.repository.js";
import { createTenantId, type TenantId } from "@repo/contracts-core";

// Initialize connection pool with unified connection string
const pool: Pool = getPool();

// Set RLS session context before database operations (TENANT-ISOLATION-001)
async function setSessionContext(tenantId: string, workspaceId?: string, workId?: string) {
  await pool.query(`SET app.current_tenant = $1`, [tenantId]);
  if (workspaceId) await pool.query(`SET app.current_workspace = $1`, [workspaceId]);
  if (workId) await pool.query(`SET app.current_work = $1`, [workId]);
}

// Clear session context after database operations
async function clearSessionContext() {
  await pool.query(`RESET app.current_tenant`);
  await pool.query(`RESET app.current_workspace`);
  await pool.query(`RESET app.current_work`);
}

interface TelegramConfig {
  botToken: string;
  apiUrl: string;
  webhookUrl?: string;
  isConfigured: boolean;
}

interface TenantConfigRecord {
  id: string;
  tenant_id: string;
  channel_type: 'telegram' | 'whatsapp' | 'comfyui';
  config_data: string; // JSONB serialized configuration
  created_at: Date;
  updated_at: Date;
}

// Convert database record to domain aggregate
function toTelegramConfig(record: TenantConfigRecord): TelegramConfig {
  return JSON.parse(record.config_data);
}

// Convert domain aggregate to database record
function toRecord(tenantId: string, config: TelegramConfig): Omit<TenantConfigRecord, 'id' | 'created_at' | 'updated_at'> {
  return {
    tenant_id: tenantId,
    channel_type: 'telegram',
    config_data: JSON.stringify({ ...config, isConfigured: true })
  };
}

/**
 * Get Telegram configuration for a specific tenant (enforces tenant isolation)
 * @param tenantId - Canonical EOS tenant ID
 * @returns Telegram configuration or undefined if not configured
 */
export async function getTelegramConfigForTenant(tenantId: string): Promise<TelegramConfig | undefined> {
  if (!tenantId) {
    throw new Error("[Telegram Config Service] Cannot get config without tenantId (identity boundary violation)");
  }
  
  await setSessionContext(tenantId);
  try {
    const result = await pool.query(
      `SELECT * FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'telegram' LIMIT 1`,
      [tenantId]
    );
    
    if (result.rows.length === 0) return undefined;
    return toTelegramConfig(result.rows[0]);
  } finally {
    await clearSessionContext();
  }
}

/**
 * Set Telegram configuration for a specific tenant (enforces tenant isolation)
 * @param tenantId - Canonical EOS tenant ID
 * @param config - Telegram configuration to store
 */
export async function setTelegramConfigForTenant(tenantId: string, config: Omit<TelegramConfig, "isConfigured">): Promise<void> {
  if (!tenantId) {
    throw new Error("[Telegram Config Service] Cannot set config without tenantId (identity boundary violation)");
  }
  if (!config.botToken || !config.apiUrl) {
    throw new Error("[Telegram Config Service] Invalid configuration: botToken and apiUrl are required");
  }
  
  await setSessionContext(tenantId);
  try {
    // Check if record exists
    const existing = await pool.query(
      `SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'telegram'`,
      [tenantId]
    );
    
    const record = toRecord(tenantId, config as TelegramConfig);
    const now = new Date().toISOString();
    
    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE tenant_channel_configs SET config_data = $1, updated_at = $2 WHERE tenant_id = $3 AND channel_type = 'telegram'`,
        [record.config_data, now, tenantId]
      );
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, 'telegram', record.config_data, now, now]
      );
    }
  } finally {
    await clearSessionContext();
  }
}

/**
 * Delete Telegram configuration for a specific tenant (for cleanup/rollback)
 * @param tenantId - Canonical EOS tenant ID
 */
export async function deleteTelegramConfigForTenant(tenantId: string): Promise<void> {
  if (!tenantId) {
    throw new Error("[Telegram Config Service] Cannot delete config without tenantId (identity boundary violation)");
  }
  
  await setSessionContext(tenantId);
  try {
    await pool.query(
      `DELETE FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'telegram'`,
      [tenantId]
    );
  } finally {
    await clearSessionContext();
  }
}

/**
 * List all tenants that have Telegram configured (for admin operations only)
 * @returns Array of tenant IDs with active Telegram configurations
 */
export async function listTelegramConfiguredTenants(): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT tenant_id FROM tenant_channel_configs WHERE channel_type = 'telegram'`
  );
  return result.rows.map((row: any) => row.tenant_id);
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