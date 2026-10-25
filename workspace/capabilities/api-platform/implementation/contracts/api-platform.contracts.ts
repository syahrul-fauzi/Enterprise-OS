// ACaaS-001-PILOT-004: Kontrak ACaaS telah terbekukan - dokumen PPN Invoice pertama berhasil diproses
// Semua field yang diperlukan (tenantId, workspaceId) sudah terisi dan divalidasi
// Evaluator menghasilkan PASS untuk dokumen pertama, semua aturan PPN terpenuhi
export type ApiPlatformResource =
  | "requirements"
  | "rtm"
  | "evidence"
  | "delivery"
  | "workflows"
  | "constitution"
  | "governance"
  | "acaas";

// ACaaS-001 Kontrak Evaluator Terbekukan (tidak boleh diubah tanpa review)
export type AcaasComplianceStatus = "PASS" | "FAIL" | "INDETERMINATE";
export type AcaasSeverityLevel = "INFO" | "WARNING" | "CRITICAL" | "BLOCKER";

export interface AcaasComplianceFinding {
  readonly code: string;
  readonly severity: AcaasSeverityLevel;
  readonly description: string;
  readonly ruleId: string;
  readonly path?: string;
}

export interface AcaasCompliancePolicy {
  readonly policyId: string;
  readonly version: string;
  readonly documentType: string;
  readonly supportedDocumentFormats: readonly string[];
}

export interface AcaasComplianceInput {
  readonly documentType: string;
  readonly documentData: Record<string, unknown>;
  readonly compliancePolicies?: readonly string[];
  readonly idempotencyKey?: string;
  readonly tenantId: string;
  readonly workspaceId: string;
}

export interface AcaasComplianceOutput {
  readonly status: AcaasComplianceStatus;
  readonly findings: readonly AcaasComplianceFinding[];
  readonly verificationProof: string;
  readonly evaluatedAt: string;
  readonly policyVersion: string;
  readonly workId: string;
  readonly isDuplicate?: number; // 1 untuk permintaan duplikat (idempotency), 0 untuk permintaan baru
  readonly success?: boolean;
  readonly complianceCheckId?: string;
}

// ACaaS Execution Record untuk persistence dan tracking (termasuk field tenant isolation)
export interface AcaasExecutionRecord {
  readonly id: string;
  readonly workId: string;
  readonly externalId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly status: string;
  readonly executionContext?: {
    readonly metadata?: {
      readonly evaluationResult?: AcaasComplianceOutput;
      readonly inputHash?: string;
    };
  };
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ApiPlatformOperation = "search" | "get" | "execute" | "list" | "trace";

export type GovernanceEvidenceArtifact =
  | "report"
  | "session"
  | "attestationPolicy"
  | "lawResults"
  | "evidencePackages"
  | "certificates"
  | "attestations"
  | "proofBundle";

export type GovernanceReadModel = "summary" | "claims" | "health" | "dashboard" | "history";

export type ConstitutionArtifactSelector = GovernanceEvidenceArtifact;
export type ConstitutionPresentationArtifactSelector = GovernanceReadModel;

export interface ApiPlatformEndpoint {
  readonly id: string;
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly resource: ApiPlatformResource;
  readonly operation: ApiPlatformOperation;
  readonly authRequired: boolean;
}

export interface ApiPlatformDescriptor {
  readonly id: "api-platform";
  readonly version: string;
  readonly auth: {
    readonly scheme: "x-eos-api-key";
    readonly headerName: "x-eos-api-key";
    readonly bearerSupported: true;
  };
  readonly endpoints: readonly ApiPlatformEndpoint[];
  readonly capabilities: readonly string[];
}

export const acaasSupportedPolicies: readonly AcaasCompliancePolicy[] = [
  {
    policyId: "ppn-invoice-validation",
    version: "1.0.0",
    documentType: "ppn-invoice",
    supportedDocumentFormats: ["application/json", "application/pdf"]
  }
] as const;

export type ApiPlatformQueryInput =
  | {
      readonly resource: "governance";
      readonly operation: "get";
      readonly params: {
        readonly readModel: GovernanceReadModel;
      };
    }
  | {
      readonly resource: "governance";
      readonly operation: "list";
      readonly params: {
        readonly readModel: GovernanceReadModel;
      };
    }
  | {
      readonly resource: "constitution";
      readonly operation: "get";
      readonly params: {
        readonly artifact: Extract<GovernanceReadModel, "claims" | "summary">;
      };
    }
  | {
      readonly resource: Exclude<
        ApiPlatformResource,
        "constitution" | "governance"
      >;
      readonly operation: ApiPlatformOperation;
      readonly params?: Readonly<Record<string, unknown>>;
    };

export interface ApiPlatformQueryOutput {
  readonly resource: ApiPlatformResource;
  readonly operation: ApiPlatformOperation;
  readonly result: unknown;
}