import { NextResponse } from "next/server";
import { DatabaseHealthChecker } from "@capabilities/shared/implementation/database/health.check";
import { getCommunicationRepositoryPostgres } from "@capabilities/communication/implementation/repository/communication.postgres.repository";
import { getCaseRepositoryPostgres } from "@capabilities/legal-case/implementation/repository/case-postgres.repository";

export async function GET(request: Request) {
  const correlationId = request.headers.get("x-correlation-id") || `health-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    // Get all database pools from core repositories (full dependency check per Tahap A audit)
    const commRepository = getCommunicationRepositoryPostgres() as any;
    const commPools = commRepository.getPools();
    const caseRepository = getCaseRepositoryPostgres() as any;
    const casePools = caseRepository.getPools();
    
    // Run comprehensive health check on ALL critical database services
    const healthReport = await DatabaseHealthChecker.checkAll([
      { pool: commPools.write, name: "eos_communication_primary" },
      { pool: commPools.read, name: "eos_communication_replica" },
      { pool: casePools.write, name: "eos_legal_primary" },
      { pool: casePools.read, name: "eos_legal_replica" },
    ]);
    
    const k8sFormat = DatabaseHealthChecker.toKubernetesFormat(healthReport.databases);
    const statusCode = healthReport.overall_healthy ? 200 : 503;
    
    return NextResponse.json({
      ...k8sFormat,
      status: healthReport.overall_healthy ? "ready" : "degraded",
      service: "eos-core-web",
      timestamp: new Date().toISOString(),
      correlationId,
    }, {
      status: statusCode,
      headers: {
        "X-Correlation-ID": correlationId,
      },
    });
  } catch (error) {
    console.error("[Health Check] Failed to execute comprehensive health check:", error);
    return NextResponse.json({
      status: "DOWN",
      service: "eos-core-web",
      error: error instanceof Error ? error.message : "Unknown health check failure",
      timestamp: new Date().toISOString(),
      correlationId,
    }, {
      status: 503,
      headers: {
        "X-Correlation-ID": correlationId,
      },
    });
  }
}