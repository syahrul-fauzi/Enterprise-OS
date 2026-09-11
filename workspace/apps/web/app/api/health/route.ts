import { NextResponse } from "next/server";
import { DatabaseHealthChecker } from "@capabilities/shared/implementation/database/health.check";
import { getCommunicationRepositoryPostgres } from "@capabilities/communication/implementation/repository/communication.postgres.repository";
import { getCaseRepositoryPostgres } from "@capabilities/legal-case/implementation/repository/case-postgres.repository";

export async function GET(request: Request) {
  // PR-01 COMPLIANT: correlation ID tracking for audit and observability
  const correlationId = request.headers.get("x-correlation-id") || `health-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const host = request.headers.get("host")?.split(":")[0] || "localhost";
  let productId: string | null = null;
  
  if (host?.includes("lawyershub")) productId = "lawyershub";
  else if (host?.includes("services-id")) productId = "services-id";
  else if (host?.includes("indonesialawyersclub")) productId = "ilc";

  // 1. RUN ONLY CRITICAL DATABASE HEALTH CHECK (isolate non-core module errors per user rule)
  let databaseStatus: "up" | "down" = "up";
  let databaseDetails: any = null;
  let isDatabaseHealthy = true;

  try {
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
    
    const k8sFormat = DatabaseHealthChecker.toKubernetesFormat(healthReport.databases);
    databaseDetails = k8sFormat.details;
    isDatabaseHealthy = healthReport.overall_healthy;
    databaseStatus = isDatabaseHealthy ? "up" : "down";
  } catch (error) {
    databaseStatus = "down";
    isDatabaseHealthy = false;
    databaseDetails = { error: error instanceof Error ? error.message : "Unknown database error" };
  }

  // AGGREGATE ONLY CRITICAL CORE HEALTH CHECKS
  const overallStatus: "ready" | "not_ready" = isDatabaseHealthy ? "ready" : "not_ready";
  
  const healthResponse = {
    status: overallStatus,
    service: "eos-core-api",
    product: {
      productId,
      productDomain: null,
      requestHost: host,
    },
    checks: {
      database: {
        status: databaseStatus,
        details: databaseDetails,
      },
    },
    timestamp: new Date().toISOString(),
    correlationId,
  };

  // PR-01 COMPLIANT: Return correlation ID in response headers for audit trail
  return NextResponse.json(healthResponse, { 
    status: overallStatus === "ready" ? 200 : 503,
    headers: {
      "X-Correlation-ID": correlationId,
    },
  });
}