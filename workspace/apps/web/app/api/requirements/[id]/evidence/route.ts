import { NextResponse } from "next/server";
import { WORKSPACE_SESSION_COOKIE } from "@repo/core-constants";
import { decodeWorkspaceSession } from "../../../../../../capabilities/identity/implementation/services/session.service";
import { registry } from "../../../../../../workspace.manifest";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const requirementId = params.id;
  const cookie = _request.headers.get("Cookie");
  const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
  
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = decodeWorkspaceSession(sessionCookie.split("=")[1]);
    const authenticatedPayload = { 
      requirementRef: requirementId,
      ...session 
    };

    const { output } = registry.invoke(
      "evidence-registry", 
      "evidence.search", 
      authenticatedPayload
    );

    return NextResponse.json({ 
      evidenceItems: output.items,
      total: output.total,
      matched: output.matched,
      summary: output.summary
    }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch requirement evidence:", error);
    return NextResponse.json({ error: "Failed to retrieve evidence" }, { status: 500 });
  }
}