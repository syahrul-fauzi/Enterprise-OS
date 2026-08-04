#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { resolve } from "node:path";

const domains = [
  {
    productId: "services-id",
    host: process.env.SERVICES_ID_DOMAIN?.trim() || "services-id.com",
  },
  {
    productId: "lawyershub",
    host: process.env.LAWYERSHUB_DOMAIN?.trim() || "lawyershub.id",
  },
  {
    productId:
      process.env.ILC_PRODUCT_ID?.trim() || "ilc",
    host:
      process.env.ILC_DOMAIN?.trim() || "staging.indonesialawyersclub.id",
  },
];

const connectTimeoutMs = Number.parseInt(
  process.env.EOS_PUBLIC_CONVERGENCE_TIMEOUT_MS?.trim() || "10000",
  10,
);

const reportPath = resolve(
  process.cwd(),
  "portfolios/evidence/verification/enterprise/public-convergence-report.json",
);
mkdirSync(resolve(reportPath, ".."), { recursive: true });

const currentMarkers = {
  root: [
    "Turn incoming requests into clear, delivery-ready requirements.",
    "Try Requirement Workspace",
  ],
  requirements: [
    "Requirement Workspace",
    "Capture, review, and move requirements toward delivery.",
  ],
  metadata: [
    "Professional Workspace | Requirement Intake",
    "Capture, review, and advance requirements in a focused workspace built for delivery teams and client-facing operations.",
  ],
};

const legacyMarkers = [
  "EOS Professional Workspace",
  "Canonical Surface Proof",
  "EOS Professional Experience",
  "Open Requirement Experience",
  "Canonical professional experience surface",
];

function requestText(url) {
  const target = new URL(url);
  const client = target.protocol === "https:" ? https : http;

  return new Promise((resolvePromise, rejectPromise) => {
    const req = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: "GET",
        timeout: connectTimeoutMs,
        rejectUnauthorized: true,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", async () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const headers = new Map(
            Object.entries(res.headers).map(([key, value]) => [
              key.toLowerCase(),
              Array.isArray(value) ? value.join(", ") : value ?? "",
            ]),
          );

          const location = headers.get("location");
          if (
            location &&
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400
          ) {
            try {
              const redirected = new URL(location, url).toString();
              resolvePromise(await requestText(redirected));
              return;
            } catch (error) {
              rejectPromise(error);
              return;
            }
          }

          resolvePromise({
            status: res.statusCode ?? 0,
            headers,
            body,
            finalUrl: url,
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Timeout after ${connectTimeoutMs}ms`));
    });
    req.on("error", rejectPromise);
    req.end();
  });
}

function includesAllMarkers(body, markers) {
  return markers.every((marker) => body.includes(marker));
}

function includesAnyMarker(body, markers) {
  return markers.some((marker) => body.includes(marker));
}

async function assessHost(input) {
  const { productId, host } = input;
  const baseUrl = `https://${host}`;

  try {
    const [root, requirements, session] = await Promise.all([
      requestText(`${baseUrl}/`),
      requestText(`${baseUrl}/requirements`),
      requestText(`${baseUrl}/api/session`),
    ]);

    const rootOk = root.status === 200;
    const requirementsOk = requirements.status === 200;
    const sessionOk = session.status === 200;
    const sessionLooksLikeEos =
      session.headers.get("x-eos-tenant-id") === "tenant.default" &&
      session.headers.get("x-eos-workspace-id") ===
        "professional-workspace.default";

    const hasCurrentRoot = includesAllMarkers(root.body, currentMarkers.root);
    const hasCurrentRequirements = includesAllMarkers(
      requirements.body,
      currentMarkers.requirements,
    );
    const hasCurrentMetadata =
      includesAnyMarker(root.body, currentMarkers.metadata) ||
      includesAnyMarker(requirements.body, currentMarkers.metadata);
    const hasLegacySurface =
      includesAnyMarker(root.body, legacyMarkers) ||
      includesAnyMarker(requirements.body, legacyMarkers);

    let classification = "unknown_public_runtime";
    if (!rootOk && !requirementsOk && !sessionOk) {
      classification = "unreachable";
    } else if (sessionLooksLikeEos && hasCurrentRoot && hasCurrentRequirements) {
      classification = "canonical_current_build";
    } else if (sessionLooksLikeEos && hasLegacySurface) {
      classification = "eos_runtime_old_surface";
    } else if (sessionLooksLikeEos) {
      classification = "eos_runtime_noncanonical_surface";
    }

    return {
      productId,
      host,
      classification,
      checks: {
        rootStatus: root.status,
        requirementsStatus: requirements.status,
        sessionStatus: session.status,
        sessionLooksLikeEos,
        hasCurrentRoot,
        hasCurrentRequirements,
        hasCurrentMetadata,
        hasLegacySurface,
      },
    };
  } catch (error) {
    return {
      productId,
      host,
      classification: "unreachable",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const results = await Promise.all(domains.map((domain) => assessHost(domain)));

  const report = {
    generatedAt: new Date().toISOString(),
    timeoutMs: connectTimeoutMs,
    summary: {
      canonicalCurrentBuildCount: results.filter(
        (item) => item.classification === "canonical_current_build",
      ).length,
      oldSurfaceCount: results.filter(
        (item) => item.classification === "eos_runtime_old_surface",
      ).length,
      unreachableCount: results.filter(
        (item) => item.classification === "unreachable",
      ).length,
    },
    results,
  };

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
