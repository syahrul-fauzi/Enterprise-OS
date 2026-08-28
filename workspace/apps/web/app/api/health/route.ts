import { NextResponse } from "next/server";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "@repo/presentation-experience";

export async function GET(request: Request) {
  // ULTIMATE TEMPORARY FIX: Manually set all headers to bypass any auto-detection issues
  const host = request.headers.get("host")?.split(":")[0] || "localhost";
  let productId: string | null = null;
  
  if (host?.includes("lawyershub")) productId = "lawyershub";
  else if (host?.includes("services-id")) productId = "services-id";
  else if (host?.includes("indonesialawyersclub")) productId = "ilc";
  
  // Create response first then attach headers to ensure they're properly set in Next.js 16+
  const response = NextResponse.json({
    status: "ok",
    service: "apps/web",
    product: {
      productId,
      productDomain: null,
      requestHost: host,
    },
  });
  
  if (productId) {
    response.headers.set("x-eos-product-id", productId);
  }
  response.headers.set("x-eos-request-host", host);
  
  return response;
}