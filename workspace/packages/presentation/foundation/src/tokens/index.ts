export * from "./colors.js";
export * from "./spacing.js";
export * from "./radius.js";
export * from "./elevation.js";
export * from "./semantic.js";

import type { ColorTokens } from "./colors.js";
import type { SpacingTokens } from "./spacing.js";
import type { RadiusTokens } from "./radius.js";
import type { ElevationTokens } from "./elevation.js";
import type { SemanticTokens } from "./semantic.js";
import { defaultColors } from "./colors.js";
import { defaultSpacing } from "./spacing.js";
import { defaultRadius } from "./radius.js";
import { defaultElevation } from "./elevation.js";
import { defaultSemantic } from "./semantic.js";

export interface DesignTokens {
  readonly colors: ColorTokens;
  readonly spacing: SpacingTokens;
  readonly radius: RadiusTokens;
  readonly elevation: ElevationTokens;
  readonly semantic: SemanticTokens;
}

export type { ColorTokens, SpacingTokens, RadiusTokens, ElevationTokens, SemanticTokens };

export const tokens: DesignTokens = {
  colors: defaultColors,
  spacing: defaultSpacing,
  radius: defaultRadius,
  elevation: defaultElevation,
  semantic: defaultSemantic,
} as const;

export const defaultTokens: DesignTokens = tokens;
