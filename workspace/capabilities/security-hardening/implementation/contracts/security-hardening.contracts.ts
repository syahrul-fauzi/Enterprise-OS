export type EosScope =
  | "platform.read"
  | "platform.query"
  | "constitution.read"
  | "connectors.read"
  | "connectors.sync"
  | "graph.read"
  | "orchestration.read"
  | "orchestration.dispatch"
  | "observability.read";

export interface SecurityConfigSummary {
  readonly strictMode: boolean;
  readonly secretSource: "environment" | "development-default" | "missing";
  readonly scopes: readonly EosScope[];
}

export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly status: 200 | 401 | 403;
  readonly reason: string;
  readonly scope: EosScope;
}
