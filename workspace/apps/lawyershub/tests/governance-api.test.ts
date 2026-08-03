import assert from "node:assert/strict";
import test from "node:test";
import { GET as getGovernanceAttestationPolicy } from "../app/api/governance/attestation-policy/route";
import { GET as getGovernanceAttestations } from "../app/api/governance/attestations/route";
import { GET as getGovernanceCertificates } from "../app/api/governance/certificates/route";
import { GET as getGovernanceEvidencePackages } from "../app/api/governance/evidence-packages/route";
import { GET as getGovernanceLawResults } from "../app/api/governance/law-results/route";
import { GET as getGovernanceProofBundle } from "../app/api/governance/proof-bundle/route";
import { GET as getGovernanceReport } from "../app/api/governance/report/route";
import { GET as getGovernanceSession } from "../app/api/governance/session/route";
import { GET as getGovernanceSummary } from "../app/api/governance/summary/route";
import { GET as getGovernanceDashboard } from "../app/api/governance/dashboard/route";

const headers = {
  "x-eos-api-key": "eos-dev-key",
} as const;

test("governance evidence API exposes auditor-facing evidence artifacts", async () => {
  const [
    report,
    session,
    attestationPolicy,
    attestations,
    lawResults,
    evidencePackages,
    certificates,
    proofBundle,
    summary,
    dashboard,
  ] = await Promise.all([
    getGovernanceReport(new Request("http://localhost/api/governance/report", { headers })),
    getGovernanceSession(new Request("http://localhost/api/governance/session", { headers })),
    getGovernanceAttestationPolicy(
      new Request("http://localhost/api/governance/attestation-policy", { headers }),
    ),
    getGovernanceAttestations(
      new Request("http://localhost/api/governance/attestations", { headers }),
    ),
    getGovernanceLawResults(
      new Request("http://localhost/api/governance/law-results", { headers }),
    ),
    getGovernanceEvidencePackages(
      new Request("http://localhost/api/governance/evidence-packages", { headers }),
    ),
    getGovernanceCertificates(
      new Request("http://localhost/api/governance/certificates", { headers }),
    ),
    getGovernanceProofBundle(
      new Request("http://localhost/api/governance/proof-bundle", { headers }),
    ),
    getGovernanceSummary(new Request("http://localhost/api/governance/summary", { headers })),
    getGovernanceDashboard(new Request("http://localhost/api/governance/dashboard", { headers })),
  ]);

  assert.equal(report.status, 200);
  assert.equal(session.status, 200);
  assert.equal(attestationPolicy.status, 200);
  assert.equal(attestations.status, 200);
  assert.equal(lawResults.status, 200);
  assert.equal(evidencePackages.status, 200);
  assert.equal(certificates.status, 200);
  assert.equal(proofBundle.status, 200);
  assert.equal(summary.status, 200);
  assert.equal(dashboard.status, 200);

  const reportPayload = await report.json();
  const sessionPayload = await session.json();
  const attestationPolicyPayload = await attestationPolicy.json();
  const attestationsPayload = await attestations.json();
  const lawResultsPayload = await lawResults.json();
  const evidencePackagesPayload = await evidencePackages.json();
  const certificatesPayload = await certificates.json();
  const proofBundlePayload = await proofBundle.json();
  const summaryPayload = await summary.json();
  const dashboardPayload = await dashboard.json();

  assert.equal(typeof reportPayload.constitutional_digest, "string");
  assert.equal(typeof sessionPayload.session_id, "string");
  assert.equal(typeof attestationPolicyPayload.policy_id, "string");
  assert.ok(Array.isArray(attestationsPayload));
  assert.equal(attestationsPayload[0]?.event_type, "AttestationCreated");
  assert.equal(attestationsPayload[1]?.event_type, "AttestationVerified");
  assert.ok(Array.isArray(lawResultsPayload));
  assert.ok(Array.isArray(evidencePackagesPayload));
  assert.ok(Array.isArray(certificatesPayload));
  assert.equal(typeof proofBundlePayload.bundle_digest, "string");
  assert.equal(summaryPayload.source_session_id, sessionPayload.session_id);
  assert.equal(
    dashboardPayload.source_session_id,
    sessionPayload.session_id,
  );
});
