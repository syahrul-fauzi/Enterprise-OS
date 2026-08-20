export type CaseStatus = "draft" | "open" | "in_progress" | "closed";

export type CasePriority = "low" | "medium" | "high" | "critical";

export type CaseId = string & { readonly __caseId: unique symbol };

export function CaseId(value: string): CaseId {
  return value as CaseId;
}

export interface ExecutionContextMetadata {
  readonly decision_id?: string | null;
  readonly last_invocation_digest?: string | null;
  readonly propagated_from: "cross-capability" | "direct-api";
}

export interface CaseAggregate {
  readonly id: CaseId;
  readonly workId?: string; // Work identity binding (from decision_id)
  readonly title: string;
  readonly description?: string;
  readonly status: CaseStatus;
  readonly priority: CasePriority;
  readonly lawyerId?: string;
  readonly sourceDiscussionId?: string; // ILC: source community discussion ID for context tracing
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  readonly closedAt?: Readonly<Date>;
  // Ambient execution context for distributed tracing (W4-C20-001 compliance)
  readonly executionContext?: ExecutionContextMetadata;
}

export interface CreateCaseInput {
  readonly title: string;
  readonly description?: string;
  readonly priority?: CasePriority;
  readonly sourceDiscussionId?: string; // ILC: preserve source community discussion context
  readonly lawyerId?: string;
  // Work identity binding (from decision_id)
  readonly workId?: string;
  // Required context for tenant isolation
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface CreateCaseOutput {
  readonly id: CaseId;
  readonly status: CaseStatus;
}

export interface CloseCaseInput {
  readonly id: CaseId;
  readonly reason?: string;
}

export interface CloseCaseOutput {
  readonly id: CaseId;
  readonly status: "closed";
  readonly closedAt: Date;
}

export interface AssignLawyerInput {
    readonly id: CaseId;
    readonly lawyerId: string;
    readonly transferReason?: string;
    readonly workId?: string;
    readonly parentContextTraceId?: string;
}

export interface AssignLawyerOutput {
  readonly id: CaseId;
  readonly lawyerId: string;
  readonly status: CaseStatus;
}

export interface GetCaseInput {
  readonly id: CaseId;
}

export type GetCaseOutput = CaseAggregate | undefined;

export interface SearchCasesInput {
  readonly query?: string;
  readonly status?: CaseStatus | "all";
  readonly priority?: CasePriority | "all";
  readonly limit?: number;
  readonly offset?: number;
}

export interface SearchCasesOutput {
  readonly items: readonly CaseAggregate[];
  readonly total: number;
  readonly matched: number;
  readonly offset: number;
  readonly limit: number;
}

export type CaseRepository = {
  readonly entityName: "Case";
  readonly kind: "repository";
  byId(id: CaseId): Promise<CaseAggregate | undefined>;
  list(): Promise<readonly CaseAggregate[]>;
  listByTenant(tenantId: string): Promise<readonly CaseAggregate[]>;
  listByWorkspace(workspaceId: string): Promise<readonly CaseAggregate[]>;
  save(entity: CaseAggregate): Promise<CaseAggregate>;
  remove(id: CaseId): Promise<boolean>;
};

export interface CaseDomainEvents {
  readonly "CaseCreated": {
    readonly id: CaseId;
    readonly title: string;
    readonly at: Date;
  };
  readonly "CaseClosed": {
    readonly id: CaseId;
    readonly reason?: string;
    readonly at: Date;
  };
  readonly "LawyerAssigned": {
    readonly id: CaseId;
    readonly lawyerId: string;
    readonly at: Date;
  };
}