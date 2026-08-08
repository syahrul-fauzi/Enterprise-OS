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