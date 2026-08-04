import Link from "next/link";
import React from "react";
import type { ProductPreviewBinding } from "../lib/product-binding";

export interface ProductPreviewShellProps {
  readonly binding: ProductPreviewBinding;
}

function summaryForProduct(productId: string): string {
  switch (productId) {
    case "services-id":
      return "Preview the Services.ID requirement intake context on the shared professional workspace.";
    case "lawyershub":
      return "Preview the LawyersHub requirement intake context on the shared professional workspace.";
    case "ilc":
      return "Preview the Indonesia Lawyers Club requirement intake context on the shared professional workspace.";
    default:
      return "Preview the product context on the shared professional workspace.";
  }
}

export function ProductPreviewShell({ binding }: ProductPreviewShellProps) {
  const requirementsHref = `/products/${binding.productId}${binding.route}`;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Product Preview
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {binding.displayName}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            {summaryForProduct(binding.productId)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Product ID
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {binding.productId}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Surface
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {binding.surface}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Capability
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              requirement-management
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          href={requirementsHref}
        >
          Open {binding.displayName} Requirement Preview
        </Link>
        <Link
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          href="/requirements"
        >
          Open Generic Requirement Workspace
        </Link>
      </div>
    </section>
  );
}

export default ProductPreviewShell;
