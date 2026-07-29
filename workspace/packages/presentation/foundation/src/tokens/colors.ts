export interface BrandColors {
  readonly primary: string;
  readonly secondary: string;
  readonly accent?: string;
}

export interface SurfaceColors {
  readonly background: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly surfaceSunken: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly divider: string;
}

export interface TextColors {
  readonly primary: string;
  readonly secondary: string;
  readonly muted: string;
  readonly inverse: string;
  readonly link: string;
  readonly disabled: string;
}

export interface StatusColors {
  readonly success: string;
  readonly successForeground: string;
  readonly warning: string;
  readonly warningForeground: string;
  readonly danger: string;
  readonly dangerForeground: string;
  readonly info: string;
  readonly infoForeground: string;
}

export interface ColorTokens {
  readonly brand: BrandColors;
  readonly surface: SurfaceColors;
  readonly text: TextColors;
  readonly status: StatusColors;
}

export const lightColors: ColorTokens = {
  brand: {
    primary: "oklch(0.55 0.2 260)",
    secondary: "oklch(0.60 0.18 200)",
    accent: "oklch(0.68 0.16 330)",
  },
  surface: {
    background: "oklch(0.98 0 none)",
    surface: "oklch(1 0 none)",
    surfaceElevated: "oklch(1 0 none)",
    surfaceSunken: "oklch(0.96 0 none)",
    border: "oklch(0.90 0 none)",
    borderStrong: "oklch(0.82 0 none)",
    divider: "oklch(0.93 0 none)",
  },
  text: {
    primary: "oklch(0.15 0 none)",
    secondary: "oklch(0.45 0 none)",
    muted: "oklch(0.60 0 none)",
    inverse: "oklch(0.98 0 none)",
    link: "oklch(0.55 0.2 260)",
    disabled: "oklch(0.70 0 none)",
  },
  status: {
    success: "oklch(0.65 0.2 145)",
    successForeground: "oklch(0.98 0 none)",
    warning: "oklch(0.78 0.16 85)",
    warningForeground: "oklch(0.30 0.08 60)",
    danger: "oklch(0.62 0.22 25)",
    dangerForeground: "oklch(0.98 0 none)",
    info: "oklch(0.68 0.16 230)",
    infoForeground: "oklch(0.98 0 none)",
  },
} as const;

export const darkColors: ColorTokens = {
  brand: {
    primary: "oklch(0.70 0.18 265)",
    secondary: "oklch(0.72 0.14 205)",
    accent: "oklch(0.75 0.14 330)",
  },
  surface: {
    background: "oklch(0.14 0 none)",
    surface: "oklch(0.18 0 none)",
    surfaceElevated: "oklch(0.22 0 none)",
    surfaceSunken: "oklch(0.12 0 none)",
    border: "oklch(0.28 0 none)",
    borderStrong: "oklch(0.36 0 none)",
    divider: "oklch(0.24 0 none)",
  },
  text: {
    primary: "oklch(0.95 0 none)",
    secondary: "oklch(0.70 0 none)",
    muted: "oklch(0.55 0 none)",
    inverse: "oklch(0.12 0 none)",
    link: "oklch(0.72 0.18 260)",
    disabled: "oklch(0.40 0 none)",
  },
  status: {
    success: "oklch(0.72 0.16 145)",
    successForeground: "oklch(0.12 0 none)",
    warning: "oklch(0.82 0.14 85)",
    warningForeground: "oklch(0.20 0.05 60)",
    danger: "oklch(0.68 0.20 25)",
    dangerForeground: "oklch(0.98 0 none)",
    info: "oklch(0.72 0.14 230)",
    infoForeground: "oklch(0.12 0 none)",
  },
} as const;

export const defaultColors: ColorTokens = lightColors;
