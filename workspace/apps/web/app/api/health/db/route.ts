// Database health check API endpoint - Kubernetes liveness/readiness probe
// Exposes POSTGRES connection status for orchestration systems
import { NextResponse } from "next/server";
import { DatabaseHealthChecker } from "@capabilities/shared/implementation/database/health.check";
import { CommunicationRepositoryPostgres } from "@capabilities/communication/implementation/repository/communication.postgres.repository";
import { CaseRepositoryPostgres } from "@capabilities/legal-case/implementation/repository/case.postgres.repository";

export async function GET() {
  try {
    // Get pools from both Postgres repositories (read + write for communication
    const commPools = CommunicationRepositoryPostgres.getPools();
    const casePool = CaseRepositoryPostgres.getPool();
    
    // Run health checks on ALL database pools (primary + read replica)
    const healthReport = await DatabaseHealthChecker.checkAll([
      { pool: commPools.write, name: "eos_communication_primary" },
      { pool: commPools.read, name: "eos_communication_replica" },
      { pool: casePool, name: "eos_legal_primary" },
    ]);
    
    // Return Kubernetes-compatible format
    const k8sFormat = DatabaseHealthChecker.toKubernetesFormat(healthReport.databases);
    
    // Return 200 if all healthy, 503 if any database is down
    const statusCode = healthReport.overall_healthy ? 200 : 503;
    
    return NextResponse.json({
      ...k8sFormat,
      timestamp: new Date().toISOString(),
    }, { status: statusCode });
    
  } catch (error) {
    console.error("[DB Health Check] Failed to execute health check:", error);
    return NextResponse.json({
      status: "DOWN",
      error: error instanceof Error ? error.message : "Unknown health check failure",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}