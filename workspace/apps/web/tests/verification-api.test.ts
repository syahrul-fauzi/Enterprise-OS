// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
// NOTE: Test references unmigrated route — ../app/api/requirements/[id]/verification/route.js does not exist yet
import { GET as getVerification } from "../app/api/requirements/[id]/verification/route.js";
// NOTE: Test references unmigrated route — ../app/api/requirements/[id]/proof/route.js does not exist yet
import { GET as getProof } from "../app/api/requirements/[id]/proof/route.js";
import {
  WORKSPACE_SESSION_COOKIE,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "../lib/workspace-session.js";

const sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession(
  createAnonymousWorkspaceSession(),
)}`;
const productHeaders = {
  "x-eos-product-id": "lawyershub",
  "x-eos-product-domain": "staging.lawyershub.id",
  "x-forwarded-host": "staging.lawyershub.id",
};

test("apps/web verification API computes a passed verdict for evidence-backed requirement", async () => {
  const response = await getVerification(
    new Request("http://localhost/api/requirements/req-003/verification", {
      headers: {
        cookie: sessionCookie,
        ...productHeaders,
      },
    }),
    {
      params: Promise.resolve({ id: "req-003" }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-eos-product-id"), "lawyershub");
  const payload = await response.json();
  assert.equal(payload.requirementId, "req-003");
  assert.equal(payload.verdict, "passed");
  assert.equal(payload.lifecycleEligible, true);
  assert.equal(payload.registryProjection.traceabilityComplete, true);
  assert.ok(payload.registryProjection.evidenceMatchedCount > 0);
  assert.equal(typeof payload.decisionFingerprint, "string");
});

test("apps/web verification API computes a failed verdict when lifecycle is incomplete", async () => {
  const response = await getVerification(
    new Request("http://localhost/api/requirements/req-001/verification", {
      headers: {
        cookie: sessionCookie,
        ...productHeaders,
      },
    }),
    {
      params: Promise.resolve({ id: "req-001" }),
    },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.requirementId, "req-001");
  assert.equal(payload.verdict, "failed");
  assert.equal(payload.lifecycleEligible, false);
});

test("apps/web proof API computes a proof object for an evidence-backed requirement", async () => {
  const response = await getProof(
    new Request("http://localhost/api/requirements/req-003/proof", {
      headers: {
        cookie: sessionCookie,
        ...productHeaders,
      },
    }),
    {
      params: Promise.resolve({ id: "req-003" }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-eos-product-id"), "lawyershub");
  const payload = await response.json();
  assert.equal(payload.requirementId, "req-003");
  assert.equal(payload.predicateId, "requirement-verification");
  assert.equal(payload.decision, "passed");
  assert.match(payload.proofId, /^verification-decision-proof:req-003:/);
  assert.equal(typeof payload.proofDigest, "string");
  assert.ok(payload.provenance.evidencePaths.length > 0);
  assert.ok(payload.provenance.evidenceIds.length > 0);
});