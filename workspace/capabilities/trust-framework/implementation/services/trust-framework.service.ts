import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// import { recordRuntimeInvocation } from "@repo/core-runtime"; // Commented out for governance-evidence standalone execution
import type {
  TrustFramework,
  TrustFrameworkCatalog,
  TrustFrameworkProvider,
  TrustSignatureProviderSPI,
  TrustSignatureReference,
  TrustVerificationResult,
} from "../contracts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = resolve(__dirname, "../../../../");
const TRUST_FRAMEWORK_PATH = resolve(
  WORKSPACE_ROOT,
  "foundation/evidence/verification/trust-framework.json",
);

function readCatalog(): TrustFrameworkCatalog {
  if (!existsSync(TRUST_FRAMEWORK_PATH)) {
    throw new Error(
      `trust_framework_unavailable: missing trust framework artifact at ${TRUST_FRAMEWORK_PATH}. Run foundation verification first.`,
    );
  }

  return JSON.parse(readFileSync(TRUST_FRAMEWORK_PATH, "utf8")) as TrustFrameworkCatalog;
}

function computeLocalSignatureReference(payloadDigest: string): string {
  const signatureDigest = createHash("sha256")
    .update(
      JSON.stringify({
        provider_id: "signature-provider:local",
        signature_scheme: "LOCAL_DIGEST_V1",
        payload_digest: payloadDigest,
      }),
      "utf8",
    )
    .digest("hex");

  return `trust-signature:local:${signatureDigest.slice(0, 16)}`;
}

export class TrustFrameworkService implements TrustFrameworkProvider {
  getFrameworkCatalog(): TrustFrameworkCatalog {
    const result = readCatalog();
    // recordRuntimeInvocation({
    //   capabilityId: "trust-framework",
    //   operationId: "get-framework-catalog",
    //   sourceRef: "TrustFrameworkService.getFrameworkCatalog",
    //   success: true,
    //   input: { path: TRUST_FRAMEWORK_PATH },
    //   result: {
    //     catalogId: result.catalog_id,
    //     frameworkCount: Array.isArray(result.frameworks) ? result.frameworks.length : 0,
    //   },
    // });
    return result;
  }

  getFramework(frameworkId: string): TrustFramework {
    const catalog = readCatalog();
    const framework = catalog.frameworks.find(
      (entry) => entry.framework_id === frameworkId,
    );
    if (!framework) {
      throw new Error(`trust_framework_not_found:${frameworkId}`);
    }
    recordRuntimeInvocation({
      capabilityId: "trust-framework",
      operationId: "get-framework",
      sourceRef: "TrustFrameworkService.getFramework",
      success: true,
      input: { frameworkId, path: TRUST_FRAMEWORK_PATH },
      result: {
        frameworkId: framework.framework_id,
        frameworkDigest: framework.framework_digest,
      },
    });
    return framework;
  }
}

export class LocalTrustSignatureProviderService
  implements TrustSignatureProviderSPI
{
  sign(input: {
    readonly certificate_id: string;
    readonly attestation_reference: string;
    readonly payload_digest: string;
  }): TrustSignatureReference {
    const result: TrustSignatureReference = {
      signature_reference: computeLocalSignatureReference(input.payload_digest),
      provider_id: "signature-provider:local",
      provider_kind: "Local",
      signature_status: "SIGNED",
    };

    recordRuntimeInvocation({
      capabilityId: "trust-framework",
      operationId: "local-signature-sign",
      sourceRef: "LocalTrustSignatureProviderService.sign",
      success: true,
      input,
      result,
    });

    return result;
  }

  verify(input: {
    readonly signature_reference: string;
    readonly payload_digest: string;
  }): TrustVerificationResult {
    const result: TrustVerificationResult = {
      provider_id: "signature-provider:local",
      verification_status:
        input.signature_reference ===
        computeLocalSignatureReference(input.payload_digest)
          ? "VERIFIED"
          : "FAILED",
    };

    recordRuntimeInvocation({
      capabilityId: "trust-framework",
      operationId: "local-signature-verify",
      sourceRef: "LocalTrustSignatureProviderService.verify",
      success: result.verification_status === "VERIFIED",
      input,
      result,
    });

    return result;
  }
}

export const trustFrameworkService = new TrustFrameworkService();
export const localTrustSignatureProvider = new LocalTrustSignatureProviderService();