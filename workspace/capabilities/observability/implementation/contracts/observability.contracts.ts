export interface RuntimeInvocation {
  readonly capability_id: string;
  readonly operation_id: string;
  readonly sourceRef: string;
  readonly success: boolean;
  readonly input: Readonly<Record<string, unknown>>;
  readonly result: Readonly<Record<string, unknown>>;
  readonly timestamp?: string;
}

export interface ObservableLogEntry {
  readonly id: string;
  readonly level: "info" | "warn" | "error";
  readonly category: "orchestration" | "workflow" | "evidence" | "platform";
  readonly message: string;
  readonly timestamp: string;
  readonly context: Readonly<Record<string, unknown>>;
}

export interface ObservableMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: "count" | "ratio";
  readonly description: string;
}

export interface ObservableTraceSpan {
  readonly id: string;
  readonly parentId?: string;
  readonly name: string;
  readonly kind: "capability" | "workflow" | "evidence" | "api";
  readonly status: "ok" | "warning";
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface ObservabilitySnapshot {
  readonly logs: readonly ObservableLogEntry[];
  readonly metrics: readonly ObservableMetric[];
  readonly traces: readonly ObservableTraceSpan[];
}

export type IncidentId = string & { __brand: "IncidentId" };
export type IncidentStatus = "draft" | "open" | "in_progress" | "resolved" | "closed";
export type IncidentPriority = "low" | "medium" | "high" | "critical";
export type IncidentCategory = "Infrastructure" | "Application" | "Database" | "Network" | "Security" | "Payment";

export interface IncidentAggregate {
  readonly id: IncidentId;
  readonly title: string;
  readonly description?: string;
  readonly category: IncidentCategory;
  readonly status: IncidentStatus;
  readonly priority: IncidentPriority;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateIncidentInput {
  readonly title: string;
  readonly description?: string;
  readonly priority?: IncidentPriority;
  readonly category?: IncidentCategory;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface CreateIncidentOutput {
  readonly id: IncidentId;
  readonly status: IncidentStatus;
}

export function newIncidentId(): IncidentId {
  return `inc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}` as IncidentId;
}

export const defaultIncidentStatus: IncidentStatus = "draft";
export const defaultIncidentPriority: IncidentPriority = "medium";