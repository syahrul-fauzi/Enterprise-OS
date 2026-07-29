export interface MotionDurations {
  readonly instant: number;
  readonly fast: number;
  readonly normal: number;
  readonly slow: number;
  readonly "slow-xl": number;
}

export interface MotionEasings {
  readonly standard: string;
  readonly standardAccelerate: string;
  readonly standardDecelerate: string;
  readonly emphasized: string;
  readonly emphasizedAccelerate: string;
  readonly emphasizedDecelerate: string;
  readonly linear: string;
}

export interface MotionPreset {
  readonly duration: keyof MotionDurations;
  readonly easing: keyof MotionEasings;
}

export interface MotionScale {
  readonly durations: MotionDurations;
  readonly easings: MotionEasings;
  readonly presets: {
    readonly enter: MotionPreset;
    readonly exit: MotionPreset;
    readonly emphasize: MotionPreset;
    readonly fast: MotionPreset;
  };
}

export type MotionToken = keyof MotionScale;

export const motion: MotionScale = {
  durations: {
    instant: 50,
    fast: 150,
    normal: 300,
    slow: 500,
    "slow-xl": 800,
  },
  easings: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    standardAccelerate: "cubic-bezier(0.3, 0, 1, 1)",
    standardDecelerate: "cubic-bezier(0, 0, 0, 1)",
    emphasized: "cubic-bezier(0.2, 0, 0, 1)",
    emphasizedAccelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)",
    emphasizedDecelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
    linear: "linear",
  },
  presets: {
    enter: { duration: "normal", easing: "standardDecelerate" },
    exit: { duration: "fast", easing: "standardAccelerate" },
    emphasize: { duration: "normal", easing: "emphasized" },
    fast: { duration: "fast", easing: "standard" },
  },
} as const;

export const defaultMotion: MotionScale = motion;
