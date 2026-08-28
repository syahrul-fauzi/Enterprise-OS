// Temporarily commented out to unblock build - all missing capabilities temporarily disabled
// import { requirementService } from "../../../requirement-management/implementation/service.js";
// import { RequirementId } from "../../../requirement-management/implementation/contracts/index.js";
// import { requirementsTraceabilityMatrixService } from "../../../requirements-traceability-matrix/implementation/service.js";
// import { evidenceRegistryService } from "../../../evidence-registry/implementation/service.js";
// import { workflowEngineService } from "../../../workflow-engine/implementation/service.js";
import type {
  ApiPlatformDescriptor,
  ApiPlatformEndpoint,
  ApiPlatformQueryInput,
  ApiPlatformQueryOutput,
} from "../contracts/index.js";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import { governanceReadGatewayService } from "./governance-read-gateway.service.js";
import { requirementDeliveryGatewayService } from "./requirement-delivery-gateway.service.js";

const ENDPOINTS: readonly ApiPlatformEndpoint[] = Object.freeze([
  {
    id: "platform-discovery",
    method: "GET",
    path: "/api/platform",
    resource: "workflows",
    operation: "list",
    authRequired: true,
  },
  {
    id: "platform-query",
    method: "POST",
    path: "/api/platform/query",
    resource: "delivery",
    operation: "search",
    authRequired: true,
  },
  {
    id: "governance-summary",
    method: "GET",
    path: "/api/governance/summary",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "governance-claims",
    method: "GET",
    path: "/api/governance/claims",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "governance-health",
    method: "GET",
    path: "/api/governance/health",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "governance-dashboard",
    method: "GET",
    path: "/api/governance/dashboard",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "governance-report",
    method: "GET",
    path: "/api/governance/report",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "governance-attestation-policy",
    method: "GET",
    path: "/api/governance/attestation-policy",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "governance-law-results",
    method: "GET",
    path: "/api/governance/law-results",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "governance-evidence-packages",
    method: "GET",
    path: "/api/governance/evidence-packages",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "governance-certificates",
    method: "GET",
    path: "/api/governance/certificates",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "governance-attestations",
    method: "GET",
    path: "/api/governance/attestations",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "governance-proof-bundle",
    method: "GET",
    path: "/api/governance/proof-bundle",
    resource: "governance",
    operation: "get",
    authRequired: true,
  },
  {
    id: "constitution-report",
    method: "GET",
    path: "/api/constitution/report",
    resource: "constitution",
    operation: "get",
    authRequired: true,
  },
  {
    id: "constitution-attestation-policy",
    method: "GET",
    path: "/api/constitution/attestation-policy",
    resource: "constitution",
    operation: "get",
    authRequired: true,
  },
  {
    id: "constitution-law-results",
    method: "GET",
    path: "/api/constitution/law-results",
    resource: "constitution",
    operation: "get",
    authRequired: true,
  },
  {
    id: "constitution-evidence-packages",
    method: "GET",
    path: "/api/constitution/evidence-packages",
    resource: "constitution",
    operation: "get",
    authRequired: true,
  },
  {
    id: "constitution-certificates",
    method: "GET",
    path: "/api/constitution/certificates",
    resource: "constitution",
    operation: "get",
    authRequired: true,
  },
  {
    id: "constitution-attestations",
    method: "GET",
    path: "/api/constitution/attestations",
    resource: "constitution",
    operation: "get",
    authRequired: true,
  },
  {
    id: "constitution-claims",
    method: "GET",
    path: "/api/constitution/claims",
    resource: "constitution",
    operation: "get",
    authRequired: true,
  },
  {
    id: "constitution-summary",
    method: "GET",
    path: "/api/constitution/summary",
    resource: "constitution",
    operation: "get",
    authRequired: true,
  },
  {
    id: "constitution-proof-bundle",
    method: "GET",
    path: "/api/constitution/proof-bundle",
    resource: "constitution",
    operation: "get",
    authRequired: true,
  },
]);

