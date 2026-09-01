"use client";

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonIntent = "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral";
export type ButtonVariant = "solid" | "soft" | "outline" | "ghost";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly intent?: ButtonIntent;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly loadingText?: string;
  readonly leftIcon?: ReactNode;
  readonly rightIcon?: ReactNode;
  readonly block?: boolean;
}

const intentSolid: Record<ButtonIntent, string> = {
  primary: "bg-brand-primary text-text-inverse hover:bg-brand-primary/90 active:bg-brand-primary/80 border-brand-primary",
  secondary: "bg-brand-secondary text-text-inverse hover:bg-brand-secondary/90 active:bg-brand-secondary/80 border-brand-secondary",
  success: "bg-status-success text-status-success-fg hover:bg-status-success/90 active:bg-status-success/80 border-status-success",
  warning: "bg-status-warning text-status-warning-fg hover:bg-status-warning/90 active:bg-status-warning/80 border-status-warning",
  danger: "bg-status-danger text-status-danger-fg hover:bg-status-danger/90 active:bg-status-danger/80 border-status-danger",
  info: "bg-status-info text-status-info-fg hover:bg-status-info/90 active:bg-status-info/80 border-status-info",
  neutral: "bg-surface-border-strong text-text-inverse hover:bg-surface-border-strong/90 active:bg-surface-border-strong/80 border-surface-border-strong",
};

const intentSoft: Record<ButtonIntent, string> = {
  primary: "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 border-brand-primary/20",
  secondary: "bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/15 border-brand-secondary/20",
  success: "bg-status-success/10 text-status-success hover:bg-status-success/15 border-status-success/20",
  warning: "bg-status-warning/10 text-status-warning hover:bg-status-warning/15 border-status-warning/20",
  danger: "bg-status-danger/10 text-status-danger hover:bg-status-danger/15 border-status-danger/20",
  info: "bg-status-info/10 text-status-info hover:bg-status-info/15 border-status-info/20",
  neutral: "bg-surface-sunken text-text-secondary hover:bg-surface-sunken/80 border-surface-border",
};

const intentOutline: Record<ButtonIntent, string> = {
  primary: "bg-surface text-brand-primary border-brand-primary hover:bg-brand-primary/5",
  secondary: "bg-surface text-brand-secondary border-brand-secondary hover:bg-brand-secondary/5",
  success: "bg-surface text-status-success border-status-success hover:bg-status-success/5",
  warning: "bg-surface text-status-warning border-status-warning hover:bg-status-warning/5",
  danger: "bg-surface text-status-danger border-status-danger hover:bg-status-danger/5",
  info: "bg-surface text-status-info border-status-info hover:bg-status-info/5",
  neutral: "bg-surface text-text-secondary border-surface-border hover:bg-surface-sunken",
};

const intentGhost: Record<ButtonIntent, string> = {
  primary: "bg-transparent text-brand-primary hover:bg-brand-primary/10 border-transparent",
  secondary: "bg-transparent text-brand-secondary hover:bg-brand-secondary/10 border-transparent",
  success: "bg-transparent text-status-success hover:bg-status-success/10 border-transparent",
  warning: "bg-transparent text-status-warning hover:bg-status-warning/10 border-transparent",
  danger: "bg-transparent text-status-danger hover:bg-status-danger/10 border-transparent",
  info: "bg-transparent text-status-info hover:bg-status-info/10 border-transparent",
  neutral: "bg-transparent text-text-secondary hover:bg-surface-sunken border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 gap-1.5 text-xs rounded-xs",
  sm: "h-9 px-3.5 gap-2 text-sm rounded-sm",
  md: "h-11 px-5 gap-2 text-sm rounded-md",
  lg: "h-12 px-6 gap-2.5 text-base rounded-lg",
  xl: "h-14 px-7 gap-3 text-base rounded-xl",
};

function getVariantClasses(intent: ButtonIntent, variant: ButtonVariant): string {
  switch (variant) {
    case "solid": return intentSolid[intent];
    case "soft": return intentSoft[intent];
    case "outline": return intentOutline[intent];
    case "ghost": return intentGhost[intent];
  }
}

function Spinner({ size }: { size: ButtonSize }) {
  const spinnerSize = size === "xs" ? "w-3.5 h-3.5" : size === "sm" || size === "md" ? "w-4 h-4" : "w-5 h-5";
  return (
    <svg className={`animate-spin ${spinnerSize}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    intent = "primary",
    variant = "solid",
    size = "md",
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    block = false,
    className = "",
    disabled,
    type = "button",
    children,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  const variantClasses = getVariantClasses(intent, variant);

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        "inline-flex items-center justify-center font-semibold border",
        "transition-all duration-eos-fast ease-eos-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        "active:translate-y-px",
        variantClasses,
        sizeClasses[size],
        block ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner size={size} />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

export { Spinner };
export default Button;