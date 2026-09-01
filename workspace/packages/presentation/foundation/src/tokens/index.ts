export * from "./colors";
export * from "./spacing";
export * from "./radius";
export * from "./elevation";
export * from "./semantic";

import type { ColorTokens } from "./colors";
import type { SpacingTokens } from "./spacing";
import type { RadiusTokens } from "./radius";
import type { ElevationTokens } from "./elevation";
import type { SemanticTokens } from "./semantic";
import { defaultColors } from "./colors";
import { defaultSpacing } from "./spacing";
import { defaultRadius } from "./radius";
import { defaultElevation } from "./elevation";
import { defaultSemantic } from "./semantic";

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