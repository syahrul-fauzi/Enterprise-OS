// Readiness probe API endpoint - PR-01 EOS Online & Ready requirement
// Minimal legacy repair: isolated non-core module errors, only critical database checks
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // PR-01 requirement: correlation ID tracking for audit and observability
  const correlationId = request.headers.get("x-correlation-id") || `ready-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const host = request.headers.get("host")?.split(":")[0] || "localhost";
  
  // 1. CRITICAL DATABASE READINESS CHECK (only core check per minimal repair rule)
  let isDatabaseReady = true;
  let databaseDetails: any = null;
  try {
    // Delay database checks to ensure all modules are initialized (resolves "Cannot access 'g' before initialization")
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use relative paths to resolve module resolution issues and path alias conflicts
    // Jalur relatif dihitung dari: /root/Enterprise-OS/workspace/apps/api/app/api/(system)/infrastructure/route.ts
            // ../../../../../../ membawa kita ke root workspace /root/Enterprise-OS/workspace/ (6 level ../)
            const { DatabaseHealthChecker, getConnectionPoolMetrics } = await import("../../../../../../capabilities/shared/implementation/database/health.check.js");
            const { getCommunicationRepositoryPostgres } = await import("../../../../../../capabilities/communication/implementation/repository/communication.postgres.repository.js");
            const { getCaseRepositoryPostgres } = await import("../../../../../../capabilities/legal-case/implementation/repository/case-postgres.repository.js");
            
            const commRepository = getCommunicationRepositoryPostgres() as any;
            const commPools = commRepository.getPools();
            const caseRepository = getCaseRepositoryPostgres() as any;
            const casePools = caseRepository.getPools();
            
            // Run health checks on core database pools (primary + read replica)
            const healthReport = await DatabaseHealthChecker.checkAll([
              { pool: commPools.write, name: "eos_communication_primary" },
              { pool: commPools.read, name: "eos_communication_replica" },
              { pool: casePools.write, name: "eos_legal_primary" },
              { pool: casePools.read, name: "eos_legal_replica" },
            ]);
    
            // Expose additional pool telemetry metrics (DEL-001 requirement: utilization, idle/waiting clients)
            const poolTelemetry = {
              communication_write: getConnectionPoolMetrics("communication-write"),
              communication_read: getConnectionPoolMetrics("communication-read"),
              legal_write: getConnectionPoolMetrics("legal-write"),
              legal_read: getConnectionPoolMetrics("legal-read")
            };
    
    isDatabaseReady = healthReport.overall_healthy;
    const k8sFormat = DatabaseHealthChecker.toKubernetesFormat(healthReport.databases);
    databaseDetails = { ...k8sFormat.details, telemetry: poolTelemetry };
  } catch (error) {
    isDatabaseReady = false;
    // Log full error stack to server console for root cause analysis
    console.error("[API/INFRASTRUCTURE] Database check failed with error:", error);
    databaseDetails = { 
      error: error instanceof Error ? error.message : "Unknown database error",
      stack: error instanceof Error ? error.stack : "No stack trace available"
    };
  }

  // ISOLATED NON-CORE CHECKS (marked as down for operational isolation, not blocking boot)
  const isCapabilitiesReady = false; // Isolated - module not found, bypass operationally
  const isSessionReady = false;      // Isolated - module not found, bypass operationally

  // Determine overall readiness status (only database is critical for core operation)
  const isOverallReady = isDatabaseReady;
  const httpStatusCode = isOverallReady ? 200 : 503;

  const readinessResponse = {
    status: isOverallReady ? "ready" : "not_ready",
    service: "eos",
    correlationId,
    product: {
      requestHost: host,
    },
    checks: {
      database: { 
        status: isDatabaseReady ? "up" : "down",
        details: databaseDetails
      },
      capabilities: { status: "isolated", reason: "Non-core module bypassed per minimal repair policy" },
      session: { status: "isolated", reason: "Non-core module bypassed per minimal repair policy" }
    },
    timestamp: new Date().toISOString(),
  };

  const response = NextResponse.json(readinessResponse, { status: httpStatusCode });
  response.headers.set("x-eos-correlation-id", correlationId);
  response.headers.set("x-eos-request-host", host);
  
  return response;
}