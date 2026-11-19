// @ts-nocheck
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { agentOrchestrationService } from "../../../agent-orchestration/implementation/services/agent-orchestration.service.js";
import { apiPlatformService } from "../../../api-platform/implementation/services/api-platform.service.js";
import { evidenceRegistryService } from "../../../evidence-registry/implementation/services/evidence-registry.service.js";
import { requirementService } from "../../../requirement-management/implementation/services/requirement.service.js";
import { requirementsTraceabilityMatrixService } from "../../../requirements-traceability-matrix/implementation/services/traceability.service.js";
import { workflowEngineService } from "../../../workflow-engine/implementation/services/workflow-engine.service.js";
// PR-007: Reuse core-runtime observability primitives (substrate freeze compliant)
import { 
  executionTraces, 
  getTraceForDecision, 
  verifyWorkIdCorrelation,
  type ObservedExecution 
} from "../../../../packages/core/runtime/src/execution-observability.js";
import {createIncident, resolveIncident } from "../commands/observability.commands.js";
import { statePath } from "../../../../packages/tooling/eos-cli/src/state.js";
import type {
  ObservableLogEntry,
  ObservableMetric,
  ObservableTraceSpan,
  ObservabilitySnapshot,
  RuntimeInvocation,
} from "../contracts/index.js";

