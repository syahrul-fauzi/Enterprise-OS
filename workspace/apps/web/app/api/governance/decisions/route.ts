// NON-GOLDEN-SPINE ROUTE - DISABLED TO PREVENT NEXT.JS COMPILATION
import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({disabled: true}); }
/*
    // Direct canonical invocation of DeliveryDecisionGatewayService
    const output = gateway.submitDecision(payload, session);
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    console.error("[governance API] Decision submission failed:", error);
    return NextResponse.json({ error: "Decision submission failed", details: (error as Error).message }, { status: 500 });
  }
*/

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const requirementId = searchParams.get("requirementId");

    // Session check for all read operations
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    if (productId) {
      const decisions = gateway.getDecisionsForProduct(productId);
      return NextResponse.json({ decisions }, { status: 200 });
    } else if (requirementId) {
      const decisions = gateway.getDecisionsForRequirement(requirementId);
      return NextResponse.json({ decisions }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Either productId or requirementId is required" }, { status: 400 });
    }
  } catch (error) {
    console.error("[governance API] Decision query failed:", error);
    return NextResponse.json({ error: "Decision query failed", details: (error as Error).message }, { status: 500 });
  }
}