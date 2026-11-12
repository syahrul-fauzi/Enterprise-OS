import type { CSSProperties } from "react";
import { color, spacingPx, designTokens } from "../foundation.js";

export interface GradientProps {
  readonly small?: boolean;
  readonly conic?: boolean;
  readonly className?: string;
}

const GRADIENT_FROM = color("status", "danger");
const GRADIENT_VIA = color("brand", "accent") ?? color("brand", "primary");
const GRADIENT_TO = color("status", "info");

const BLUR_SMALL = spacingPx("8");
const BLUR_LARGE = `${designTokens.spacing[8] * 2 + designTokens.spacing[8] / 4}px`;

export function Gradient({ conic, className, small }: GradientProps) {
  const styleVars = {
    "--ui-gradient-from": GRADIENT_FROM,
    "--ui-gradient-via": GRADIENT_VIA,
    "--ui-gradient-to": GRADIENT_TO,
    "--ui-blur-small": BLUR_SMALL,
    "--ui-blur-large": BLUR_LARGE,
  } as CSSProperties;
  const blurVar = small ? "var(--ui-blur-small)" : "var(--ui-blur-large)";
  return (
    <span
      className={`ui:absolute ui:mix-blend-normal ui:will-change-[filter] ui:rounded-[100%] ui:blur-[${blurVar}] ${
        conic
          ? "ui:bg-gradient-to-r ui:from-[var(--ui-gradient-from)] ui:from-10% ui:via-[var(--ui-gradient-via)] ui:via-30% ui:to-[var(--ui-gradient-to)] ui:to-100%"
          : ""
      } ${className ?? ""}`}
      style={styleVars}
    />
  );
}