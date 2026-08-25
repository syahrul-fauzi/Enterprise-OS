// Database connection health check - implements Kubernetes liveness/readiness probe support
// Can be exposed via API endpoint for orchestration systems to verify database connectivity
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
}

export class DatabaseHealthChecker {
  /**
   * Run health check on a Postgres connection pool
   * Returns detailed health report for monitoring and orchestration
   */
  static async checkPool(pool: Pool, databaseName: string): Promise<DatabaseHealthReport> {
    const startTime = Date.now();
    let connected = false;
    let error: string | undefined;
    
    try {
      // Test connectivity with a simple query
      await pool.query("SELECT NOW()");
      connected = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown database error";
      connected = false;
    }
    
    const latency = Date.now() - startTime;
    
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
      last_checked: new Date().toISOString(),
      error,
    };
  }

  /**
   * Run health checks on all database pools in the system
   * Aggregates results for a full platform health report
   */
  static async checkAll(databases: Array<{pool: Pool; name: string}>): Promise<{
    overall_healthy: boolean;
    databases: DatabaseHealthReport[];
  }> {
    const reports = await Promise.all(
      databases.map(db => this.checkPool(db.pool, db.name))
    );
    
    const allConnected = reports.every(r => r.connected);
    const allLatencyAcceptable = reports.every(r => r.latency_ms < 500); // 500ms SLA
    
    return {
      overall_healthy: allConnected && allLatencyAcceptable,
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