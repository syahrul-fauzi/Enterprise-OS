"use client";

import React, { forwardRef, type ReactNode, type ElementType } from "react";

export type CardSize = "sm" | "md" | "lg";

export interface CardProps {
  readonly as?: ElementType;
  readonly className?: string;
  readonly children: ReactNode;
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly headerActions?: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: CardSize;
  readonly interactive?: boolean;
  readonly hoverable?: boolean;
  readonly onClick?: () => void;
  readonly tabIndex?: number;
}

const sizePadding: Record<CardSize, { header: string; body: string; footer: string }> = {
  sm: { header: "px-4 py-3", body: "px-4 py-3", footer: "px-4 py-3" },
  md: { header: "px-5 py-4", body: "px-5 py-4", footer: "px-5 py-4" },
  lg: { header: "px-6 py-5", body: "px-6 py-5", footer: "px-6 py-5" },
};

function baseCardClasses(hoverable: boolean): string {
  return [
    "w-full bg-surface border border-surface-border rounded-md shadow-token-sm",
    "transition-all duration-eos-fast ease-eos-standard",
    hoverable
      ? "hover:shadow-token-md hover:border-surface-border-strong hover:-translate-y-0.5 cursor-pointer"
      : "",
  ].join(" ");
}

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  {
    as: Component = "div",
    className = "",
    children,
    title,
    subtitle,
    headerActions,
    footer,
    size = "md",
    hoverable = false,
    onClick,
    tabIndex,
  },
  ref
) {
  const padding = sizePadding[size];
  const hasHeader = title !== undefined || subtitle !== undefined || headerActions !== undefined;
  const isInteractive = onClick !== undefined;
  const computedHoverable = hoverable || isInteractive;

  const roleProps = isInteractive
    ? {
        onClick,
        tabIndex: tabIndex ?? 0,
        role: "button" as const,
      }
    : {};

  return (
    <Component
      ref={ref as never}
      className={[baseCardClasses(computedHoverable), className].join(" ")}
      {...roleProps}
    >
      {hasHeader && (
        <div
          className={[
            "flex items-start justify-between gap-3",
            "border-b border-surface-divider",
            padding.header,
          ].join(" ")}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            {title !== undefined && (
              <h3 className="text-base font-semibold text-text-primary leading-tight m-0">
                {title}
              </h3>
            )}
            {subtitle !== undefined && (
              <p className="text-sm text-text-secondary m-0">{subtitle}</p>
            )}
          </div>
          {headerActions !== undefined && (
            <div className="shrink-0">{headerActions}</div>
          )}
        </div>
      )}
      <div className={padding.body}>{children}</div>
      {footer !== undefined && (
        <div
          className={[
            "border-t border-surface-divider",
            padding.footer,
          ].join(" ")}
        >
          {footer}
        </div>
      )}
    </Component>
  );
});

export default Card;
