"use server";

import { NextRequest, NextResponse } from "next/server";
import { readProductContextFromRequest } from "@repo/presentation/src/product-context.js";
import { createServiceRequestBatch } from "../../../../capabilities/service-directory/implementation/usecases/batch-create-service-requests.usecase.js";
import { validateSessionContext } from "../../../../packages/auth/src/validate-session.js";

export async function POST(request: NextRequest) {
  try {
    // 1. Extract product context from host header (multi-tenant isolation)
    const product = readProductContextFromRequest(request);
    
    // 2. Validate session to ensure actor is authorized
    const body = await request.json();
    const session = validateSessionContext(body);
    if (!session.valid) {
      return NextResponse.json({ error: "Unauthorized - invalid session" }, { status: 401 });
    }

    // 3. Validate batch items structure
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Invalid batch items: must provide non-empty array" }, { status: 400 });
    }

    // 4. Execute batch creation usecase (maintains business rules integrity)
    const createdIds = await createServiceRequestBatch({
      items: body.items,
      context: {
        product: product.id,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        actorId: session.actorId,
      }
    });

    // 5. Return success with created resource IDs
    return NextResponse.json({ 
      success: true,
      created: createdIds.length,
      ids: createdIds,
      product: product
    });
  } catch (error) {
    console.error("[API] Batch create service request failed:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}