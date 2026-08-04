#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { resolve } from "node:path";

const baseUrl = process.argv[2]?.trim();

if (!baseUrl) {
  process.stderr.write(
    "Usage: node scripts/apps-web-staging-acceptance.mjs <base-url>\n" +
      "Example: node scripts/apps-web-staging-acceptance.mjs https://apps-web-staging.vercel.app\n",
  );
  process.exit(1);
}

const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
const acceptanceProductId =
  process.env.EOS_ACCEPTANCE_PRODUCT_ID?.trim() || "services-id";
const requireProductContext =
  process.env.EOS_ACCEPTANCE_REQUIRE_PRODUCT_CONTEXT?.trim() === "1";
const acceptanceHostHeader =
  process.env.EOS_ACCEPTANCE_HOST_HEADER?.trim() || null;
const acceptanceTlsInsecure =
  process.env.EOS_ACCEPTANCE_TLS_INSECURE?.trim() === "1";
const outputDir = resolve(
  process.cwd(),
  `products/${acceptanceProductId}/evidence/verification/staging-acceptance`,
);
mkdirSync(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(response) {
  return JSON.parse(await response.text());
}

const cookieJar = [];

function storeCookies(response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return;

  const firstPair = raw.split(";")[0];
  if (!firstPair.includes("=")) return;

  const [name] = firstPair.split("=", 1);
  const existingIndex = cookieJar.findIndex((entry) => entry.startsWith(`${name}=`));
  if (existingIndex >= 0) {
    cookieJar.splice(existingIndex, 1, firstPair);
  } else {
    cookieJar.push(firstPair);
  }
}

function buildHeaders(extra = {}) {
  const headers = new Headers(extra);
  if (cookieJar.length > 0) {
    headers.set("cookie", cookieJar.join("; "));
  }
  if (acceptanceHostHeader) {
    headers.set("host", acceptanceHostHeader);
  }
  return headers;
}

function createResponseObject(input) {
  return {
    status: input.status,
    headers: {
      get(name) {
        const value = input.headers.get(name.toLowerCase());
        if (Array.isArray(value)) {
          return value.join(", ");
        }
        return value ?? null;
      },
    },
    async text() {
      return input.body;
    },
    async json() {
      return JSON.parse(input.body);
    },
  };
}

async function request(path, init = {}) {
  const url = new URL(`${normalizedBaseUrl}${path}`);
  const isHttps = url.protocol === "https:";
  const client = isHttps ? https : http;
  const headers = buildHeaders(init.headers);

  return await new Promise((resolvePromise, rejectPromise) => {
    const req = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: init.method ?? "GET",
        headers: Object.fromEntries(headers.entries()),
        rejectUnauthorized: isHttps ? !acceptanceTlsInsecure : undefined,
        servername: isHttps ? acceptanceHostHeader ?? url.hostname : undefined,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", async () => {
          const response = createResponseObject({
            status: res.statusCode ?? 0,
            headers: new Map(
              Object.entries(res.headers).map(([key, value]) => [key.toLowerCase(), value ?? null]),
            ),
            body: Buffer.concat(chunks).toString("utf8"),
          });

          storeCookies(response);

          const location = response.headers.get("location");
          if (
            location &&
            response.status >= 300 &&
            response.status < 400 &&
            init.redirect !== "manual"
          ) {
            try {
              const redirectedUrl = new URL(location, `${normalizedBaseUrl}${path}`);
              const redirectedPath = `${redirectedUrl.pathname}${redirectedUrl.search}`;
              const redirectedResponse = await request(redirectedPath, {
                ...init,
                method: "GET",
                body: undefined,
              });
              resolvePromise(redirectedResponse);
              return;
            } catch (error) {
              rejectPromise(error);
              return;
            }
          }

          resolvePromise(response);
        });
      },
    );

    req.on("error", rejectPromise);

    if (init.body) {
      req.write(init.body);
    }

    req.end();
  });
}

const report = {
  baseUrl: normalizedBaseUrl,
  generatedAt: new Date().toISOString(),
  checks: [],
};

function recordCheck(name, status, detail, extra = {}) {
  report.checks.push({
    name,
    status,
    detail,
    ...extra,
  });
}

