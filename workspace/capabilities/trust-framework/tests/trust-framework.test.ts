import assert from "node:assert/strict";
import test from "node:test";
import {
  localTrustSignatureProvider,
  trustFrameworkService,
} from "../implementation/service.js";

test("trust framework exposes the signed local development catalog entry", () => {
  const catalog = trustFrameworkService.getFrameworkCatalog();

  assert.equal(typeof catalog.catalog_id, "string");
  assert.ok(
    catalog.frameworks.some(
      (framework) =>
        framework.framework_id === "trust-framework:local-development-signed",
    ),
  );

  const framework = trustFrameworkService.getFramework(
    "trust-framework:local-development-signed",
  );
  assert.equal(framework.status, "DECLARED");
  assert.ok(framework.signature_providers.length >= 1);
});

test("local trust signature provider signs and verifies deterministically", () => {
  const payload_digest = "digest-payload-001";
  const signature = localTrustSignatureProvider.sign({
    certificate_id: "certificate:test",
    attestation_reference: "attestation:test",
    payload_digest,
  });

  assert.equal(signature.signature_status, "SIGNED");

  const verification = localTrustSignatureProvider.verify({
    signature_reference: signature.signature_reference,
    payload_digest,
  });

  assert.equal(verification.verification_status, "VERIFIED");
});
