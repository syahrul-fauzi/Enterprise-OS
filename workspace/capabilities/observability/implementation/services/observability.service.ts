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
import type {
  ObservableLogEntry,
  ObservableMetric,
  ObservableTraceSpan,
  ObservabilitySnapshot,
  RuntimeInvocation,
} from "../contracts/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_PATH = path.join(WORKSPACE_ROOT, "capabilities/observability/evidence/verification/runtime-invocations.jsonl");

// Ensure evidence directory exists
function ensureEvidenceDirExists(): void {
  const dir = path.dirname(EVIDENCE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// B7.18.2: Basic collector to capture invocations and save as evidence
function recordRuntimeInvocation(invocation: RuntimeInvocation): void {
  ensureEvidenceDirExists();
  const line = JSON.stringify(invocation) + "\n";
  fs.appendFileSync(EVIDENCE_PATH, line);
  console.log(`[Observability Collector] Recorded invocation: ${invocation.operation_id} for ${invocation.capability_id}`);
}

function nowIso(): string {
  return new Date("2026-08-01T00:00:00.000Z").toISOString();
}

export class ObservabilityService {
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
        value:
          traceability.summary.requirementCount === 0
            ? 0
            : traceability.summary.completeCount / traceability.summary.requirementCount,
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

export * from "../contracts/index.js";