async function main() {
  const workspaceResponse = await request("/");
  const workspaceHtml = await workspaceResponse.text();
  assert(workspaceResponse.status === 200, "Workspace root did not return HTTP 200.");
  assert(
    workspaceHtml.includes("Professional Workspace"),
    "Workspace root did not render Professional Workspace.",
  );
  recordCheck("open-workspace", "pass", "Workspace root returned 200 and rendered surface.");

  const sessionResponse = await request("/api/session");
  const sessionPayload = await readJson(sessionResponse);
  assert(sessionResponse.status === 200, "Session endpoint did not return HTTP 200.");
  assert(sessionPayload.authenticated === true, "Session endpoint did not bootstrap authentication.");
  assert(
    typeof sessionResponse.headers.get("x-eos-tenant-id") === "string",
    "Session endpoint did not emit tenant context header.",
  );
  if (requireProductContext) {
    assert(
      sessionResponse.headers.get("x-eos-product-id") === acceptanceProductId,
      `Session endpoint did not resolve product ${acceptanceProductId}.`,
    );
    assert(
      sessionPayload.product?.productId === acceptanceProductId,
      `Session payload did not expose product ${acceptanceProductId}.`,
    );
  }
  recordCheck("workspace-context", "pass", "Session endpoint returned authenticated context.", {
    actorId: sessionPayload.session.actorId,
    tenantId: sessionPayload.session.tenantId,
    workspaceId: sessionPayload.session.workspaceId,
    requestId: sessionPayload.request.requestId,
    productId: sessionPayload.product?.productId ?? null,
  });

  const requirementsPageResponse = await request("/requirements");
  const requirementsHtml = await requirementsPageResponse.text();
  assert(requirementsPageResponse.status === 200, "Requirement page did not return HTTP 200.");
  assert(
    requirementsHtml.includes("Requirement Workspace"),
    "Requirement page did not render Requirement Workspace.",
  );
  recordCheck("open-requirement", "pass", "Requirement page returned 200 and rendered the experience.");

  const createResponse = await request("/api/requirements", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      title: "staging acceptance requirement",
      owner: "staging-operator",
      linkedCapabilityIds: ["requirement-management"],
      acceptanceCriteria: ["Requirement survives refresh", "Requirement can be approved"],
    }),
  });
  const created = await readJson(createResponse);
  assert(createResponse.status === 201, "Create requirement did not return HTTP 201.");
  assert(typeof created.id === "string", "Create requirement did not return an id.");
  if (requireProductContext) {
    assert(
      createResponse.headers.get("x-eos-product-id") === acceptanceProductId,
      `Create requirement did not resolve product ${acceptanceProductId}.`,
    );
  }
  recordCheck("create-requirement", "pass", "Requirement create returned persisted result.", {
    requirementId: created.id,
    tenantId: createResponse.headers.get("x-eos-tenant-id"),
    requestId: createResponse.headers.get("x-eos-request-id"),
    productId: createResponse.headers.get("x-eos-product-id"),
  });

  const readResponse = await request(`/api/requirements/${created.id}`);
  const detail = await readJson(readResponse);
  assert(readResponse.status === 200, "Read requirement did not return HTTP 200.");
  assert(detail.id === created.id, "Read requirement did not return the created requirement.");
  if (requireProductContext) {
    assert(
      readResponse.headers.get("x-eos-product-id") === acceptanceProductId,
      `Read requirement did not resolve product ${acceptanceProductId}.`,
    );
  }
  recordCheck("read-requirement", "pass", "Requirement detail round-trip is consistent.", {
    requirementId: detail.id,
    tenantId: readResponse.headers.get("x-eos-tenant-id"),
    workspaceId: readResponse.headers.get("x-eos-workspace-id"),
    productId: readResponse.headers.get("x-eos-product-id"),
  });

  const updateResponse = await request(`/api/requirements/${created.id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ action: "approve" }),
  });
  const updated = await readJson(updateResponse);
  assert(updateResponse.status === 200, "Update requirement did not return HTTP 200.");
  assert(updated.status === "approved", "Update requirement did not change state to approved.");
  recordCheck("update-requirement", "pass", "Requirement state changed through workflow action.", {
    requirementId: created.id,
    workflowStatus: updated.status,
  });

  const listResponse = await request(
    `/api/requirements?owner=staging-operator&linkedCapabilityId=requirement-management`,
  );
  const listPayload = await readJson(listResponse);
  assert(listResponse.status === 200, "Requirement search did not return HTTP 200.");
  assert(
    Array.isArray(listPayload.items) &&
      listPayload.items.some((item) => item.id === created.id),
    "Requirement search did not return the created requirement after refresh.",
  );
  recordCheck("refresh-reentry", "pass", "Requirement remained visible after re-entry and search.", {
    requirementId: created.id,
    matched: listPayload.matched,
  });

  const invalidResponse = await request("/api/requirements", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ title: "" }),
  });
  const invalidPayload = await readJson(invalidResponse);
  assert(invalidResponse.status === 400, "Invalid requirement payload did not fail with HTTP 400.");
  assert(invalidPayload.error === "validation_error", "Invalid requirement payload did not return validation_error.");
  recordCheck("error-path", "pass", "Controlled validation failure is exposed correctly.");

  const evidencePath = process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH?.trim() || null;
  recordCheck(
    "audit-evidence",
    evidencePath ? "pass" : "warning",
    evidencePath
      ? "Runtime invocation evidence path is configured for capture."
      : "Runtime invocation evidence capture depends on EOS_RUNTIME_INVOCATION_EVIDENCE_PATH in staging.",
    { evidencePath },
  );

  writeFileSync(
    resolve(outputDir, "apps-web-staging-acceptance-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  const failureReport = {
    baseUrl: normalizedBaseUrl,
    generatedAt: new Date().toISOString(),
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
    checks: report.checks,
  };
  writeFileSync(
    resolve(outputDir, "apps-web-staging-acceptance-report.json"),
    `${JSON.stringify(failureReport, null, 2)}\n`,
    "utf8",
  );
  process.stderr.write(`${failureReport.error}\n`);
  process.exit(1);
});
