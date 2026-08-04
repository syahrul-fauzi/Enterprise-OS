import type {
  EnterpriseQueryRequest,
  EnterpriseQueryResult,
} from "../models/query.js";

export interface QueryExecutor {
  show(
    input: Extract<EnterpriseQueryRequest, { kind: "SHOW" }>,
  ): Promise<EnterpriseQueryResult>;
  trace(
    input: Extract<EnterpriseQueryRequest, { kind: "TRACE" }>,
  ): Promise<EnterpriseQueryResult>;
  impact(
    input: Extract<EnterpriseQueryRequest, { kind: "IMPACT" }>,
  ): Promise<EnterpriseQueryResult>;
  diff(
    input: Extract<EnterpriseQueryRequest, { kind: "DIFF" }>,
  ): Promise<EnterpriseQueryResult>;
  path(
    input: Extract<EnterpriseQueryRequest, { kind: "PATH" }>,
  ): Promise<EnterpriseQueryResult>;
  query(input: EnterpriseQueryRequest): Promise<EnterpriseQueryResult>;
}
