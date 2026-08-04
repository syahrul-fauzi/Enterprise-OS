import Link from "next/link";
import React from "react";
import type { ProductPreviewBinding } from "../lib/product-binding";
import { readProductExperience } from "../lib/product-experience";
import { readProductPresentation } from "../lib/product-presentation";

export interface ProductPreviewShellProps {
  readonly binding: ProductPreviewBinding;
  readonly mode?: "landing" | "requirements" | "delivery";
}

export function ProductPreviewShell({
  binding,
  mode = "landing",
}: ProductPreviewShellProps) {
  const presentation = readProductPresentation(binding.productId);
  const experience = readProductExperience(binding.productId);
  const requirementsHref = `/products/${binding.productId}${binding.route}`;
  const deliveryHref = `/products/${binding.productId}/delivery`;
  const overviewHref = `/products/${binding.productId}`;
  const primaryHref =
    mode === "landing"
      ? experience.landingPrimaryCtaHref
      : mode === "requirements"
        ? overviewHref
        : overviewHref;
  const secondaryHref =
    mode === "landing"
      ? experience.landingSecondaryCtaHref
      : mode === "requirements"
        ? deliveryHref
        : requirementsHref;
  const primaryLabel =
    mode === "landing"
      ? experience.landingPrimaryCtaLabel
      : mode === "requirements"
        ? experience.requirementsPrimaryCtaLabel
        : experience.deliveryPrimaryCtaLabel;
  const secondaryLabel =
    mode === "landing"
      ? experience.landingSecondaryCtaLabel
      : mode === "requirements"
        ? experience.requirementsSecondaryCtaLabel
        : experience.deliverySecondaryCtaLabel;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {presentation.categoryLabel}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {binding.displayName}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            {presentation.summary}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Audience
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {presentation.audienceTitle}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {presentation.audienceDescription}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Value Proposition
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {presentation.valueTitle}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {presentation.valueDescription}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Trust Signal
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {presentation.proofTitle}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {presentation.proofDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          href={primaryHref}
        >
          {primaryLabel}
        </Link>
        <Link
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          href={secondaryHref}
        >
          {secondaryLabel}
        </Link>
        {mode === "landing" &&
        experience.landingTertiaryCtaHref &&
        experience.landingTertiaryCtaLabel ? (
          <Link
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            href={experience.landingTertiaryCtaHref}
          >
            {experience.landingTertiaryCtaLabel}
          </Link>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Honest trust signal
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              {presentation.proofTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              {presentation.proofDescription}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Proof Before Claim
            </div>
            <div className="mt-2 font-medium text-slate-900">
              Built-in evidence and verified workflow
            </div>
            <div className="mt-1">
              This product uses visible progress and evidence instead of invented trust signals.
            </div>
          </div>
        </div>

        <ul className="mt-5 grid gap-3 md:grid-cols-3">
          {presentation.proofBullets.map((bullet) => (
            <li
              key={bullet}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-700"
            >
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      {mode === "landing" ? (
        <div className="mt-6 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Human Entry Point
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              {experience.entryQuestion}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {experience.entryAnswer}
            </p>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {experience.landingSections.map((section) => (
              <article
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                id={section.id}
                key={`${binding.productId}-${section.title}`}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {section.eyebrow}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">
                  {section.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {section.description}
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default ProductPreviewShell;
