import type { DesignTokens } from "../tokens/index.js";
import type { TypographyScale } from "../typography/index.js";
import type { MotionScale } from "../motion/index.js";
import type { IconRegistry } from "../icons/index.js";
import { lightColors, darkColors } from "../tokens/colors.js";
import { spacing } from "../tokens/spacing.js";
import { radius } from "../tokens/radius.js";
import { elevation } from "../tokens/elevation.js";
import { semantic } from "../tokens/semantic.js";
import { typography } from "../typography/index.js";
import { motion } from "../motion/index.js";
import { iconRegistry } from "../icons/index.js";

export type ThemeMode = "light" | "dark" | "auto";

export interface Theme {
  readonly id: string;
  readonly name: string;
  readonly mode: ThemeMode;
  readonly tokens: DesignTokens;
  readonly typography: TypographyScale;
  readonly motion: MotionScale;
  readonly icons: IconRegistry;
  readonly meta?: {
    readonly author?: string;
    readonly version?: string;
    readonly description?: string;
  };
}

export interface ThemeVariant<T = unknown> {
  readonly id: string;
  readonly extends?: string;
  readonly overrides?: Partial<Theme["tokens"]> & {
    readonly typography?: Partial<Theme["typography"]>;
    readonly motion?: Partial<Theme["motion"]>;
  };
  readonly custom?: T;
}

const lightTokens: DesignTokens = {
  colors: lightColors,
  spacing,
  radius,
  elevation,
  semantic,
};

const darkTokens: DesignTokens = {
  colors: darkColors,
  spacing,
  radius,
  elevation,
  semantic,
};

export const lightTheme: Theme = {
  id: "light",
  name: "Light",
  mode: "light",
  tokens: lightTokens,
  typography,
  motion,
  icons: iconRegistry,
  meta: {
    version: "0.1.0-alpha.3b",
    description: "Default EOS light theme — default light palette with semantic system.",
  },
} as const;

export const darkTheme: Theme = {
  id: "dark",
  name: "Dark",
  mode: "dark",
  tokens: darkTokens,
  typography,
  motion,
  icons: iconRegistry,
  meta: {
    version: "0.1.0-alpha.3b",
    description: "Default EOS dark theme — inverse lightness-optimized dark palette.",
  },
} as const;

export const defaultTheme: Theme = lightTheme;

export const availableThemes: readonly Theme[] = [lightTheme, darkTheme];
