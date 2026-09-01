import type { ColorTokens } from "./colors";
import type { RadiusTokens } from "./radius";
import type { ElevationTokens } from "./elevation";

export type SemanticIntent =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export type SemanticVariant = "solid" | "soft" | "outline" | "ghost";

export type SemanticSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SemanticBackgroundIntent {
  readonly bg: keyof ColorTokens["surface"] | keyof ColorTokens["status"] | keyof ColorTokens["brand"];
  readonly fg: keyof ColorTokens["text"] | keyof ColorTokens["status"];
  readonly border?: keyof ColorTokens["surface"] | keyof ColorTokens["status"] | keyof ColorTokens["brand"];
  readonly radius: keyof RadiusTokens;
  readonly elevation?: keyof ElevationTokens;
}

export interface SemanticTokens {
  readonly intents: Record<`${SemanticIntent}:${SemanticVariant}`, SemanticBackgroundIntent>;
  readonly interactive: {
    readonly hoverOpacity: number;
    readonly pressOpacity: number;
    readonly disabledOpacity: number;
  };
  readonly focusRing: {
    readonly offset: number;
    readonly width: number;
    readonly color: keyof ColorTokens["brand"] | keyof ColorTokens["status"];
  };
}

type BG = SemanticBackgroundIntent["bg"];
type FG = SemanticBackgroundIntent["fg"];
type BD = SemanticBackgroundIntent["border"];
type RD = SemanticBackgroundIntent["radius"];

const S = (bg: BG, fg: FG, radius: RD = "md", border?: BD, elevation?: keyof ElevationTokens): SemanticBackgroundIntent => ({
  bg,
  fg,
  radius,
  ...(border !== undefined ? { border } : {}),
  ...(elevation !== undefined ? { elevation } : {}),
});

export const semantic: SemanticTokens = {
  intents: {
    "primary:solid": S("primary", "inverse", "md"),
    "primary:soft": S("primary", "primary", "md", "primary"),
    "primary:outline": S("surface", "primary", "md", "primary"),
    "primary:ghost": S("background", "primary", "md"),
    "secondary:solid": S("secondary", "inverse", "md"),
    "secondary:soft": S("secondary", "secondary", "md", "secondary"),
    "secondary:outline": S("surface", "secondary", "md", "secondary"),
    "secondary:ghost": S("background", "secondary", "md"),
    "success:solid": S("success", "successForeground", "md"),
    "success:soft": S("success", "success", "md", "success"),
    "success:outline": S("surface", "success", "md", "success"),
    "success:ghost": S("background", "success", "md"),
    "warning:solid": S("warning", "warningForeground", "md"),
    "warning:soft": S("warning", "warning", "md", "warning"),
    "warning:outline": S("surface", "warning", "md", "warning"),
    "warning:ghost": S("background", "warning", "md"),
    "danger:solid": S("danger", "dangerForeground", "md"),
    "danger:soft": S("danger", "danger", "md", "danger"),
    "danger:outline": S("surface", "danger", "md", "danger"),
    "danger:ghost": S("background", "danger", "md"),
    "info:solid": S("info", "infoForeground", "md"),
    "info:soft": S("info", "info", "md", "info"),
    "info:outline": S("surface", "info", "md", "info"),
    "info:ghost": S("background", "info", "md"),
    "neutral:solid": S("borderStrong", "inverse", "md"),
    "neutral:soft": S("surfaceSunken", "primary", "md", "border"),
    "neutral:outline": S("surface", "secondary", "md", "border"),
    "neutral:ghost": S("background", "secondary", "md"),
  },
  interactive: {
    hoverOpacity: 0.92,
    pressOpacity: 0.85,
    disabledOpacity: 0.5,
  },
  focusRing: {
    offset: 2,
    width: 2,
    color: "primary",
  },
} as const;

export const defaultSemantic: SemanticTokens = semantic;