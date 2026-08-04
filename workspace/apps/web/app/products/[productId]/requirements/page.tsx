import React from "react";
import RequirementView from "../../../../../../capabilities/requirement-management/experience/views/RequirementView";
import ProductPreviewShell from "../../../../components/ProductPreviewShell";
import { readProductPreviewBinding } from "../../../../lib/product-binding";

interface ProductRequirementPreviewPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
}

export default async function ProductRequirementPreviewPage(
  input: ProductRequirementPreviewPageProps,
) {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Requirement Preview
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {binding.displayName} requirement workflow
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                The same shared requirement capability is rendered here under
                the {binding.displayName} product context.
              </p>
            </div>
          </div>
        </section>

        <RequirementView />
      </div>
    </main>
  );
}
