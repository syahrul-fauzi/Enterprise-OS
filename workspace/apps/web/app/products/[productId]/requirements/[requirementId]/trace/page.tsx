import type { Metadata } from "next";
import React from "react";
import ProductPreviewShell from "../../../../../../components/ProductPreviewShell";
import { readProductPreviewBinding } from "../../../../../../lib/product-binding";
import CausalTraceView from "../../../../../../../../capabilities/requirement-management/experience/views/CausalTraceView";

interface CausalTracePageProps {
  readonly params: Promise<{
    readonly productId: string;
    readonly requirementId: string;
  }>;
}

export async function generateMetadata(
  input: CausalTracePageProps,
): Promise<Metadata> {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);

  return {
    title: `Causal Trace - ${binding.displayName}`,
    description: "Dependency and transformation trace for requirement",
  };
}

export default async function CausalTracePage(
  input: CausalTracePageProps,
) {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="requirements" />
        
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6">
            <div className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              REQ-012: Causal Transformation Trace
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Rantai Transformasi & Dependency
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Visualisasi bagaimana requirement ini berubah menjadi artefak implementasi,
              dependensi yang terdampak, dan bagaimana verifikasi dilakukan end-to-end.
            </p>
          </div>
        </section>

        <CausalTraceView 
          productId={binding.productId} 
          requirementId={params.requirementId} 
        />
      </div>
    </main>
  );
}