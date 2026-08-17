export * from "./tokens/index.js";
export * from "./typography/index.js";
export * from "./icons/index.js";
export * from "./motion/index.js";
export * from "./themes/index.js";

import type { DesignTokens } from "./tokens/index.js";
import type { TypographyScale } from "./typography/index.js";
import type { MotionScale } from "./motion/index.js";
import type { IconRegistry } from "./icons/index.js";
import type { Theme } from "./themes/index.js";
import { tokens } from "./tokens/index.js";
import { typography } from "./typography/index.js";
import { motion } from "./motion/index.js";
import { iconRegistry } from "./icons/index.js";
import { defaultTheme, availableThemes } from "./themes/index.js";

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
