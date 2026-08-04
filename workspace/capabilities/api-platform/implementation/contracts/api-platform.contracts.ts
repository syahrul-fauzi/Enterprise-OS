export type ApiPlatformResource =
  | "requirements"
  | "rtm"
  | "evidence"
  | "delivery"
  | "workflows"
  | "constitution"
  | "governance";

export type ApiPlatformOperation = "search" | "get" | "execute" | "list";

export type GovernanceEvidenceArtifact =
  | "report"
  | "session"
  | "attestationPolicy"
  | "lawResults"
  | "evidencePackages"
  | "certificates"
  | "attestations"
  | "proofBundle";

export type GovernanceReadModel = "summary" | "claims" | "health" | "dashboard";

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

export type ApiPlatformQueryInput =
  | {
      readonly resource: "governance";
      readonly operation: "get";
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