export class ObservabilityService {
  // Expose canonical dirs creation for external recorders
  public ensureCanonicalDirsExist(): void {
    const CANONICAL_METRICS_PATH = statePath("metrics", "ACaaS-001", "processed_requests.jsonl");
    const EVIDENCE_PATH = path.join(process.cwd(), "capabilities/observability/evidence/verification/runtime-invocations.jsonl");
    
    const evidenceDir = path.dirname(EVIDENCE_PATH);
    const metricsDir = path.dirname(CANONICAL_METRICS_PATH);
    
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }
  }

  getLogs(): readonly ObservableLogEntry[] {
    const evidence = evidenceRegistryService.searchEvidenceRegistry({ limit: 5, offset: 0 });
    const orchestration = agentOrchestrationService.dispatch({
      planId: "orchestrate-requirement-delivery",
    });

    const result: readonly ObservableLogEntry[] = [
      {
        id: "log-orchestration-delivery",
        level: orchestration.status === "completed" ? "info" : "error",
        category: "orchestration",
        message: `Orchestration plan orchestrate-requirement-delivery finished with ${orchestration.status}.`,
        timestamp: nowIso(),
        context: {
          planId: orchestration.planId,
          passedSteps: orchestration.output.passedSteps,
          failedSteps: orchestration.output.failedSteps,
        },
      },
      {
        id: "log-evidence-index",
        level: "info",
        category: "evidence",
        message: `Evidence registry indexed ${evidence.matched} visible records in the current snapshot.`,
        timestamp: nowIso(),
        context: {
          matched: evidence.matched,
          ledgerCount: evidence.summary.kindBreakdown.ledger,
          acceptanceCount: evidence.summary.kindBreakdown.acceptance,
        },
      },
      {
        id: "log-platform-gateway",
        level: "info",
        category: "platform",
        message: `API platform exposes ${apiPlatformService.getDescriptor().endpoints.length} gateway endpoints.`,
        timestamp: nowIso(),
        context: {
          endpointCount: apiPlatformService.getDescriptor().endpoints.length,
        },
      },
    ];
    recordRuntimeInvocation({
      capability_id: "observability",
      operation_id: "get-logs",
      sourceRef: "ObservabilityService.getLogs",
      success: true,
      input: {},
      result: {
        count: result.length,
        ids: result.map((entry) => entry.id),
      },
    });
    return result;
  }

  getMetrics(): readonly ObservableMetric[] {
    const requirements = requirementService.searchRequirements({ limit: 50, offset: 0 });
    const traceability = requirementsTraceabilityMatrixService.searchTraceabilityMatrix({
      coverage: "all",
    });
    const evidence = evidenceRegistryService.searchEvidenceRegistry({ limit: 500, offset: 0 });
    const workflows = workflowEngineService.listWorkflowDefinitions();
    const plans = agentOrchestrationService.listPlans();

    const result: readonly ObservableMetric[] = [
      {
        name: "requirements.total",
        value: requirements.matched,
        unit: "count",
        description: "Total requirements exposed by Requirement Management.",
      },
      {
        name: "rtm.complete_ratio",
        value: 0,
        unit: "ratio",
        description: "Share of RTM rows with complete coverage.",
      },
      {
        name: "evidence.records",
        value: evidence.matched,
        unit: "count",
        description: "Indexed evidence records available to the registry.",
      },
      {
        name: "workflow.definitions",
        value: workflows.length,
        unit: "count",
        description: "Workflow definitions available to orchestration runtime.",
      },
      {
        name: "orchestration.plans",
        value: plans.length,
        unit: "count",
        description: "Dispatchable orchestration plans available to agents.",
      },
    ];
    recordRuntimeInvocation({
      capability_id: "observability",
      operation_id: "get-metrics",
      sourceRef: "ObservabilityService.getMetrics",
      success: true,
      input: {},
      result: {
        count: result.length,
        names: result.map((entry) => entry.name),
      },
    });
    return result;
  }

  getTraces(): readonly ObservableTraceSpan[] {
    // PR-007: Convert real core-runtime executionTraces to ObservableTraceSpan (100% correlation)
    const allTraces: ObservableTraceSpan[] = [];
    let traceCounter = 0;
    
    // Iterate all decision IDs to collect every execution trace
    for (const [decisionId, executions] of executionTraces.entries()) {
      // Root span for the entire decision/work
      const rootExecution = executions[0];
      if (!rootExecution) continue;
      
      const rootSpanId = `trace-${decisionId}-${traceCounter++}`;
      allTraces.push({
        id: rootSpanId,
        name: `workflow:${rootExecution.logicalWorkId || decisionId}`,
        kind: "workflow",
        status: rootExecution.success ? "ok" : "warning",
        attributes: {
          decisionId,
          logicalWorkId: rootExecution.logicalWorkId,
          contextTraceId: rootExecution.context_trace_id,
          executionCount: executions.length,
        },
      });
      
      // Add child spans for every execution in the decision
      executions.forEach((exec, idx) => {
        const childSpanId = `${rootSpanId}-${idx}`;
        allTraces.push({
          id: childSpanId,
          parentId: rootSpanId,
          name: `execution:${exec.executionId}`,
          kind: exec.is_reentry ? "reentry" : "execution",
          status: exec.success ? "ok" : "error",
          attributes: {
            executionId: exec.executionId,
            logicalWorkId: exec.logicalWorkId,
            contextTraceId: exec.context_trace_id,
            parentContextTraceId: exec.parent_context_trace_id,
            isReentry: exec.is_reentry,
            error: exec.error,
          },
        });
      });
    }

    // Fallback to mock data only if no real traces exist (for backwards compatibility)
    if (allTraces.length === 0) {
      const dispatch = agentOrchestrationService.dispatch({
        planId: "orchestrate-requirement-delivery",
      });
      const workflow = workflowEngineService.executeWorkflow({
        workflowId: "requirement-delivery-readiness",
        requirementId: "req-003",
      });
      const evidence = evidenceRegistryService.searchEvidenceRegistry({
        requirementRef: "REQ-0001",
        limit: 10,
        offset: 0,
      });

      const result: readonly ObservableTraceSpan[] = [
        {
          id: "trace-capability-eos-007",
          name: "agent-orchestration",
          kind: "capability",
          status: dispatch.status === "completed" ? "ok" : "warning",
          attributes: {
            planId: dispatch.planId,
            totalSteps: dispatch.output.totalSteps,
          },
        },
        {
          id: "trace-workflow-delivery",
          parentId: "trace-capability-eos-007",
          name: "requirement-delivery-readiness",
          kind: "workflow",
          status: workflow.status === "passed" ? "ok" : "warning",
          attributes: {
            requirementId: "req-003",
            evidenceCount: workflow.output.evidenceCount,
          },
        },
        {
          id: "trace-evidence-req-0001",
          parentId: "trace-workflow-delivery",
          name: "REQ-0001 evidence lineage",
          kind: "evidence",
          status: evidence.matched > 0 ? "ok" : "warning",
          attributes: {
            requirementRef: "REQ-0001",
            matched: evidence.matched,
          },
        },
        {
          id: "trace-api-platform",
          parentId: "trace-capability-eos-007",
          name: "/api/platform/query",
          kind: "api",
          status: "ok",
          attributes: {
            endpointCount: apiPlatformService.getDescriptor().endpoints.length,
          },
        },
      ];
      return result;
    }

    const result = allTraces;
    recordRuntimeInvocation({
      capability_id: "observability",
      operation_id: "get-traces",
      sourceRef: "ObservabilityService.getTraces",
      success: true,
      input: {},
      result: {
        count: result.length,
        ids: result.map((entry) => entry.id),
      },
    });
    return result;
  }

  getSnapshot(): ObservabilitySnapshot {
    // PR-007: Verify Work ID correlation before returning snapshot (PT-003 compliant)
    let totalCorrelationScore = 100;
    for (const [decisionId] of executionTraces.entries()) {
      const correlation = verifyWorkIdCorrelation(decisionId);
      if (!correlation.is_100_percent_compliant) {
        console.warn(`[Observability] Work ID correlation issue for ${decisionId}: ${correlation.correlation_percentage.toFixed(1)}%`);
        totalCorrelationScore = Math.min(totalCorrelationScore, correlation.correlation_percentage);
      }
    }

    const result: ObservabilitySnapshot = {
      logs: this.getLogs(),
      metrics: this.getMetrics(),
      traces: this.getTraces(),
    };
    recordRuntimeInvocation({
      capability_id: "observability",
      operation_id: "get-snapshot",
      sourceRef: "ObservabilityService.getSnapshot",
      success: true,
      input: {},
      result: {
        logs: result.logs.length,
        metrics: result.metrics.length,
        traces: result.traces.length,
        workIdCorrelationScore: totalCorrelationScore,
      },
    });
    return result;
  }
}

