export type CaseStatus = "draft" | "open" | "in_progress" | "closed";

export type CasePriority = "low" | "medium" | "high" | "critical";

export type CaseId = string & { readonly __caseId: unique symbol };

export function CaseId(value: string): CaseId {
  return value as CaseId;
}

export interface CaseAggregate {
  readonly id: CaseId;
  readonly title: string;
  readonly description?: string;
  readonly status: CaseStatus;
  readonly priority: CasePriority;
  readonly lawyerId?: string;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  readonly closedAt?: Readonly<Date>;
}

export interface CreateCaseInput {
  readonly title: string;
  readonly description?: string;
  readonly priority?: CasePriority;
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