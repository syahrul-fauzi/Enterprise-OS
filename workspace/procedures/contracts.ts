//export type ProcedureId = string & { readonly __brand: "ProcedureId" };
//
//export type CanonicalSubjectKey = string & { readonly __brand: "CanonicalSubjectKey" };
//
//export type ExecutionId = string & { readonly __brand: "ExecutionId" };
//
//export interface ExecutionIdentityV1 {
//  readonly executionId: ExecutionId;
//  readonly procedure: string;
//  readonly canonicalSubject: CanonicalSubjectKey;
//}
//
//export function toProcedureId(id: string): ProcedureId {
//  return id as ProcedureId;
//}
//
//export function toCanonicalSubjectKey(key: string): CanonicalSubjectKey {
//  return key as CanonicalSubjectKey;
//}
//
//export function toExecutionId(id: string): ExecutionId {
//  return id as ExecutionId;
//}
//
//export function buildExecutionIdentityV1(
//  procedure: string,
//  canonicalSubject: string,
//): ExecutionIdentityV1 {
//  const procedureId = toProcedureId(procedure);
//  const subject = toCanonicalSubjectKey(canonicalSubject);
//  const executionId = toExecutionId(`${procedureId}:${subject}`);
//  return {
//    executionId,
//    procedure: procedureId,
//    canonicalSubject: subject,
//  };
//}
