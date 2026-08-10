import { NextResponse } from "next/server";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "@repo/presentation-experience";

export async function GET(request: Request) {
  const productContext = readProductContextFromRequest(request);
  const headers = applyProductContextHeaders({
    headers: new Headers(),
    productContext,
  });

  return NextResponse.json(
    {
      status: "ok",
      service: "apps/web",
      product: productContext,
    },
    { headers },
  );
}