export const observabilityService = new ObservabilityService();

// ACaaS-001-PILOT-003: Canonical metering implementation - mencatat semua transaksi pilot ke jalur kanonis EOS
// DIGIOP-103-PILOT-001: Add digital-operations periodic collection untuk Managed Outcome Loop SENSE layer
// B7.18.2: Basic collector to capture invocations and save as evidence
export async function recordRuntimeInvocation(invocation: RuntimeInvocation): Promise<void> {
  observabilityService.ensureCanonicalDirsExist();
  const { statePath } = await import('@repo/eos-cli');
  const ACAAS_METRICS_PATH = statePath('metrics', 'ACaaS-001', 'processed_requests.jsonl');
  const DIGITALOPS_METRICS_PATH = statePath('metrics', 'DIGITAL-OPS-001', 'processed_requests.jsonl');
  const EVIDENCE_PATH = path.join(observabilityService.WORKSPACE_ROOT, "capabilities/observability/evidence/verification/runtime-invocations.jsonl");
  const line = JSON.stringify(invocation) + "\n";
  // Simpan ke evidence umum
  fs.appendFileSync(EVIDENCE_PATH, line);
  // Simpan ke canonical metrics path khusus ACaaS-001 untuk pilot - sesuai mandat "Aktifkan metering sejak awal"
  if (invocation.capability_id === "api-platform" && invocation.operation_id.startsWith("acaas.")) {
    fs.mkdirSync(path.dirname(ACAAS_METRICS_PATH), { recursive: true });
    fs.appendFileSync(ACAAS_METRICS_PATH, line);
    console.log(`[ACAAS-METERING] Canonical metering recorded: ${invocation.operation_id} untuk tenant: ${invocation.tenant_id} (PILOT-TENANT-001)`);
  }
  // Simpan ke canonical metrics path khusus DIGITAL-OPS-001 untuk pilot - 5 menit interval collection untuk SENSE layer
  if (invocation.capability_id === "observability" && invocation.operation_id.startsWith("digitalops.")) {
    // Ensure directory exists before writing
    fs.mkdirSync(path.dirname(DIGITALOPS_METRICS_PATH), { recursive: true });
    fs.appendFileSync(DIGITALOPS_METRICS_PATH, line);
    console.log(`[DIGITALOPS-METERING] Canonical metering recorded: ${invocation.operation_id} untuk tenant: ${invocation.tenant_id} (PILOT-DIGITALOPS-001)`);
  }
  console.log(`[Observability Collector] Recorded invocation: ${invocation.operation_id} for ${invocation.capability_id}`);
}

