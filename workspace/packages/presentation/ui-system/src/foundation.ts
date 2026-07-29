import {
  tokens,
  motion,
  typography,
  iconRegistry,
  semantic,
  defaultTheme,
  availableThemes,
  foundation as foundationRoot,
} from "@repo/presentation-foundation";

import type {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  ElevationTokens,
  ElevationShadow,
  SemanticTokens,
  SemanticIntent,
  SemanticVariant,
} from "@repo/presentation-foundation";

export type {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  ElevationTokens,
  SemanticTokens,
  SemanticIntent,
  SemanticVariant,
};

export const designTokens = tokens;
export const designMotion = motion;
export const designTypography = typography;
export const designIcons = iconRegistry;
export const designSemantic = semantic;
export const designDefaultTheme = defaultTheme;
export const designAvailableThemes = availableThemes;
export const foundation = foundationRoot;

export function px(n: number): string {
  return `${n}px`;
}

export function rem(n: number): string {
  return `${n}rem`;
}

export function spacingPx(key: keyof SpacingTokens): string {
  return px(tokens.spacing[key]);
}

export function radiusPx(key: keyof RadiusTokens): string {
  return px(tokens.radius[key]);
}

export function color<K1 extends keyof ColorTokens>(
  group: K1,
  key: keyof ColorTokens[K1]
): string {
  const bucket = tokens.colors[group] as unknown as Record<string, string | undefined>;
  return bucket[key as string] ?? "inherit";
}

export function shadowString(shadows: readonly ElevationShadow[]): string {
  return shadows
    .map(
      (s) =>
        `${px(s.offsetX)} ${px(s.offsetY)} ${px(s.blur)}${
          s.spread !== undefined ? ` ${px(s.spread)}` : ""
        } ${s.color}`
    )
    .join(", ");
}

export function elevationPx(key: keyof ElevationTokens): string {
  return shadowString(tokens.elevation[key]);
}

export function transitionBase(): string {
  const ms = motion.durations[motion.presets.fast.duration];
  const easing = motion.easings[motion.presets.fast.easing];
  return `all ${ms}ms ${easing}`;
}

export function resolveIntent(variant: `${SemanticIntent}:${SemanticVariant}`) {
  const intent = semantic.intents[variant];
  const all = {
    ...(tokens.colors.surface as unknown as Record<string, string>),
    ...(tokens.colors.status as unknown as Record<string, string>),
    ...(tokens.colors.brand as unknown as Record<string, string>),
    ...(tokens.colors.text as unknown as Record<string, string>),
  };
  const resolveColor = (key: string): string => all[key] ?? "inherit";
  return {
    background: resolveColor(intent.bg as string),
    foreground: resolveColor(intent.fg as string),
    border: intent.border !== undefined ? resolveColor(intent.border as string) : undefined,
    radius: radiusPx(intent.radius),
    shadow: intent.elevation !== undefined ? elevationPx(intent.elevation) : undefined,
  };
}
