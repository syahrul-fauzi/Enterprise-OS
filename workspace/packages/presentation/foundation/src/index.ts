export * from "./tokens";
export * from "./typography";
export * from "./icons";
export * from "./motion";
export * from "./themes";

import type { DesignTokens } from "./tokens";
import type { TypographyScale } from "./typography";
import type { MotionScale } from "./motion";
import type { IconRegistry } from "./icons";
import type { Theme } from "./themes";
import { tokens } from "./tokens";
import { typography } from "./typography";
import { motion } from "./motion";
import { iconRegistry } from "./icons";
import { defaultTheme, availableThemes } from "./themes";

export interface FoundationConstitution {
  readonly tokens: DesignTokens;
  readonly typography: TypographyScale;
  readonly motion: MotionScale;
  readonly icons: IconRegistry;
  readonly themes: {
    readonly current: Theme["id"];
    readonly list: readonly Theme[];
  };
}

export type FoundationAssetDomain =
  | "tokens"
  | "typography"
  | "motion"
  | "icons"
  | "themes";

export type FoundationTokenDomain =
  | "colors"
  | "spacing"
  | "radius"
  | "elevation"
  | "semantic";

export type FoundationContract = FoundationConstitution;

export const foundation: FoundationConstitution = {
  tokens,
  typography,
  motion,
  icons: iconRegistry,
  themes: {
    current: defaultTheme.id,
    list: availableThemes,
  },
} as const;

export const defaultFoundation: FoundationConstitution = foundation;