export const API_PLATFORM_DEFAULT_KEY = "eos-dev-key";

export function getApiPlatformKey(): string {
  return process.env.EOS_API_KEY?.trim() || API_PLATFORM_DEFAULT_KEY;
}

export function isApiPlatformAuthorized(request: Request): boolean {
  const apiKey = request.headers.get("x-eos-api-key")?.trim();
  const bearer = request.headers.get("authorization")?.trim();
  const expected = getApiPlatformKey();

  if (apiKey === expected) {
    return true;
  }

  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === expected;
  }

  return false;
}

export class ApiPlatformService {
  getDescriptor(): ApiPlatformDescriptor {
    const result: ApiPlatformDescriptor = {
      id: "api-platform",
      version: "0.1.0",
      auth: {
        scheme: "x-eos-api-key",
        headerName: "x-eos-api-key",
        bearerSupported: true,
      },
      endpoints: ENDPOINTS.map((endpoint) => ({ ...endpoint })),
      capabilities: [
        "requirement-management",
        "requirements-traceability-matrix",
        "evidence-registry",
        "workflow-engine",
      ],
    };
    recordRuntimeInvocation({
      capabilityId: "api-platform",
      operationId: "get-descriptor",
      sourceRef: "ApiPlatformService.getDescriptor",
      success: true,
      input: {},
      result: {
        endpointCount: result.endpoints.length,
        capabilityCount: result.capabilities.length,
      },
    });
    return result;
  }

