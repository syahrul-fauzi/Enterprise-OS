
import type { Config } from "tailwindcss";
import { lightColors, darkColors, spacing, radius } from "@repo/presentation-foundation";

function oklchToRgb(oklch: string): string {
  return oklch;
}

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/presentation-ui-system/src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/presentation-features/src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/presentation-experience/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          primary: oklchToRgb(lightColors.brand.primary),
          secondary: oklchToRgb(lightColors.brand.secondary),
          accent: oklchToRgb(lightColors.brand.accent ?? lightColors.brand.primary),
        },
        surface: {
          background: oklchToRgb(lightColors.surface.background),
          DEFAULT: oklchToRgb(lightColors.surface.surface),
          elevated: oklchToRgb(lightColors.surface.surfaceElevated),
          sunken: oklchToRgb(lightColors.surface.surfaceSunken),
          border: oklchToRgb(lightColors.surface.border),
          "border-strong": oklchToRgb(lightColors.surface.borderStrong),
          divider: oklchToRgb(lightColors.surface.divider),
        },
        text: {
          DEFAULT: oklchToRgb(lightColors.text.primary),
          primary: oklchToRgb(lightColors.text.primary),
          secondary: oklchToRgb(lightColors.text.secondary),
          muted: oklchToRgb(lightColors.text.muted),
          inverse: oklchToRgb(lightColors.text.inverse),
          link: oklchToRgb(lightColors.text.link),
          disabled: oklchToRgb(lightColors.text.disabled),
        },
        status: {
          success: {
            DEFAULT: oklchToRgb(lightColors.status.success),
            fg: oklchToRgb(lightColors.status.successForeground),
          },
          warning: {
            DEFAULT: oklchToRgb(lightColors.status.warning),
            fg: oklchToRgb(lightColors.status.warningForeground),
          },
          danger: {
            DEFAULT: oklchToRgb(lightColors.status.danger),
            fg: oklchToRgb(lightColors.status.dangerForeground),
          },
          info: {
            DEFAULT: oklchToRgb(lightColors.status.info),
            fg: oklchToRgb(lightColors.status.infoForeground),
          },
        },
      },
      spacing: {
        ...Object.fromEntries(
          Object.entries(spacing).map(([k, v]) => [k, typeof v === "number" ? `${v}px` : v])
        ),
      },
      borderRadius: {
        ...Object.fromEntries(
          Object.entries(radius).map(([k, v]) => [k, typeof v === "number" ? `${v}px` : v])
        ),
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      boxShadow: {
        "token-xs": "0 1px 2px 0 rgba(0,0,0,0.04)",
        "token-sm": "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)",
        "token-md": "0 4px 8px -2px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)",
        "token-lg": "0 10px 16px -4px rgba(0,0,0,0.10), 0 4px 6px -2px rgba(0,0,0,0.05)",
        "token-xl": "0 20px 24px -6px rgba(0,0,0,0.10), 0 10px 10px -4px rgba(0,0,0,0.06)",
      },
      transitionTimingFunction: {
        "eos-standard": "cubic-bezier(0.2, 0, 0, 1)",
        "eos-decelerate": "cubic-bezier(0, 0, 0, 1)",
        "eos-accelerate": "cubic-bezier(0.3, 0, 1, 1)",
        "eos-emphasized": "cubic-bezier(0.05, 0.7, 0.1, 1)",
      },
      transitionDuration: {
        "eos-instant": "50ms",
        "eos-fast": "150ms",
        "eos-normal": "300ms",
        "eos-slow": "500ms",
      },
    },
  },
  plugins: [],
};

export default config;