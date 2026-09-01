"use client";

import React from "react";
import Link from "next/link";

const SafeLink = Link as any;

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
  readonly onClick?: () => void;
  readonly current?: boolean;
  readonly icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  readonly items: readonly BreadcrumbItem[];
  readonly className?: string;
  readonly separator?: React.ReactNode;
  readonly size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<BreadcrumbProps["size"]>, string> = {
  sm: "text-xs gap-1",
  md: "text-sm gap-1.5",
  lg: "text-sm gap-2",
};

function DefaultSeparator() {
  return (
    <svg
      className="w-3 h-3 text-text-muted shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 15l5-5-5-5"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
      />
    </svg>
  );
}

export function Breadcrumb({
  items,
  className = "",
  separator,
  size = "md",
}: BreadcrumbProps) {
  const Separator = separator ?? <DefaultSeparator />;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        className={`flex items-center flex-wrap ${sizeClasses[size]} font-medium`}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasAction = item.href || item.onClick;
          const content = (
            <>
              {index === 0 && !item.icon ? (
                <span className="inline-flex items-center gap-1.5">
                  <HomeIcon />
                  <span>{item.label}</span>
                </span>
              ) : item.icon ? (
                <span className="inline-flex items-center gap-1.5">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              ) : (
                <span>{item.label}</span>
              )}
            </>
          );

          return (
            <li key={index} className="flex items-center gap-1.5">
              {item.current ? (
                <span
                  className="text-text-primary font-semibold truncate max-w-[12rem] inline-block align-bottom"
                  aria-current="page"
                >
                  {content}
                </span>
              ) : hasAction ? (
                item.href ? (
                  <SafeLink
                    href={item.href}
                    onClick={
                      item.onClick
                        ? (e: React.MouseEvent) => {
                            e.preventDefault();
                            item.onClick?.();
                          }
                        : undefined
                    }
                    className="text-text-muted hover:text-text-primary transition-colors inline-flex items-center"
                  >
                    {content}
                  </SafeLink>
                ) : (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="text-text-muted hover:text-text-primary transition-colors inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 rounded-sm"
                  >
                    {content}
                  </button>
                )
              ) : (
                <span className="text-text-secondary">{content}</span>
              )}
              {!isLast && <span aria-hidden="true">{Separator}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