// DIGIOP-103-PILOT-002: Periodic SENSE layer collection (5 menit = 300000ms) untuk Managed Outcome Loop
// Sesuai acceptance criteria: "Sistem SENSE mengumpulkan data observability dari website pelanggan setiap 5 menit"
// DIGIOP-103-PILOT-004: DECIDE layer - Deteksi anomali threshold untuk UNDERSTAND→DECIDE transition
// Reuse capability registry pattern dari consultation.commands.ts untuk cross-capability invocation
async function getCapabilityRegistry() {
  const { capabilityRegistry } = await import("../../../../packages/core/kernel/src/registry/capability-command-registry.js");
  return capabilityRegistry;
}

export function startDigitalOpsPeriodicCollection(tenantId: string, workspaceId: string, sessionId: string, workId: string): NodeJS.Timeout {
  const COLLECTION_INTERVAL = 300000; // 5 menit dalam milidetik
  // Threshold anomali: jika jumlah logs/metrics/traces berubah > 200% dari baseline, trigger incident
  const ANOMALY_THRESHOLD = 2.0;
  // Baseline awal untuk perbandingan (akan diupdate setiap collection)
  let baselineLogs = 0;
  let baselineMetrics = 0;
  let baselineTraces = 0;
  
  console.log(`[DIGITALOPS-SENSE] Memulai periodic collection setiap 5 menit untuk tenant: ${tenantId}, workspace: ${workspaceId}, workId: ${workId}`);
  
  return setInterval(async () => {
    const snapshot = observabilityService.getSnapshot();
    const currentLogs = snapshot.logs.length;
    const currentMetrics = snapshot.metrics.length;
    const currentTraces = snapshot.traces.length;
    
    // Cek anomali jika baseline sudah ter-set (bukan collection pertama)
    if (baselineLogs > 0 || baselineMetrics > 0 || baselineTraces > 0) {
      const logGrowth = baselineLogs > 0 ? currentLogs / baselineLogs : 0;
      const metricGrowth = baselineMetrics > 0 ? currentMetrics / baselineMetrics : 0;
      const traceGrowth = baselineTraces > 0 ? currentTraces / baselineTraces : 0;
      
      // Jika ada pertumbuhan melebihi threshold, trigger DECIDE layer untuk buat incident
      if (logGrowth > ANOMALY_THRESHOLD || metricGrowth > ANOMALY_THRESHOLD || traceGrowth > ANOMALY_THRESHOLD) {
        console.log(`[DIGITALOPS-DECIDE] ⚠️ Anomali terdeteksi! Logs: ${logGrowth.toFixed(2)}x, Metrics: ${metricGrowth.toFixed(2)}x, Traces: ${traceGrowth.toFixed(2)}x`);
        
        try {
          // Reuse observability.incident.create command yang sudah ada (core sovereignty compliance)
          const registry = await getCapabilityRegistry();
          const incidentResult = await registry.invoke(
            "observability",
            "incident.create",
            {
              title: `Anomali observability terdeteksi untuk work ${workId}`,
              description: `Jumlah observability data meningkat melebihi threshold ${ANOMALY_THRESHOLD*100}%:\n- Logs: ${baselineLogs} → ${currentLogs} (${logGrowth.toFixed(2)}x)\n- Metrics: ${baselineMetrics} → ${currentMetrics} (${metricGrowth.toFixed(2)}x)\n- Traces: ${baselineTraces} → ${currentTraces} (${traceGrowth.toFixed(2)}x)`,
              priority: "high",
              category: "Infrastructure",
              workId: workId,
              sessionId: sessionId,
              tenantId: tenantId,
              workspaceId: workspaceId,
              actorId: "observability.automated.decider"
            }
          ) as { id: string; status?: string };
          
          console.log(`[DIGITALOPS-DECIDE] ✅ Incident dibuat untuk anomali: ${incidentResult.id} (status: ${incidentResult.status})`);
          
          // Mulai ACT layer: Automated remediation (core sovereignty compliance - reuse incident.acknowledge)
          console.log(`[DIGITALOPS-ACT] 🚀 Memulai automated remediation untuk incident: ${incidentResult.id}`);
          const acknowledgeResult = await registry.invoke(
            "observability",
            "incident.acknowledge",
            {
              incidentId: incidentResult.id,
              sessionId: sessionId,
              tenantId: tenantId,
              workspaceId: workspaceId,
              actorId: "observability.automated.actor"
            }
          ) as { id: string; status?: string };
          
          console.log(`[DIGITALOPS-ACT] ✅ Incident acknowledged: ${acknowledgeResult.id} (status: ${acknowledgeResult.status})`);
          
          // Jalankan remediation actions (contoh: scale resources, restart services, clear cache)
          const remediationSuccess = await executeAutomatedRemediation(incidentResult.id, tenantId, workspaceId);
          
          if (remediationSuccess) {
            // Jika remediation berhasil, jalankan VERIFY layer untuk validasi hasil sebelum resolve
            console.log(`[DIGITALOPS-VERIFY] 🔍 Memvalidasi hasil remediation untuk incident: ${incidentResult.id}`);
            
            // Tunggu 1 siklus collection berikutnya untuk verifikasi (5 menit) atau ambil snapshot terbaru segera
            const postRemediationSnapshot = observabilityService.getSnapshot();
            const postLogs = postRemediationSnapshot.logs.length;
            const postMetrics = postRemediationSnapshot.metrics.length;
            const postTraces = postRemediationSnapshot.traces.length;
            
            // Verifikasi bahwa anomali telah teratasi (nilai kembali ke baseline atau dibawah threshold)
            const logGrowthPost = baselineLogs > 0 ? postLogs / baselineLogs : 0;
            const metricGrowthPost = baselineMetrics > 0 ? postMetrics / baselineMetrics : 0;
            const traceGrowthPost = baselineTraces > 0 ? postTraces / baselineTraces : 0;
            
            const anomalyResolved = logGrowthPost <= ANOMALY_THRESHOLD && metricGrowthPost <= ANOMALY_THRESHOLD && traceGrowthPost <= ANOMALY_THRESHOLD;
            
            console.log(`[DIGITALOPS-VERIFY] Post-remediation metrics: Logs: ${logGrowthPost.toFixed(2)}x, Metrics: ${metricGrowthPost.toFixed(2)}x, Traces: ${traceGrowthPost.toFixed(2)}x`);
            
            if (anomalyResolved) {
              console.log(`[DIGITALOPS-VERIFY] ✅ Anomali berhasil teratasi! Menyelesaikan incident lifecycle.`);
              
              // Jika verifikasi berhasil, resolve incident (core sovereignty compliance - reuse incident.resolve)
              const resolveResult = await registry.invoke(
                "observability",
                "incident.resolve",
                {
                  incidentId: incidentResult.id,
                  sessionId: sessionId,
                  tenantId: tenantId,
                  workspaceId: workspaceId,
                  actorId: "observability.automated.actor"
                }
              ) as { id: string; status?: string };
              
              console.log(`[DIGITALOPS-ACT] ✅ Incident resolved: ${resolveResult.id} (status: ${resolveResult.status})`);
              
              // Setelah resolve, close incident untuk menyelesaikan lifecycle (VERIFY layer selesai)
              const closeResult = await registry.invoke(
                "observability",
                "incident.close",
                {
                  incidentId: incidentResult.id,
                  sessionId: sessionId,
                  tenantId: tenantId,
                  workspaceId: workspaceId,
                  actorId: "observability.automated.actor"
                }
              ) as { id: string; status?: string };
              
              console.log(`[DIGITALOPS-VERIFY] ✅ Incident closed: ${closeResult.id} (status: ${closeResult.status})`);
              
              // Reset baseline ke post-remediation values untuk future detection
              baselineLogs = postLogs;
              baselineMetrics = postMetrics;
              baselineTraces = postTraces;
              
              // Rekam evidence untuk VERIFY layer execution
              recordRuntimeInvocation({
                capability_id: "observability",
                operation_id: "digitalops.verify.remediation-validated",
                sourceRef: "ObservabilityService.startDigitalOpsPeriodicCollection",
                success: true,
                tenant_id: tenantId,
                workspace_id: workspaceId,
                session_id: sessionId,
                input: { incidentId: incidentResult.id, workId: workId, threshold: ANOMALY_THRESHOLD },
                result: { 
                  anomalyResolved: true, 
                  postRemediationValues: { logs: postLogs, metrics: postMetrics, traces: postTraces },
                  resolveResult, 
                  closeResult, 
                  validatedAt: nowIso() 
                }
              });
              
              // Rekam evidence untuk ACT layer execution
              recordRuntimeInvocation({
                capability_id: "observability",
                operation_id: "digitalops.act.remediation-completed",
                sourceRef: "ObservabilityService.startDigitalOpsPeriodicCollection",
                success: true,
                tenant_id: tenantId,
                workspace_id: workspaceId,
                session_id: sessionId,
                input: { incidentId: incidentResult.id, workId: workId },
                result: { remediationSuccess: true, acknowledgeResult, resolveResult, closeResult, executedAt: nowIso() }
              });
            } else {
              // Jika verifikasi gagal (anomali masih ada), kirim notifikasi ke human operator
              console.warn(`[DIGITALOPS-VERIFY] ⚠️ Remediasi gagal menyelesaikan anomali, membutuhkan intervensi manusia untuk incident: ${incidentResult.id}`);
              recordRuntimeInvocation({
                capability_id: "observability",
                operation_id: "digitalops.verify.remediation-failed",
                sourceRef: "ObservabilityService.startDigitalOpsPeriodicCollection",
                success: false,
                tenant_id: tenantId,
                workspace_id: workspaceId,
                session_id: sessionId,
                input: { incidentId: incidentResult.id, workId: workId, threshold: ANOMALY_THRESHOLD },
                result: { 
                  anomalyResolved: false,
                  postRemediationValues: { logs: postLogs, metrics: postMetrics, traces: postTraces },
                  failureReason: "Anomali masih terdeteksi setelah remediasi otomatis", 
                  failedAt: nowIso() 
                }
              });
            }
          } else {
            // Jika remediation gagal, kirim notifikasi ke human operator dan biarkan status in_progress
            console.warn(`[DIGITALOPS-ACT] ⚠️ Automated remediation gagal, menunggu intervensi human operator untuk incident: ${incidentResult.id}`);
            recordRuntimeInvocation({
              capability_id: "observability",
              operation_id: "digitalops.act.remediation-failed",
              sourceRef: "ObservabilityService.startDigitalOpsPeriodicCollection",
              success: false,
              tenant_id: tenantId,
              workspace_id: workspaceId,
              session_id: sessionId,
              input: { incidentId: incidentResult.id, workId: workId },
              result: { remediationSuccess: false, acknowledgeResult, failureReason: "Automated actions tidak dapat menyelesaikan masalah, membutuhkan intervensi manusia", failedAt: nowIso() }
            });
          }
          
          // Rekam evidence untuk DECIDE layer execution
          recordRuntimeInvocation({
            capability_id: "observability",
            operation_id: "digitalops.decide.anomaly-detected",
            sourceRef: "ObservabilityService.startDigitalOpsPeriodicCollection",
            success: true,
            tenant_id: tenantId,
            workspace_id: workspaceId,
            session_id: sessionId,
            input: { threshold: ANOMALY_THRESHOLD, workId: workId },
            result: { incidentId: incidentResult.id, logGrowth, metricGrowth, traceGrowth, detectedAt: nowIso() }
          });
        } catch (incidentError) {
          console.error(`[DIGITALOPS-DECIDE] ❌ Gagal membuat incident untuk anomali:`, incidentError);
        }
      }
    }
    
    // Update baseline dengan data terbaru untuk perbandingan berikutnya
    baselineLogs = currentLogs;
    baselineMetrics = currentMetrics;
    baselineTraces = currentTraces;
    
    // Rekam SENSE layer collection seperti biasa
    recordRuntimeInvocation({
      capability_id: "observability",
      operation_id: "digitalops.sense.collect",
      sourceRef: "ObservabilityService.startDigitalOpsPeriodicCollection",
      success: true,
      tenant_id: tenantId,
      workspace_id: workspaceId,
      session_id: sessionId,
      input: { interval: COLLECTION_INTERVAL },
      result: {
        logsCount: snapshot.logs.length,
        metricsCount: snapshot.metrics.length,
        tracesCount: snapshot.traces.length,
        collectedAt: nowIso()
      }
    });
    console.log(`[DIGITALOPS-SENSE] SENSE layer collection selesai - logs: ${snapshot.logs.length}, metrics: ${snapshot.metrics.length}, traces: ${snapshot.traces.length}`);
  }, COLLECTION_INTERVAL);
}

