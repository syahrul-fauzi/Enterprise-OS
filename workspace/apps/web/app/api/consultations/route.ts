import { NextResponse } from "next/server";
import { WORKSPACE_SESSION_COOKIE } from "@repo/core-constants";
import { decodeWorkspaceSession } from "../../../../capabilities/identity/implementation/services/session.service";
import { registry } from "../../../../workspace.manifest";

export async function POST(request: Request) {
  const cookie = request.headers.get("Cookie");
  const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
  
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = decodeWorkspaceSession(sessionCookie.split("=")[1]);
    const body = await request.json();
    
    // Combine session context with request body for tenant isolation
    const authenticatedPayload = {
      ...body,
      ...session
    };

    const { output } = registry.invoke(
      "consultation",
      "consultation.create",
      authenticatedPayload
    );

    return NextResponse.json({ consultation: output }, { status: 201 });
  } catch (error) {
    console.error("Failed to create consultation:", error);
    return NextResponse.json({ 
      error: "Failed to create consultation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || undefined;
  const status = searchParams.get("status") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

  const cookie = request.headers.get("Cookie");
  const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
  
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = decodeWorkspaceSession(sessionCookie.split("=")[1]);
    
    const authenticatedPayload = {
      query,
      status,
      priority,
      limit,
      offset,
      ...session
    };

    const { output } = registry.invoke(
      "consultation",
      "consultation.listByWorkspace",
      authenticatedPayload
    );

    return NextResponse.json({ consultations: output.items, total: output.total }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch consultations:", error);
    return NextResponse.json({ error: "Failed to retrieve consultations" }, { status: 500 });
  }
}