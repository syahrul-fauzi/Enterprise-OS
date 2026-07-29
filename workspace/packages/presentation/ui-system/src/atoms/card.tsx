import { createElement, type CSSProperties, type ElementType, type ReactNode } from "react";
import {
  color,
  elevationPx,
  radiusPx,
  spacingPx,
  transitionBase,
} from "../foundation";

export interface CardProps {
  readonly as?: ElementType;
  readonly className?: string;
  readonly children: ReactNode;
  readonly href?: string;
  readonly title?: ReactNode;
  readonly onClick?: () => void;
}

const cardSurfaceStyle: CSSProperties = {
  borderRadius: radiusPx("lg"),
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: color("surface", "border"),
  backgroundColor: color("surface", "surface"),
  boxShadow: elevationPx("sm"),
  transition: transitionBase(),
} as const;

const cardSurfaceHover: CSSProperties = {
  boxShadow: elevationPx("md"),
  borderColor: color("surface", "borderStrong"),
} as const;

const titleSectionStyle: CSSProperties = {
  paddingLeft: spacingPx("5"),
  paddingRight: spacingPx("5"),
  paddingTop: spacingPx("4"),
  paddingBottom: spacingPx("4"),
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: color("surface", "divider"),
} as const;

const bodySectionStyle: CSSProperties = {
  paddingLeft: spacingPx("5"),
  paddingRight: spacingPx("5"),
  paddingTop: spacingPx("4"),
  paddingBottom: spacingPx("4"),
} as const;

export function Card({
  as = "div",
  className = "",
  children,
  href,
  title,
  onClick,
}: CardProps) {
  const styleVar = {
    "--ui-card-border": cardSurfaceStyle.borderColor,
    "--ui-card-border-hover": cardSurfaceHover.borderColor,
    "--ui-card-shadow": cardSurfaceStyle.boxShadow,
    "--ui-card-shadow-hover": cardSurfaceHover.boxShadow,
  } as CSSProperties;

  const baseClass =
    "ui:rounded-lg ui:border ui:bg-surface ui:shadow-[var(--ui-card-shadow)] " +
    "ui:transition-all hover:ui:shadow-[var(--ui-card-shadow-hover)] hover:ui:border-[var(--ui-card-border-hover)]";

  const props: Record<string, unknown> = {
    className: `${baseClass}${className ? ` ${className}` : ""}`,
    style: { ...cardSurfaceStyle, ...styleVar } as CSSProperties,
  };

  if (href !== undefined) {
    (props as { href: string }).href = href;
  }
  if (onClick !== undefined) {
    (props as { onClick: () => void }).onClick = onClick;
  }

  return createElement(
    as,
    props,
    title !== undefined ? (
      <div className="ui:px-5 ui:py-4 ui:border-b ui:border-divider" style={titleSectionStyle}>
        {title}
      </div>
    ) : null,
    <div className="ui:px-5 ui:py-4" style={bodySectionStyle}>{children}</div>
  );
}
