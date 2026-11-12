/**
 * MCP configuration service with tenant isolation (TENANT-ISOLATION-001: PostgreSQL RLS)
 * Implements tenant-isolated credentials for MCP channel using PostgreSQL Row Level Security
 * Reuses identical pattern from telegram.config.ts and whatsapp.config.ts to maintain consistency
 */
import { Pool, getPool } from "../../../identity/implementation/repositories/base.repository.js";
import { createTenantId, type TenantId } from "../../../work-core/contracts/work.contracts.js";

// Initialize connection pool with unified connection string (reuse from base repository)
const pool: Pool = getPool();

// Set RLS session context before database operations (EOS-360-004: Enforce tenant isolation)
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

// MCP specific configuration interface (aligned with MCP 2026-07-28 specs)
interface MCPConfig {
  serverUrl: string;
  apiKey: string;
  allowedClientIds: string[];
  allowedIssuers: string[];
  protocolVersion: string;
  isConfigured: boolean;
}

interface TenantConfigRecord {
  id: string;
  tenant_id: string;
  channel_type: 'telegram' | 'whatsapp' | 'comfyui' | 'mcp';
  config_data: string; // JSONB serialized configuration
  created_at: Date;
  updated_at: Date;
}

// Convert database record to domain aggregate
function toMCPConfig(record: TenantConfigRecord): MCPConfig {
  return JSON.parse(record.config_data);
}

// Convert domain aggregate to database record
function toRecord(tenantId: string, config: MCPConfig): Omit<TenantConfigRecord, 'id' | 'created_at' | 'updated_at'> {
  return {
    tenant_id: tenantId,
    channel_type: 'mcp',
    config_data: JSON.stringify(config)
  };
}

// Public API: Set MCP configuration for a specific tenant (EOS-360-004: Tenant isolation enforced)
export async function setMCPConfigForTenant(
  tenantId: string,
  config: MCPConfig,
  workspaceId?: string,
  workId?: string
): Promise<boolean> {
  try {
    await setSessionContext(tenantId, workspaceId, workId);
    const record = toRecord(tenantId, config);
    
    // Upsert logic: if config exists, update it; otherwise create new
    const existing = await pool.query(
      `SELECT id FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'mcp'`,
      [tenantId]
    );
    
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE tenant_channel_configs SET config_data = $1, updated_at = NOW() WHERE tenant_id = $2 AND channel_type = 'mcp'`,
        [record.config_data, tenantId]
      );
    } else {
      await pool.query(
        `INSERT INTO tenant_channel_configs (tenant_id, channel_type, config_data, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`,
        [record.tenant_id, record.channel_type, record.config_data]
      );
    }
    
    await clearSessionContext();
    return true;
  } catch (error) {
    await clearSessionContext();
    throw new Error(`[mcp.config.setMCPConfigForTenant] Failed to save MCP config: ${(error as Error).message}`);
  }
}

// Public API: Get MCP configuration for a specific tenant (EOS-360-004: Tenant isolation enforced)
export async function getMCPConfigForTenant(tenantId: string): Promise<MCPConfig | null> {
  try {
    await setSessionContext(tenantId);
    const result = await pool.query(
      `SELECT config_data FROM tenant_channel_configs WHERE tenant_id = $1 AND channel_type = 'mcp'`,
      [tenantId]
    );
    
    await clearSessionContext();
    if (result.rows.length === 0) return null;
    return toMCPConfig(result.rows[0]);
  } catch (error) {
    await clearSessionContext();
    throw new Error(`[mcp.config.getMCPConfigForTenant] Failed to retrieve MCP config: ${(error as Error).message}`);
  }
}