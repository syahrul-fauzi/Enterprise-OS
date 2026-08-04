import type { Metadata } from "next";
import React from "react";
import RequirementView from "../../../../../../capabilities/requirement-management/experience/views/RequirementView";
import ProductPreviewShell from "../../../../components/ProductPreviewShell";
import { readProductPreviewBinding } from "../../../../lib/product-binding";
import { readProductExperience } from "../../../../lib/product-experience";
import {
  readProductPresentation,
  readProductRouteMetadata,
} from "../../../../lib/product-presentation";

interface ProductRequirementPreviewPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
}

export async function generateMetadata(
  input: ProductRequirementPreviewPageProps,
): Promise<Metadata> {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);

  return readProductRouteMetadata(
    binding.productId,
    binding.displayName,
    "requirements",
  );
}

export default async function ProductRequirementPreviewPage(
  input: ProductRequirementPreviewPageProps,
) {
  const params = await input.params;
  const binding = readProductPreviewBinding(params.productId);
  const presentation = readProductPresentation(binding.productId);
  const experience = readProductExperience(binding.productId);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="requirements" />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {experience.workflow.badgeLabel}
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {presentation.requirementTitle}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                {presentation.requirementSummary}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Audience
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {presentation.audienceDescription}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Trust Signal
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {presentation.proofDescription}
                </p>
              </div>
            </div>
          </div>
        </section>

        <RequirementView productId={binding.productId} copy={experience.workflow} cardCopy={experience.card} />
      </div>
    </main>
  );
}
