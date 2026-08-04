import assert from "node:assert/strict";
import test from "node:test";
import { apiPlatformService } from "../implementation/service";
import { GET as getGovernanceClaims } from "../../../apps/lawyershub/app/api/governance/claims/route";
import { GET as getGovernanceDashboard } from "../../../apps/lawyershub/app/api/governance/dashboard/route";
import { GET as getGovernanceEvidencePackages } from "../../../apps/lawyershub/app/api/governance/evidence-packages/route";
import { GET as getGovernanceHealth } from "../../../apps/lawyershub/app/api/governance/health/route";
import { GET as getGovernanceSummary } from "../../../apps/lawyershub/app/api/governance/summary/route";
import { GET as getPlatform } from "../../../apps/lawyershub/app/api/platform/route";
import { POST as postPlatformQuery } from "../../../apps/lawyershub/app/api/platform/query/route";
import { GET as getConstitutionAttestationPolicy } from "../../../apps/lawyershub/app/api/constitution/attestation-policy/route";
import { GET as getConstitutionAttestations } from "../../../apps/lawyershub/app/api/constitution/attestations/route";
import { GET as getConstitutionCertificates } from "../../../apps/lawyershub/app/api/constitution/certificates/route";
import { GET as getConstitutionClaims } from "../../../apps/lawyershub/app/api/constitution/claims/route";
import { GET as getConstitutionEvidencePackages } from "../../../apps/lawyershub/app/api/constitution/evidence-packages/route";
import { GET as getConstitutionLawResults } from "../../../apps/lawyershub/app/api/constitution/law-results/route";
import { GET as getConstitutionSummary } from "../../../apps/lawyershub/app/api/constitution/summary/route";

const headers = {
  "x-eos-api-key": "eos-dev-key",
  "content-type": "application/json",
} as const;

test("api platform exposes authenticated descriptor", async () => {
  const unauthorized = await getPlatform(
    new Request("http://localhost/api/platform"),
  );
  assert.equal(unauthorized.status, 401);

  const authorized = await getPlatform(
    new Request("http://localhost/api/platform", { headers }),
  );
  assert.equal(authorized.status, 200);

  const payload = await authorized.json();
  assert.equal(payload.id, "api-platform");
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) => endpoint.path === "/api/platform/query",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/governance/claims",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/governance/summary",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/governance/health",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/governance/dashboard",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/constitution/claims",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/governance/attestation-policy",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/governance/law-results",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/governance/evidence-packages",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/governance/certificates",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/governance/attestations",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/governance/proof-bundle",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/constitution/summary",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/constitution/attestation-policy",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/constitution/law-results",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/constitution/evidence-packages",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/constitution/certificates",
    ),
  );
  assert.ok(
    payload.endpoints.some(
      (endpoint: { path: string }) =>
        endpoint.path === "/api/constitution/attestations",
    ),
  );
});

test("api platform service executes stable cross-capability queries", () => {
  const descriptor = apiPlatformService.getDescriptor();
  assert.ok(descriptor.capabilities.includes("workflow-engine"));

  const requirements = apiPlatformService.executeQuery({
    resource: "requirements",
    operation: "search",
    params: { linkedCapabilityId: "EOS-001" },
  });
  assert.ok((requirements.result as { matched: number }).matched >= 1);

  const workflows = apiPlatformService.executeQuery({
    resource: "workflows",
    operation: "execute",
    params: {
      workflowId: "requirement-delivery-readiness",
      requirementId: "req-003",
    },
  });
  assert.equal((workflows.result as { status: string }).status, "passed");

  const governanceClaims = apiPlatformService.executeQuery({
    resource: "governance",
    operation: "get",
    params: { readModel: "claims" },
  });
  assert.equal((governanceClaims.result as { status: string }).status, "PASS");

  const governanceSummary = apiPlatformService.executeQuery({
    resource: "governance",
    operation: "get",
    params: { readModel: "summary" },
  });
  assert.equal(
    typeof (governanceSummary.result as { claim_count: number }).claim_count,
    "number",
  );

  const governanceHealth = apiPlatformService.executeQuery({
    resource: "governance",
    operation: "get",
    params: { readModel: "health" },
  });
  assert.equal(
    typeof (governanceHealth.result as { health_status: string }).health_status,
    "string",
  );

  const delivery = apiPlatformService.executeQuery({
    resource: "delivery",
    operation: "search",
    params: { coverage: "all", verificationStatus: "passed" },
  });
  const deliveryResult = delivery.result as {
    matched: number;
    items: Array<{
      requirementId: string;
      verificationStatus: string;
      evidence: { matchedCount: number };
      traceability: { complete: boolean };
    }>;
    summary: { evidenceBackedCount: number };
  };
  assert.ok(deliveryResult.matched >= 1);
  assert.ok(deliveryResult.items.some((item) => item.requirementId === "req-003"));
  assert.ok(
    deliveryResult.items.every((item) => item.verificationStatus === "passed"),
  );
  assert.ok(
    deliveryResult.items.some(
      (item) => item.evidence.matchedCount > 0 && item.traceability.complete,
    ),
  );
  assert.ok(deliveryResult.summary.evidenceBackedCount >= 1);
});

