"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@repo/presentation-ui-system";
import { ProductDeliveryPage } from '@repo/presentation-widgets';
import { readProductBinding } from '@repo/presentation-experience/product-binding.js';
import { readProductRouteMetadata } from '@repo/presentation-experience';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import type { Metadata } from "next";

// Define proper Next.js page props - PURE ADAPTER ONLY
interface ProductDeliveryRouteProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
}

async function resolveSessionOrEnter() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  if (!sessionCookie?.value) redirect("/enter");
  const session = decodeWorkspaceSession(sessionCookie.value);
  if (!session || !session.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
    redirect("/enter");
  }
  return session;
}

export async function generateMetadata({ params }: ProductDeliveryRouteProps): Promise<Metadata> {
  const { productId } = await params;
  const binding = readProductBinding(productId);
  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "delivery",
  );
}

// apps/web ONLY handles Next.js route params - NO presentation ownership
// All business logic, data fetching, and UI composition in canonical widget
export default async function ProductDeliveryRoute({ params }: ProductDeliveryRouteProps) {
  const session = await resolveSessionOrEnter();
  const { productId } = await params;
  
  if (!productId || productId.length < 3) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 sm:py-16 flex items-center justify-center">
        <div className="mx-auto max-w-lg w-full">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center" aria-hidden="true">
                <svg className="w-8 h-8 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.376L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-slate-900 m-0">Produk Tidak Ditemukan</h1>
                <p className="text-sm text-slate-600 leading-relaxed m-0">
                  ID produk tidak valid atau tidak dapat diproses. Silakan periksa kembali URL yang Anda masukkan.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 w-full">
                <Link href={`/products`} className="w-full sm:w-auto">
                  <Button intent="primary" variant="solid" size="md" block>
                    Kembali ke Daftar Produk
                  </Button>
                </Link>
                <Link href="/workspace" className="w-full sm:w-auto">
                  <Button intent="neutral" variant="outline" size="md" block>
                    Ke Workspace
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const binding = readProductBinding(productId);
          return <ProductDeliveryPage productId={productId} binding={binding} session={session} />;
}