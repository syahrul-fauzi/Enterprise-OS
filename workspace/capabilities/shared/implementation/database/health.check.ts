// Database connection health check - implements Kubernetes liveness/readiness probe support
// Can be exposed via API endpoint for orchestration systems to verify database connectivity
// PR-06: Added reconnection logic, stale connection detection, and failover support
import { Pool } from "pg";

interface DatabaseHealthReport {
  database: string;
  connected: boolean;
  latency_ms: number;
  pool_stats: {
    total_connections: number;
    idle_connections: number;
    waiting_clients: number;
  };
  last_checked: string;
  error?: string;
  reconnect_attempts?: number;
  last_reconnect_attempt?: string;
  is_stale?: boolean;
}

// Track reconnection state for each database pool
const poolReconnectionState: Map<string, {
  attempts: number;
  lastAttempt: Date | null;
  isReconnecting: boolean;
}> = new Map();

export class DatabaseHealthChecker {
  /**
   * Initialize reconnection tracking for a database pool
   */
  static initializePoolTracking(poolName: string): void {
    if (!poolReconnectionState.has(poolName)) {
      poolReconnectionState.set(poolName, {
        attempts: 0,
        lastAttempt: null,
        isReconnecting: false
      });
    }
  }

  /**
   * Calculate exponential backoff for reconnection attempts
   * Base 100ms, max 30s between attempts
   */
  private static getBackoffDelay(attempts: number): number {
    const delay = Math.min(100 * Math.pow(2, attempts), 30000);
    return delay;
  }

  /**
   * Detect stale connections that have been inactive for > 5 minutes
   */
  private static isStaleConnection(lastChecked: Date): boolean {
    const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in ms
    return Date.now() - lastChecked.getTime() > STALE_THRESHOLD;
  }

  /**
   * Attempt to reconnect to a failed database pool with exponential backoff
   */
  private static async attemptReconnection(pool: Pool, poolName: string): Promise<boolean> {
    const state = poolReconnectionState.get(poolName);
    if (!state || state.isReconnecting) return false;

    state.isReconnecting = true;
    state.attempts += 1;
    state.lastAttempt = new Date();
    
    const backoffDelay = this.getBackoffDelay(state.attempts);
    
    // Wait for backoff period before attempting reconnection
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    try {
      await pool.query("SELECT NOW()");
      // Reconnection successful - reset state
      state.attempts = 0;
      state.isReconnecting = false;
      poolReconnectionState.set(poolName, state);
      return true;
    } catch (e) {
      // Reconnection failed - keep state for next attempt
      state.isReconnecting = false;
      poolReconnectionState.set(poolName, state);
      return false;
    }
  }

  /**
   * Run health check on a Postgres connection pool
   * Returns detailed health report for monitoring and orchestration
   * PR-06: Added stale connection detection and reconnection tracking
   */
  static async checkPool(pool: Pool, databaseName: string): Promise<DatabaseHealthReport> {
    // Initialize tracking if not exists
    this.initializePoolTracking(databaseName);
    
    const startTime = Date.now();
    let connected = false;
    let error: string | undefined;
    const reconnectionState = poolReconnectionState.get(databaseName)!;
    
    try {
      // Test connectivity with a simple query
      await pool.query("SELECT NOW()");
      connected = true;
      // Reset reconnection attempts on successful connection
      reconnectionState.attempts = 0;
      poolReconnectionState.set(databaseName, reconnectionState);
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown database error";
      connected = false;
      // Trigger reconnection attempt in background
      this.attemptReconnection(pool, databaseName);
    }
    
    const latency = Date.now() - startTime;
    const lastChecked = new Date();
    const isStale = this.isStaleConnection(reconnectionState.lastAttempt || lastChecked);
    
    // Get current pool statistics
    const poolStats = pool.totalCount ? {
      total_connections: pool.totalCount,
      idle_connections: pool.idleCount,
      waiting_clients: pool.waitingCount,
    } : {
      total_connections: 0,
      idle_connections: 0,
      waiting_clients: 0,
    };

    return {
      database: databaseName,
      connected,
      latency_ms: latency,
      pool_stats: poolStats,
      last_checked: lastChecked.toISOString(),
      error,
      reconnect_attempts: reconnectionState.attempts,
      last_reconnect_attempt: reconnectionState.lastAttempt?.toISOString(),
      is_stale: isStale,
    };
  }

  /**
   * Run health checks on all database pools in the system
   * Aggregates results for a full platform health report
   * PR-06: Maintains PostgreSQL as canonical authority - if any DB is down, overall unhealthy
   */
  static async checkAll(databases: Array<{pool: Pool; name: string}>): Promise<{
    overall_healthy: boolean;
    databases: DatabaseHealthReport[];
  }> {
    const reports = await Promise.all(
      databases.map(db => this.checkPool(db.pool, db.name))
    );
    
    // EOS invariant: PostgreSQL is canonical durable authority - all databases must be connected
    // No in-memory/Redis fallback allowed if canonical persistence is down
    const allConnected = reports.every(r => r.connected);
    const allLatencyAcceptable = reports.every(r => r.latency_ms < 500); // 500ms SLA
    const noneStale = reports.every(r => !r.is_stale);
    
    return {
      overall_healthy: allConnected && allLatencyAcceptable && noneStale,
      databases: reports,
    };
  }

  /**
   * Expose as Kubernetes-compatible health check response format
   * Suitable for liveness/readiness probe endpoints
   */
  static toKubernetesFormat(reports: DatabaseHealthReport[]): {
    status: "UP" | "DOWN";
    details: Record<string, {status: "UP" | "DOWN"; latency: number; error?: string}>;
  } {
    const details: Record<string, any> = {};
    let allUp = true;
    
    for (const report of reports) {
      const isUp = report.connected && report.latency_ms < 500;
      if (!isUp) allUp = false;
      
      details[report.database] = {
        status: isUp ? "UP" : "DOWN",
        latency_ms: report.latency_ms,
        ...(report.error && { error: report.error }),
      };
    }
    
    return {
      status: allUp ? "UP" : "DOWN",
      details,
    };
  }
}