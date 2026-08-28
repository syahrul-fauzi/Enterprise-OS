////import type {
////  EvaluationAttributionRecordV1,
////  ListAttributionRecordsInput,
////  GetLatestAttributionRecordInput,
////  VerifyExecutionIdInvariantInput,
////  VerifyExecutionIdInvariantOutput,
////} from "../../contracts.js";
////import {
////  listAttributionRecords,
////  getLatestAttributionRecord,
////} from "../../index.js";
////import { recordRuntimeInvocation } from "../../../../packages/core/runtime/src/index.js";
////
////export class AttributionReadGatewayService {
////  listAttributionRecords(
////    input: ListAttributionRecordsInput,
////  ): readonly EvaluationAttributionRecordV1[] {
////    const records = listAttributionRecords(input);
////    
////    recordRuntimeInvocation({
////      capabilityId: "attribution",
////      operationId: "list-attribution-records",
////      sourceRef: "AttributionReadGatewayService.listAttributionRecords",
////      success: true,
////      input,
////      result: {
////        returned: records.length,
////        procedure: input.procedure,
////        canonicalSubject: input.canonicalSubject,
////      },
////    });
////
////    return records;
////  }
////
////  getLatestAttributionRecord(
////    input: GetLatestAttributionRecordInput,
////  ): EvaluationAttributionRecordV1 | null {
////    const record = getLatestAttributionRecord(input);
////    
////    recordRuntimeInvocation({
////      capabilityId: "attribution",
////      operationId: "get-latest-attribution-record",
////      sourceRef: "AttributionReadGatewayService.getLatestAttributionRecord",
////      success: record !== null,
////      input,
////      result: record ? {
////        hasRecord: true,
////        evaluatedAt: record.evaluatedAt,
////      } : { hasRecord: false },
////    });
////
////    return record;
////  }
////
////  verifyExecutionIdInvariant(
////    input: VerifyExecutionIdInvariantInput,
////  ): VerifyExecutionIdInvariantOutput {
////    const computedExecutionId = `${input.procedure}:${input.canonicalSubject}`;
////    const valid = input.executionId === computedExecutionId;
////
////    recordRuntimeInvocation({
////      capabilityId: "attribution",
////      operationId: "verify-executionId-invariant",
////      sourceRef: "AttributionReadGatewayService.verifyExecutionIdInvariant",
////      success: valid,
////      input,
////      result: {
////        valid,
////        computedExecutionId,
////        reason: valid ? undefined : "INVALID_ATTRIBUTION_RECORD: executionId does not match procedure:canonicalSubject",
////      },
////    });
////
////    return {
////      valid,
////      reason: valid ? undefined : "INVALID ATTRIBUTION RECORD: executionId tidak cocok dengan procedure:canonicalSubject",
////    };
////  }
////}
////
////export const attributionReadGatewayService = new AttributionReadGatewayService();