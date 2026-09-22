import { NextResponse } from "next/server";
import { cookies } from "next/headers";
// Reuse 100% of internal customer price acceptance logic with external buyer validation
import { POST as internalPost } from "../../../../service-requests/[id]/customer-accept-price/route";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // Add minimal external buyer validation before delegating to internal logic
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("workspace_session");
  if (!sessionCookie) {
    return NextResponse.json({ error: "External buyer session required" }, { status: 401 });
  }
  // Delegate all acceptance logic to existing internal endpoint (full reuse)
  return internalPost(request, { params });
}