test("api platform query route executes authenticated workflow query", async () => {
  const response = await postPlatformQuery(
    new Request("http://localhost/api/platform/query", {
      method: "POST",
      headers,
      body: JSON.stringify({
        resource: "evidence",
        operation: "search",
        params: { runId: "run-007" },
      }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.resource, "evidence");
  assert.ok(payload.result.matched >= 1);
});

test("api platform query route executes delivery slice query", async () => {
  const response = await postPlatformQuery(
    new Request("http://localhost/api/platform/query", {
      method: "POST",
      headers,
      body: JSON.stringify({
        resource: "delivery",
        operation: "search",
        params: { verificationStatus: "passed", coverage: "all" },
      }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.resource, "delivery");
  assert.ok(payload.result.matched >= 1);
  assert.ok(
    payload.result.items.some(
      (item: { requirementId: string }) => item.requirementId === "req-003",
    ),
  );
});

test("governance summary route exposes read-model summary view", async () => {
  const response = await getGovernanceSummary(
    new Request("http://localhost/api/governance/summary", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.view_kind, "summary");
  assert.equal(typeof payload.view_digest, "string");
  assert.equal(typeof payload.status, "string");
  assert.equal(typeof payload.claim_count, "number");
  assert.equal(Array.isArray(payload.claims), false);
});

test("governance claims route exposes read-model claims view", async () => {
  const response = await getGovernanceClaims(
    new Request("http://localhost/api/governance/claims", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.view_kind, "claims");
  assert.equal(typeof payload.view_digest, "string");
  assert.equal(typeof payload.status, "string");
  assert.ok(Array.isArray(payload.claims));
});

test("governance health route exposes derived health view", async () => {
  const response = await getGovernanceHealth(
    new Request("http://localhost/api/governance/health", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.view_kind, "health");
  assert.equal(typeof payload.view_digest, "string");
  assert.equal(typeof payload.health_status, "string");
  assert.equal(typeof payload.governance_status, "string");
  assert.equal(typeof payload.constitutional_digest, "string");
});

test("governance dashboard route exposes derived dashboard view", async () => {
  const response = await getGovernanceDashboard(
    new Request("http://localhost/api/governance/dashboard", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.view_kind, "dashboard");
  assert.equal(typeof payload.view_digest, "string");
  assert.equal(typeof payload.status, "string");
  assert.equal(typeof payload.claim_count, "number");
  assert.ok(Array.isArray(payload.highlighted_claims));
});

test("governance evidence-packages route exposes immutable evidence aggregates", async () => {
  const response = await getGovernanceEvidencePackages(
    new Request("http://localhost/api/governance/evidence-packages", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(Array.isArray(payload), true);
  assert.equal(payload[0]?.package_scope, "single_law_evaluation");
  assert.equal(typeof payload[0]?.package_digest, "string");
  assert.equal(Array.isArray(payload[0]?.result_ids), true);
});

test("constitution claims route exposes presentation-safe governance summary", async () => {
  const response = await getConstitutionClaims(
    new Request("http://localhost/api/constitution/claims", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(typeof payload.status, "string");
  assert.equal(typeof payload.claim_count, "number");
  assert.equal(typeof payload.constitutional_digest, "string");
  assert.ok(Array.isArray(payload.claims));
});

test("constitution summary route exposes reporting-safe governance summary", async () => {
  const response = await getConstitutionSummary(
    new Request("http://localhost/api/constitution/summary", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(typeof payload.status, "string");
  assert.equal(typeof payload.claim_count, "number");
  assert.equal(typeof payload.proof_strength, "string");
  assert.equal(typeof payload.constitutional_digest, "string");
  assert.equal(Array.isArray(payload.claims), false);
});

test("constitution law-results route exposes evaluation artifacts", async () => {
  const response = await getConstitutionLawResults(
    new Request("http://localhost/api/constitution/law-results", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(Array.isArray(payload), true);
  assert.equal(typeof payload[0]?.result_digest, "string");
  assert.equal(typeof payload[0]?.evaluation?.status, "string");
});

test("constitution evidence-packages route exposes frozen package identities", async () => {
  const response = await getConstitutionEvidencePackages(
    new Request("http://localhost/api/constitution/evidence-packages", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(Array.isArray(payload), true);
  assert.equal(typeof payload[0]?.package_id, "string");
  assert.equal(typeof payload[0]?.proof_fragments_digest, "string");
  assert.equal(Array.isArray(payload[0]?.law_ids), true);
});

test("constitution attestation-policy route exposes trust posture policy", async () => {
  const response = await getConstitutionAttestationPolicy(
    new Request("http://localhost/api/constitution/attestation-policy", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(typeof payload.policy_id, "string");
  assert.equal(typeof payload.policy_digest, "string");
  assert.equal(typeof payload.profile, "string");
  assert.equal(payload.signature?.status, "SIGNED");
});

test("constitution certificates route exposes immutable certificate identities", async () => {
  const response = await getConstitutionCertificates(
    new Request("http://localhost/api/constitution/certificates", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(Array.isArray(payload), true);
  assert.equal(typeof payload[0]?.certificate_digest, "string");
  assert.equal(typeof payload[0]?.package_id, "string");
  assert.equal("signature" in (payload[0] ?? {}), false);
});

test("constitution attestations route exposes trust artifacts", async () => {
  const response = await getConstitutionAttestations(
    new Request("http://localhost/api/constitution/attestations", {
      headers: {
        "x-eos-api-key": "eos-dev-key",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(Array.isArray(payload), true);
  assert.equal(payload[0]?.event_type, "AttestationCreated");
  assert.equal(payload[1]?.event_type, "AttestationVerified");
  assert.equal(payload[1]?.attestation_status, "VERIFIED");
  assert.equal(typeof payload[0]?.certificate_id, "string");
  assert.equal(typeof payload[0]?.policy_digest, "string");
  assert.equal(typeof payload[0]?.attestation_reference, "string");
});

test("api platform query route validates constitution artifact selector", async () => {
  const invalid = await postPlatformQuery(
    new Request("http://localhost/api/platform/query", {
      method: "POST",
      headers,
      body: JSON.stringify({
        resource: "constitution",
        operation: "get",
        params: { artifact: "report" },
      }),
    }),
  );
  assert.equal(invalid.status, 400);

  const invalidBundle = await postPlatformQuery(
    new Request("http://localhost/api/platform/query", {
      method: "POST",
      headers,
      body: JSON.stringify({
        resource: "constitution",
        operation: "get",
        params: { artifact: "proofBundle" },
      }),
    }),
  );
  assert.equal(invalidBundle.status, 400);

  const valid = await postPlatformQuery(
    new Request("http://localhost/api/platform/query", {
      method: "POST",
      headers,
      body: JSON.stringify({
        resource: "constitution",
        operation: "get",
        params: { artifact: "summary" },
      }),
    }),
  );
  assert.equal(valid.status, 200);
  const payload = await valid.json();
  assert.equal(payload.resource, "constitution");
  assert.equal(typeof payload.result.constitutional_digest, "string");
});

test("api platform query route supports governance read models", async () => {
  const valid = await postPlatformQuery(
    new Request("http://localhost/api/platform/query", {
      method: "POST",
      headers,
      body: JSON.stringify({
        resource: "governance",
        operation: "get",
        params: { readModel: "dashboard" },
      }),
    }),
  );

  assert.equal(valid.status, 200);
  const payload = await valid.json();
  assert.equal(payload.resource, "governance");
  assert.ok(Array.isArray(payload.result.highlighted_claims));

  const invalid = await postPlatformQuery(
    new Request("http://localhost/api/platform/query", {
      method: "POST",
      headers,
      body: JSON.stringify({
        resource: "governance",
        operation: "get",
        params: { readModel: "proofBundle" },
      }),
    }),
  );
  assert.equal(invalid.status, 400);
});
