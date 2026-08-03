import { agentOrchestrationService } from "../../../agent-orchestration/implementation/services/agent-orchestration.service";
import { apiPlatformService } from "../../../api-platform/implementation/services/api-platform.service";
import { evidenceRegistryService } from "../../../evidence-registry/implementation/services/evidence-registry.service";
import { requirementService } from "../../../requirement-management/implementation/services/requirement.service";
import { requirementsTraceabilityMatrixService } from "../../../requirements-traceability-matrix/implementation/services/traceability.service";
import { workflowEngineService } from "../../../workflow-engine/implementation/services/workflow-engine.service";
import type {
  ObservableLogEntry,
  ObservableMetric,
  ObservableTraceSpan,
  ObservabilitySnapshot,
} from "../contracts";
import { recordRuntimeInvocation } from "@repo/core-runtime";

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
      capabilityId: "observability",
      operationId: "get-logs",
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
      capabilityId: "observability",
      operationId: "get-metrics",
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
    recordRuntimeInvocation({
      capabilityId: "observability",
      operationId: "get-traces",
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
    const result: ObservabilitySnapshot = {
      logs: this.getLogs(),
      metrics: this.getMetrics(),
      traces: this.getTraces(),
    };
    recordRuntimeInvocation({
      capabilityId: "observability",
      operationId: "get-snapshot",
      sourceRef: "ObservabilityService.getSnapshot",
      success: true,
      input: {},
      result: {
        logs: result.logs.length,
        metrics: result.metrics.length,
        traces: result.traces.length,
      },
    });
    return result;
  }
}

export const observabilityService = new ObservabilityService();

export * from "../contracts";
