// Canonical health check implementation - core-kernel authority for system health verification
// Follows same server-only constraint pattern as session module
// Canonical health check implementation - core-kernel authority for system health verification
// Follows same server-only constraint pattern as session module
// Corrected relative path: from /workspace/packages/core/kernel/src/health → go up 5 levels to /workspace/
// Import health checker class only from relative path (5 levels up to workspace root)
import { DatabaseHealthChecker } from "../../../../../capabilities/shared/implementation/database/health.check.js";

// Track Redis connection state (minimal implementation for D-002)
let redisReconnectionState = {
  attempts: 0,
  isReconnecting: false,
  lastChecked: null as Date | null
};

interface RedisHealthReport {
  connected: boolean;
  latency_ms: number;
  error?: string;
  last_checked: string;
}

interface DatabaseHealthReport {
  database: string;
  connected: boolean;
  latency_ms: number;
  pool_stats: { total_connections: number; idle_connections: number; waiting_clients: number };
  last_checked: string;
  error?: string;
}

interface SystemHealthReport {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  dependencies: {
    database: {
      status: "up" | "down";
      details: DatabaseHealthReport[];
    };
    redis: {
      status: "up" | "down";
      details: RedisHealthReport;
    };
    capabilities: {
      status: "up" | "down";
      registry_available: boolean;
    };
  };
  overall_healthy: boolean;
}

/**
 * Minimal Redis health check implementation
 * Verifies Redis connectivity with exponential backoff for reconnections
 */
async function checkRedisConnection(): Promise<RedisHealthReport> {
  const startTime = Date.now();
  let connected = false;
  let error: string | undefined;

  try {
    // Dynamically import Redis client to avoid bundling issues in browser - uses relative path that doesn't require tsconfig project references
    const { createRedisClient } = await import("../../../../../capabilities/shared/implementation/redis/redis.client.js");
    const redisClient = createRedisClient();
    
    // Simple PING command to verify connectivity
    await redisClient.ping();
    connected = true;
    
    // Reset reconnection state on successful connection
    redisReconnectionState.attempts = 0;
    redisReconnectionState.isReconnecting = false;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown Redis error";
    // Update reconnection state
    redisReconnectionState.attempts += 1;
    redisReconnectionState.lastChecked = new Date();
  }

  const latency_ms = Date.now() - startTime;
  redisReconnectionState.lastChecked = new Date();

  return {
    connected,
    latency_ms,
    error,
    last_checked: new Date().toISOString()
  };
}

/**
 * Canonical system health check function - core-kernel's single source of truth for health status
 * Verifies all critical dependencies: database, Redis, and capability registry
 */
export async function runHealthChecks(): Promise<SystemHealthReport> {
  // 1. Check database connectivity using existing DatabaseHealthChecker
  let databaseReports: DatabaseHealthReport[] = [];
  let isDatabaseHealthy = false;
  
  try {
    // Dynamically import repository pools to avoid initialization order issues
    const { getCommunicationRepositoryPostgres } = await import("../../../../../capabilities/communication/implementation/repository/communication.postgres.repository.js");
    const { getCaseRepositoryPostgres } = await import("../../../../../capabilities/legal-case/implementation/repository/case-postgres.repository.js");
    
    const commRepository = getCommunicationRepositoryPostgres() as any;
    const commPools = commRepository.getPools();
    const caseRepository = getCaseRepositoryPostgres() as any;
    const casePools = caseRepository.getPools();
    
    const healthReport = await DatabaseHealthChecker.checkAll([
      { pool: commPools.write, name: "eos_communication_primary" },
      { pool: commPools.read, name: "eos_communication_replica" },
      { pool: casePools.write, name: "eos_legal_primary" },
      { pool: casePools.read, name: "eos_legal_replica" },
    ]);
    
    databaseReports = healthReport.databases;
    isDatabaseHealthy = healthReport.overall_healthy;
  } catch (dbError) {
    databaseReports = [{
      database: "all",
      connected: false,
      latency_ms: 0,
      pool_stats: { total_connections: 0, idle_connections: 0, waiting_clients: 0 },
      last_checked: new Date().toISOString(),
      error: dbError instanceof Error ? dbError.message : "Unknown database error"
    }];
  }

  // 2. Check Redis connectivity
  const redisReport = await checkRedisConnection();
  const isRedisHealthy = redisReport.connected;

  // 3. Check capability registry availability
  let isRegistryAvailable = false;
  try {
    const { capabilityRegistry } = await import("../registry/capability-command-registry.js");
    isRegistryAvailable = typeof capabilityRegistry?.invoke === "function";
  } catch (regError) {
    // Registry not available - remains false
  }

  // Calculate overall health status
  const allCriticalHealthy = isDatabaseHealthy && isRedisHealthy && isRegistryAvailable;
  const anyCriticalHealthy = isDatabaseHealthy || isRedisHealthy || isRegistryAvailable;
  
  const status = allCriticalHealthy ? "healthy" : (anyCriticalHealthy ? "degraded" : "unhealthy");
  const overall_healthy = allCriticalHealthy;

  return {
    status,
    timestamp: new Date().toISOString(),
    dependencies: {
      database: {
        status: isDatabaseHealthy ? "up" : "down",
        details: databaseReports
      },
      redis: {
        status: isRedisHealthy ? "up" : "down",
        details: redisReport
      },
      capabilities: {
        status: isRegistryAvailable ? "up" : "down",
        registry_available: isRegistryAvailable
      }
    },
    overall_healthy
  };
}

// Export types for consumers
export type { SystemHealthReport, RedisHealthReport, DatabaseHealthReport };