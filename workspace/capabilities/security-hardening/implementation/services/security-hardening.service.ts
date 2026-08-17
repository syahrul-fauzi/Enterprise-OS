import type {
  AuthorizationDecision,
  EosScope,
  SecurityConfigSummary,
} from "../contracts/index.js";
import { recordRuntimeInvocation } from "@repo/core-runtime";

const DEFAULT_KEY = "eos-dev-key";
const DEFAULT_SCOPES: readonly EosScope[] = [
  "platform.read",
  "platform.query",
  "constitution.read",
  "connectors.read",
  "connectors.sync",
  "graph.read",
  "orchestration.read",
  "orchestration.dispatch",
  "observability.read",
] as const;

function parseScopes(raw: string | undefined): readonly EosScope[] {
  if (!raw?.trim()) {
    return DEFAULT_SCOPES;
  }

  const allowed = new Set<EosScope>(DEFAULT_SCOPES);
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is EosScope => allowed.has(item as EosScope));
}

export class SecurityHardeningService {
  getConfigSummary(): SecurityConfigSummary {
    const strictMode =
      process.env.EOS_STRICT_AUTH === "true" || process.env.NODE_ENV === "production";
    const secretSource = process.env.EOS_API_KEY?.trim()
      ? "environment"
      : strictMode
        ? "missing"
        : "development-default";

    return {
      strictMode,
      secretSource,
      scopes: parseScopes(process.env.EOS_API_KEY_SCOPES),
    };
  }

  getExpectedApiKey(): string | undefined {
    const summary = this.getConfigSummary();
    if (summary.secretSource === "environment") {
      return process.env.EOS_API_KEY?.trim();
    }
    if (summary.secretSource === "development-default") {
      return DEFAULT_KEY;
    }
    return undefined;
  }

  authorize(request: Request, scope: EosScope): AuthorizationDecision {
    const expected = this.getExpectedApiKey();
    const input = {
      scope,
      hasApiKey: request.headers.get("x-eos-api-key") !== null,
      hasBearer: request.headers.get("authorization") !== null,
      strictMode: this.getConfigSummary().strictMode,
    };
    if (!expected) {
      const result: AuthorizationDecision = {
        allowed: false,
        status: 401,
        reason: "API key is not configured for strict mode.",
        scope,
      };
      recordRuntimeInvocation({
        capabilityId: "security-hardening",
        operationId: "authorize",
        sourceRef: "SecurityHardeningService.authorize",
        success: false,
        input,
        result,
      });
      return result;
    }

    const apiKey = request.headers.get("x-eos-api-key")?.trim();
    const bearer = request.headers.get("authorization")?.trim();
    const presented =
      apiKey ??
      (bearer?.startsWith("Bearer ") ? bearer.slice("Bearer ".length).trim() : undefined);

    if (presented !== expected) {
      const result: AuthorizationDecision = {
        allowed: false,
        status: 401,
        reason: "Missing or invalid API key.",
        scope,
      };
      recordRuntimeInvocation({
        capabilityId: "security-hardening",
        operationId: "authorize",
        sourceRef: "SecurityHardeningService.authorize",
        success: false,
        input,
        result,
      });
      return result;
    }

    const scopes = new Set(this.getConfigSummary().scopes);
    if (!scopes.has(scope)) {
      const result: AuthorizationDecision = {
        allowed: false,
        status: 403,
        reason: `API key is missing required scope ${scope}.`,
        scope,
      };
      recordRuntimeInvocation({
        capabilityId: "security-hardening",
        operationId: "authorize",
        sourceRef: "SecurityHardeningService.authorize",
        success: false,
        input,
        result,
      });
      return result;
    }

    const result: AuthorizationDecision = {
      allowed: true,
      status: 200,
      reason: "authorized",
      scope,
    };
    recordRuntimeInvocation({
      capabilityId: "security-hardening",
      operationId: "authorize",
      sourceRef: "SecurityHardeningService.authorize",
      success: true,
      input,
      result,
    });
    return result;
  }
}

export const securityHardeningService = new SecurityHardeningService();

export * from "../contracts/index.js";