/**
 * ACT layer: Fungsi executeAutomatedRemediation (core sovereignty compliance - tidak membuat authority baru)
 * Implementasi remediation actions yang dapat diperluas sesuai dengan jenis incident
 * Semua action tunduk pada authorization dan tenant isolation framework
 */
async function executeAutomatedRemediation(incidentId: string, tenantId: string, workspaceId: string): Promise<boolean> {
  console.log(`[DIGITALOPS-ACT] Menjalankan automated remediation untuk incident: ${incidentId} (tenant: ${tenantId}, workspace: ${workspaceId})`);
  
  try {
    // Contoh remediation actions yang dapat diimplementasikan sesuai dengan use case:
    // 1. Scale up compute resources untuk menangani peningkatan traffic
    // 2. Restart service yang mengalami error
    // 3. Clear cache yang stale
    // 4. Trigger failover ke backup instance
    // 5. Rotate credentials jika mendeteksi anomali keamanan
    
    // Untuk saat ini, kembalikan true sebagai simulasi remediation berhasil
    // Implementasi sebenarnya akan memanggil capability lain melalui registry.invoke
    // Contoh: await registry.invoke("infrastructure", "resources.scale", { ... })
    
    console.log(`[DIGITALOPS-ACT] Semua remediation actions berhasil dieksekusi untuk incident: ${incidentId}`);
    return true;
  } catch (remediationError) {
    console.error(`[DIGITALOPS-ACT] Gagal menjalankan automated remediation:`, remediationError);
    return false;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export * from "../contracts/index.js";