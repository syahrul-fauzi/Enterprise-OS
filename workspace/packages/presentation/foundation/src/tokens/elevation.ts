export interface ElevationShadow {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blur: number;
  readonly spread?: number;
  readonly color: string;
}

export interface ElevationTokens {
  readonly "0": readonly ElevationShadow[];
  readonly "1": readonly ElevationShadow[];
  readonly "2": readonly ElevationShadow[];
  readonly "3": readonly ElevationShadow[];
  readonly "4": readonly ElevationShadow[];
  readonly "5": readonly ElevationShadow[];
  readonly xs: readonly ElevationShadow[];
  readonly sm: readonly ElevationShadow[];
  readonly md: readonly ElevationShadow[];
  readonly lg: readonly ElevationShadow[];
  readonly xl: readonly ElevationShadow[];
}

export type ElevationKey = keyof ElevationTokens;

const C = "rgba(0, 0, 0, 0)";
const C4 = "rgba(0, 0, 0, 0.04)";
const C5 = "rgba(0, 0, 0, 0.05)";
const C6 = "rgba(0, 0, 0, 0.06)";
const C8 = "rgba(0, 0, 0, 0.08)";
const C10 = "rgba(0, 0, 0, 0.10)";

export const elevation: ElevationTokens = {
  "0": [{ offsetX: 0, offsetY: 0, blur: 0, spread: 0, color: C }],
  "1": [
    { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: C5 },
  ],
  "2": [
    { offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: C6 },
    { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: C4 },
  ],
  "3": [
    { offsetX: 0, offsetY: 4, blur: 8, spread: -2, color: C8 },
    { offsetX: 0, offsetY: 2, blur: 4, spread: -2, color: C4 },
  ],
  "4": [
    { offsetX: 0, offsetY: 10, blur: 16, spread: -4, color: C10 },
    { offsetX: 0, offsetY: 4, blur: 6, spread: -2, color: C5 },
  ],
  "5": [
    { offsetX: 0, offsetY: 20, blur: 24, spread: -6, color: C10 },
    { offsetX: 0, offsetY: 10, blur: 10, spread: -4, color: C6 },
  ],
  xs: [
    { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: C4 },
  ],
  sm: [
    { offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: C6 },
    { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: C4 },
  ],
  md: [
    { offsetX: 0, offsetY: 4, blur: 8, spread: -2, color: C8 },
    { offsetX: 0, offsetY: 2, blur: 4, spread: -2, color: C4 },
  ],
  lg: [
    { offsetX: 0, offsetY: 10, blur: 16, spread: -4, color: C10 },
    { offsetX: 0, offsetY: 4, blur: 6, spread: -2, color: C5 },
  ],
  xl: [
    { offsetX: 0, offsetY: 20, blur: 24, spread: -6, color: C10 },
    { offsetX: 0, offsetY: 10, blur: 10, spread: -4, color: C6 },
  ],
} as const;

export const defaultElevation: ElevationTokens = elevation;
