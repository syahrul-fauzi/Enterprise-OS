export interface SpacingTokens {
  readonly unit: number;
  readonly "0": number;
  readonly px: number;
  readonly "0.5": number;
  readonly "1": number;
  readonly "1.5": number;
  readonly "2": number;
  readonly "2.5": number;
  readonly "3": number;
  readonly "3.5": number;
  readonly "4": number;
  readonly "5": number;
  readonly "6": number;
  readonly "7": number;
  readonly "8": number;
  readonly "9": number;
  readonly "10": number;
  readonly "11": number;
  readonly "12": number;
  readonly "14": number;
  readonly "16": number;
  readonly "20": number;
  readonly "24": number;
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly "2xl": number;
  readonly "3xl": number;
  readonly "4xl": number;
}

export type SpacingKey = keyof SpacingTokens;

const U = 4;

export const spacing: SpacingTokens = {
  unit: U,
  "0": 0,
  px: 1,
  "0.5": U * 0.5,
  "1": U * 1,
  "1.5": U * 1.5,
  "2": U * 2,
  "2.5": U * 2.5,
  "3": U * 3,
  "3.5": U * 3.5,
  "4": U * 4,
  "5": U * 5,
  "6": U * 6,
  "7": U * 7,
  "8": U * 8,
  "9": U * 9,
  "10": U * 10,
  "11": U * 11,
  "12": U * 12,
  "14": U * 14,
  "16": U * 16,
  "20": U * 20,
  "24": U * 24,
  xs: U * 1,
  sm: U * 2,
  md: U * 4,
  lg: U * 6,
  xl: U * 8,
  "2xl": U * 12,
  "3xl": U * 16,
  "4xl": U * 24,
} as const;

export const defaultSpacing: SpacingTokens = spacing;
