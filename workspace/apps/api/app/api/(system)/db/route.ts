// Database health check API endpoint - Kubernetes liveness/readiness probe
// Exposes POSTGRES connection status for orchestration systems
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Delay database checks to ensure all modules are initialized (resolves "Cannot access 'g' before initialization")
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Use relative paths to resolve module resolution issues and path alias conflicts
    // Jalur relatif dihitung dari: /root/Enterprise-OS/workspace/apps/api/app/api/(system)/db/route.ts
            // ../../../../../../ membawa kita ke root workspace /root/Enterprise-OS/workspace/ (6 level ../)
            const { DatabaseHealthChecker } = await import("../../../../../../capabilities/shared/implementation/database/health.check.js");
            const { getCommunicationRepositoryPostgres } = await import("../../../../../../capabilities/communication/implementation/repository/communication.postgres.repository.js");
            const { getCaseRepositoryPostgres } = await import("../../../../../../capabilities/legal-case/implementation/repository/case-postgres.repository.js");
    
    // Get pools from both Postgres repositories (read + write for communication and legal cases)
    // CommunicationRepositoryPostgres already implements getPools() interface
    const commRepository = getCommunicationRepositoryPostgres() as any;
    const commPools = commRepository.getPools();
    // CaseRepositoryPostgres now implements getPools() interface after fix
    const caseRepository = getCaseRepositoryPostgres() as any;
    const casePools = caseRepository.getPools();
    
    // Run health checks on core database pools (primary + read replica)
    const healthReport = await DatabaseHealthChecker.checkAll([
      { pool: commPools.write, name: "eos_communication_primary" },
      { pool: commPools.read, name: "eos_communication_replica" },
      { pool: casePools.write, name: "eos_legal_primary" },
      { pool: casePools.read, name: "eos_legal_replica" },
    ]);
    
    // Return Kubernetes-compatible format
    const k8sFormat = DatabaseHealthChecker.toKubernetesFormat(healthReport.databases);
    
    // Return 200 if all healthy, 503 if any database is down
    const statusCode = healthReport.overall_healthy ? 200 : 503;
    
    return NextResponse.json({
      ...k8sFormat,
      timestamp: new Date().toISOString(),
    }, { statusCode });
    
  } catch (error) {
    console.error("[DB Health Check] Failed to execute health check:", error);
    return NextResponse.json({
      status: "DOWN",
      error: error instanceof Error ? error.message : "Unknown health check failure",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}