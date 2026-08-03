import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import { trustFrameworkService } from "../../../trust-framework/implementation/service";
import type {
  GovernanceEvidenceArtifactCatalog,
  GovernanceEvidenceArtifactKind,
  GovernanceEvidenceArtifactLocation,
  GovernanceEvidenceProvider,
  GovernanceSession,
  JsonArtifact,
  JsonRecord,
} from "../contracts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = resolve(__dirname, "../../../../");

const EVIDENCE_PATHS: Record<GovernanceEvidenceArtifactKind, string> = {
  report: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-report.json",
  ),
  session: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/governance-session.json",
  ),
  attestationPolicy: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-attestation-policy.json",
  ),
  lawResults: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-law-results.json",
  ),
  evidencePackages: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-evidence-packages.json",
  ),
  certificates: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-certificates.json",
  ),
  attestations: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-attestations.json",
  ),
  proofBundle: resolve(
    WORKSPACE_ROOT,
    "foundation/evidence/verification/constitution-proof-bundle.json",
  ),
};

class GovernanceEvidenceArtifactCatalogFileSystem implements GovernanceEvidenceArtifactCatalog {
  resolve(
    kind: GovernanceEvidenceArtifactKind,
  ): GovernanceEvidenceArtifactLocation {
    return {
      kind,
      path: EVIDENCE_PATHS[kind],
    };
  }
}

function readArtifact(
  path: string,
  kind: GovernanceEvidenceArtifactKind,
): JsonArtifact {
  if (!existsSync(path)) {
    throw new Error(
      `governance_evidence_${kind}_unavailable: missing evidence artifact at ${path}. Run constitution/foundation verification first.`,
    );
  }

  return JSON.parse(readFileSync(path, "utf8")) as JsonArtifact;
}

function asJsonRecord(
  artifact: JsonArtifact,
  kind: GovernanceEvidenceArtifactKind,
): JsonRecord {
  if (Array.isArray(artifact)) {
    throw new Error(
      `governance_evidence_${kind}_shape_mismatch: expected object evidence artifact.`,
    );
  }

  return artifact as JsonRecord;
}

export class GovernanceEvidenceService implements GovernanceEvidenceProvider {
  constructor(
    private readonly catalog: GovernanceEvidenceArtifactCatalog = new GovernanceEvidenceArtifactCatalogFileSystem(),
  ) {}

  getAuditReport(): JsonRecord {
    const location = this.catalog.resolve("report");
    const result = asJsonRecord(
      readArtifact(location.path, location.kind),
      location.kind,
    );
    recordRuntimeInvocation({
      capabilityId: "governance-evidence",
      operationId: "get-audit-report",
      sourceRef: "GovernanceEvidenceService.getAuditReport",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        constitutionalDigest: result.constitutional_digest,
        lawProfile: result.law_profile,
      },
    });
    return result;
  }

  getGovernanceSession(): GovernanceSession {
    const location = this.catalog.resolve("session");
    const result = asJsonRecord(
      readArtifact(location.path, location.kind),
      location.kind,
    ) as GovernanceSession;
    recordRuntimeInvocation({
      capabilityId: "governance-evidence",
      operationId: "get-governance-session",
      sourceRef: "GovernanceEvidenceService.getGovernanceSession",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        sessionId: result.session_id,
        sessionDigest: result.session_digest,
      },
    });
    return result;
  }

  getAttestationPolicy(): JsonRecord {
    const location = this.catalog.resolve("attestationPolicy");
    const result = asJsonRecord(
      readArtifact(location.path, location.kind),
      location.kind,
    );
    const frameworkId =
      result.trust_framework !== null &&
      typeof result.trust_framework === "object" &&
      !Array.isArray(result.trust_framework)
        ? String(
            (result.trust_framework as Record<string, unknown>).framework_id ??
              "",
          )
        : "";
    if (frameworkId.length > 0) {
      trustFrameworkService.getFramework(frameworkId);
    }
    recordRuntimeInvocation({
      capabilityId: "governance-evidence",
      operationId: "get-attestation-policy",
      sourceRef: "GovernanceEvidenceService.getAttestationPolicy",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        policyId: result.policy_id,
        profile: result.profile,
      },
    });
    return result;
  }

  getLawResults(): JsonArtifact {
    const location = this.catalog.resolve("lawResults");
    const result = readArtifact(location.path, location.kind);
    recordRuntimeInvocation({
      capabilityId: "governance-evidence",
      operationId: "get-law-results",
      sourceRef: "GovernanceEvidenceService.getLawResults",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        resultCount: Array.isArray(result) ? result.length : 0,
      },
    });
    return result;
  }

  getEvidencePackages(): JsonArtifact {
    const location = this.catalog.resolve("evidencePackages");
    const result = readArtifact(location.path, location.kind);
    recordRuntimeInvocation({
      capabilityId: "governance-evidence",
      operationId: "get-evidence-packages",
      sourceRef: "GovernanceEvidenceService.getEvidencePackages",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        packageCount: Array.isArray(result) ? result.length : 0,
      },
    });
    return result;
  }

  getCertificates(): JsonArtifact {
    const location = this.catalog.resolve("certificates");
    const result = readArtifact(location.path, location.kind);
    recordRuntimeInvocation({
      capabilityId: "governance-evidence",
      operationId: "get-certificates",
      sourceRef: "GovernanceEvidenceService.getCertificates",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        certificateCount: Array.isArray(result) ? result.length : 0,
      },
    });
    return result;
  }

  getAttestations(): JsonArtifact {
    const location = this.catalog.resolve("attestations");
    const result = readArtifact(location.path, location.kind);
    recordRuntimeInvocation({
      capabilityId: "governance-evidence",
      operationId: "get-attestations",
      sourceRef: "GovernanceEvidenceService.getAttestations",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        attestationCount: Array.isArray(result) ? result.length : 0,
      },
    });
    return result;
  }

  getProofBundle(): JsonRecord {
    const location = this.catalog.resolve("proofBundle");
    const result = asJsonRecord(
      readArtifact(location.path, location.kind),
      location.kind,
    );
    recordRuntimeInvocation({
      capabilityId: "governance-evidence",
      operationId: "get-proof-bundle",
      sourceRef: "GovernanceEvidenceService.getProofBundle",
      success: true,
      input: { kind: location.kind, path: location.path },
      result: {
        bundleId: result.bundle_id,
        bundleDigest: result.bundle_digest,
      },
    });
    return result;
  }
}

export const governanceEvidenceArtifactCatalog =
  new GovernanceEvidenceArtifactCatalogFileSystem();
export const governanceEvidenceService = new GovernanceEvidenceService();
