import { NextResponse } from "next/server";
import { z } from "zod";
import { apiPlatformService } from "../../../../../../capabilities/api-platform/implementation/services/api-platform.service";
import { securityHardeningService } from "../../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

const ApiPlatformQuerySchema = z.union([
  z.object({
    resource: z.literal("governance"),
    operation: z.literal("get"),
    params: z.object({
      readModel: z.enum(["summary", "claims", "health", "dashboard"]),
    }),
  }),
  z.object({
    resource: z.literal("constitution"),
    operation: z.literal("get"),
    params: z.object({
      artifact: z.enum(["claims", "summary"]),
    }),
  }),
  z.object({
    resource: z.enum(["requirements", "rtm", "evidence", "workflows"]),
    operation: z.enum(["search", "get", "execute", "list"]),
    params: z.record(z.string(), z.unknown()).optional(),
  }),
]);

export async function POST(request: Request) {
  const decision = securityHardeningService.authorize(
    request,
    "platform.query",
  );
  if (!decision.allowed) {
    return NextResponse.json(
      {
        error: decision.status === 401 ? "unauthorized" : "forbidden",
        detail: decision.reason,
      },
      { status: decision.status },
    );
  }

  const raw = await request.json();
  const parsed = ApiPlatformQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = apiPlatformService.executeQuery(parsed.data);
    return NextResponse.json(result);
  } catch (rawError) {
    const detail =
      rawError instanceof Error ? rawError.message : String(rawError);
    return NextResponse.json(
      { error: "query_failed", detail },
      { status: 400 },
    );
  }
}
