export interface FontFamilies {
  readonly sans: string;
  readonly serif?: string;
  readonly mono: string;
  readonly display?: string;
}

export interface FontSizes {
  readonly xs: string;
  readonly sm: string;
  readonly base: string;
  readonly lg: string;
  readonly xl: string;
  readonly "2xl": string;
  readonly "3xl": string;
  readonly "4xl": string;
  readonly "5xl"?: string;
  readonly "6xl"?: string;
}

export interface FontWeights {
  readonly thin: number;
  readonly light: number;
  readonly normal: number;
  readonly medium: number;
  readonly semibold: number;
  readonly bold: number;
  readonly extrabold?: number;
  readonly black?: number;
}

export interface LineHeights {
  readonly none: number;
  readonly tight: number;
  readonly normal: number;
  readonly relaxed: number;
  readonly loose: number;
}

export interface LetterSpacings {
  readonly tighter: string;
  readonly tight: string;
  readonly normal: string;
  readonly wide: string;
  readonly wider: string;
  readonly widest: string;
}

export interface TypographyScale {
  readonly families: FontFamilies;
  readonly sizes: FontSizes;
  readonly weights: FontWeights;
  readonly lineHeights: LineHeights;
  readonly letterSpacings: LetterSpacings;
}

export type TypographyToken = keyof TypographyScale;

export const typography: TypographyScale = {
  families: {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  sizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "3.75rem",
  },
  weights: {
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeights: {
    none: 1,
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
  letterSpacings: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
} as const;

export const defaultTypography: TypographyScale = typography;