  executeQuery(input: ApiPlatformQueryInput): ApiPlatformQueryOutput {
    const result =
      input.resource === "governance" && input.operation === "get"
        ? governanceReadGatewayService.selectReadModel(input.params.readModel)
        : input.resource === "constitution" && input.operation === "get"
          ? governanceReadGatewayService.selectReadModel(input.params.artifact)
          : (() => {
              const params = input.params ?? {};

              return input.resource === "requirements" &&
                input.operation === "search"
                ? requirementService.searchRequirements({
                    query:
                      typeof params.query === "string"
                        ? params.query
                        : undefined,
                    status:
                      typeof params.status === "string"
                        ? (params.status as never)
                        : undefined,
                    priority:
                      typeof params.priority === "string"
                        ? (params.priority as never)
                        : undefined,
                    verificationStatus:
                      typeof params.verificationStatus === "string"
                        ? (params.verificationStatus as never)
                        : undefined,
                    linkedCapabilityId:
                      typeof params.linkedCapabilityId === "string"
                        ? params.linkedCapabilityId
                        : undefined,
                    owner:
                      typeof params.owner === "string"
                        ? params.owner
                        : undefined,
                    limit:
                      typeof params.limit === "number"
                        ? params.limit
                        : undefined,
                    offset:
                      typeof params.offset === "number"
                        ? params.offset
                        : undefined,
                  })
                : input.resource === "requirements" && input.operation === "get"
                  ? requirementService.getRequirement({
                      id: RequirementId(String(params.id ?? "")),
                    })
                  : input.resource === "rtm" && input.operation === "search"
                    ? requirementsTraceabilityMatrixService.searchTraceabilityMatrix(
                        {
                          requirementId:
                            typeof params.requirementId === "string"
                              ? params.requirementId
                              : undefined,
                          linkedCapabilityId:
                            typeof params.linkedCapabilityId === "string"
                              ? params.linkedCapabilityId
                              : undefined,
                          artifactKind:
                            typeof params.artifactKind === "string"
                              ? (params.artifactKind as never)
                              : undefined,
                          coverage:
                            typeof params.coverage === "string"
                              ? (params.coverage as never)
                              : undefined,
                        },
                      )
                    : input.resource === "rtm" && input.operation === "get"
                      ? requirementsTraceabilityMatrixService.getTraceabilityRow(
                          {
                            requirementId: RequirementId(
                              String(params.requirementId ?? ""),
                            ),
                          },
                        )
                      : input.resource === "delivery" &&
                          input.operation === "search"
                        ? requirementDeliveryGatewayService.search({
                            requirementId:
                              typeof params.requirementId === "string"
                                ? params.requirementId
                                : undefined,
                            linkedCapabilityId:
                              typeof params.linkedCapabilityId === "string"
                                ? params.linkedCapabilityId
                                : undefined,
                            coverage:
                              typeof params.coverage === "string"
                                ? (params.coverage as never)
                                : undefined,
                            verificationStatus:
                              typeof params.verificationStatus === "string"
                                ? (params.verificationStatus as never)
                                : undefined,
                            limit:
                              typeof params.limit === "number"
                                ? params.limit
                                : undefined,
                            offset:
                              typeof params.offset === "number"
                                ? params.offset
                                : undefined,
                          })
                      : input.resource === "evidence" &&
                          input.operation === "search"
                        ? evidenceRegistryService.searchEvidenceRegistry({
                            q:
                              typeof params.q === "string"
                                ? params.q
                                : undefined,
                            kind:
                              typeof params.kind === "string"
                                ? (params.kind as never)
                                : undefined,
                            scope:
                              typeof params.scope === "string"
                                ? (params.scope as never)
                                : undefined,
                            runId:
                              typeof params.runId === "string"
                                ? params.runId
                                : undefined,
                            requirementRef:
                              typeof params.requirementRef === "string"
                                ? params.requirementRef
                                : undefined,
                            tag:
                              typeof params.tag === "string"
                                ? params.tag
                                : undefined,
                            limit:
                              typeof params.limit === "number"
                                ? params.limit
                                : undefined,
                            offset:
                              typeof params.offset === "number"
                                ? params.offset
                                : undefined,
                          })
                        : input.resource === "evidence" &&
                            input.operation === "get"
                          ? evidenceRegistryService.getEvidenceRecord({
                              id: String(params.id ?? ""),
                            })
                          : input.resource === "workflows" &&
                              input.operation === "list"
                            ? workflowEngineService.listWorkflowDefinitions()
                            : input.resource === "workflows" &&
                                input.operation === "get"
                              ? workflowEngineService.getWorkflowDefinition({
                                  workflowId: String(params.workflowId ?? ""),
                                })
                              : input.resource === "workflows" &&
                                  input.operation === "execute"
                                ? workflowEngineService.executeWorkflow({
                                    workflowId: String(params.workflowId ?? ""),
                                    requirementId:
                                      typeof params.requirementId === "string"
                                        ? params.requirementId
                                        : undefined,
                                    runId:
                                      typeof params.runId === "string"
                                        ? params.runId
                                        : undefined,
                                    limit:
                                      typeof params.limit === "number"
                                        ? params.limit
                                        : undefined,
                                    decision_id:
                                      typeof params.decision_id === "string"
                                        ? params.decision_id
                                        : undefined,
                                    productId:
                                      typeof params.productId === "string"
                                        ? params.productId
                                        : process.env.EOS_RUNTIME_INVOCATION_PRODUCT_ID,
                                  })
                                : input.resource === "workflows" &&
                                  input.operation === "trace"
                                ? workflowEngineService.traceExecutionsByDecision({
                                    decision_id: String(params.decision_id ?? ""),
                                  })
                                : undefined;
            })();

    if (result === undefined) {
      throw new Error(
        `Unsupported platform query: resource=${input.resource} operation=${input.operation}`,
      );
    }

    const output = {
      resource: input.resource,
      operation: input.operation,
      result,
    };
    recordRuntimeInvocation({
      capabilityId: "api-platform",
      operationId: "execute-query",
      sourceRef: "ApiPlatformService.executeQuery",
      success: true,
      input,
      result: output,
    });
    return output;
  }
}

export const apiPlatformService = new ApiPlatformService();

export * from "../contracts/index.js";