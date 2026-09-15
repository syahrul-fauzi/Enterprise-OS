import { NextResponse } from "next/server";

// Case data for EOS channel break test - case-014: Pendirian PT ABC
// This is the SAME WORK that all communication events are bound to
export async function GET(request: Request) {
  const tenantId = request.headers.get("x-tenant-id") || "tenant-001";
  const workspaceId = request.headers.get("x-workspace-id") || "workspace-001";

  return NextResponse.json({
    id: "case-014",
    workId: "case-014", // Same ID across all systems - EOS core invariant
    tenant_id: tenantId,
    workspace_id: workspaceId,
    title: "Pendirian PT ABC",
    description: "Proses pendirian perusahaan PT ABC oleh customer, dengan bantuan lawyer dan notaris",
    status: "in_progress",
    lawyerId: "lawyer-001",
    customerId: "customer-001",
    notaryId: "notary-001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _eos_note: "This is the single work instance that all communication events are bound to. EOS keeps work connected across channels, actors, and external systems."
  });
}