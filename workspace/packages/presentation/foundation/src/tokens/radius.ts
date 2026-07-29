export interface RadiusTokens {
  readonly none: number;
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly "2xl": number;
  readonly "3xl": number;
  readonly full: number;
}

export type RadiusKey = keyof RadiusTokens;

export const radius: RadiusTokens = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
} as const;

export const defaultRadius: RadiusTokens = radius;
