export interface ConnectorDefinition {
  readonly id: string;
  readonly name: string;
  readonly direction: "export" | "sync";
  readonly target: string;
  readonly description: string;
}

export interface ConnectorSyncResult {
  readonly connectorId: string;
  readonly status: "completed" | "failed";
  readonly exportedCount: number;
  readonly payload: Readonly<Record<string, unknown>>;
}
