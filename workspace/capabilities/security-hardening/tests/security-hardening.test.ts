import assert from "node:assert/strict";
import test from "node:test";
import { securityHardeningService } from "../implementation/service.js";
import { GET as getPlatform } from "../../../apps/lawyershub/app/api/platform/route.js";
import { GET as getObservabilityLogs } from "../../../apps/lawyershub/app/api/observability/logs/route.js";
import { GET as getConstitutionClaims } from "../../../apps/lawyershub/app/api/constitution/claims/route.js";

test("security hardening reports missing secret in strict mode", () => {
  const previousStrict = process.env.EOS_STRICT_AUTH;
  const previousKey = process.env.EOS_API_KEY;

  process.env.EOS_STRICT_AUTH = "true";
  delete process.env.EOS_API_KEY;

  const summary = securityHardeningService.getConfigSummary();
  assert.equal(summary.secretSource, "missing");
  assert.equal(summary.strictMode, true);

  if (previousStrict === undefined) {
    delete process.env.EOS_STRICT_AUTH;
  } else {
    process.env.EOS_STRICT_AUTH = previousStrict;
  }
  if (previousKey === undefined) {
    delete process.env.EOS_API_KEY;
  } else {
    process.env.EOS_API_KEY = previousKey;
  }
});

test("security hardening rejects unauthorized requests", async () => {
  const response = await getPlatform(new Request("http://localhost/api/platform"));
  assert.equal(response.status, 401);
});

test("security hardening enforces scopes", async () => {
  const previousScopes = process.env.EOS_API_KEY_SCOPES;
  process.env.EOS_API_KEY_SCOPES = "platform.read";

  const response = await getObservabilityLogs(
    new Request("http://localhost/api/observability/logs", {
      headers: { "x-eos-api-key": "eos-dev-key" },
    }),
  );

  assert.equal(response.status, 403);

  if (previousScopes === undefined) {
    delete process.env.EOS_API_KEY_SCOPES;
  } else {
    process.env.EOS_API_KEY_SCOPES = previousScopes;
  }
});

test("security hardening isolates constitution scope from platform scope", async () => {
  const previousScopes = process.env.EOS_API_KEY_SCOPES;
  process.env.EOS_API_KEY_SCOPES = "platform.read";

  const forbidden = await getConstitutionClaims(
    new Request("http://localhost/api/constitution/claims", {
      headers: { "x-eos-api-key": "eos-dev-key" },
    }),
  );
  assert.equal(forbidden.status, 403);

  process.env.EOS_API_KEY_SCOPES = "constitution.read";

  const allowed = await getConstitutionClaims(
    new Request("http://localhost/api/constitution/claims", {
      headers: { "x-eos-api-key": "eos-dev-key" },
    }),
  );
  assert.equal(allowed.status, 200);

  if (previousScopes === undefined) {
    delete process.env.EOS_API_KEY_SCOPES;
  } else {
    process.env.EOS_API_KEY_SCOPES = previousScopes;
  }
});
