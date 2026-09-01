"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeProviderState {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "system",
  setTheme: () => null,
});

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      className="inline-flex items-center justify-center w-10 h-10 rounded-md text-text-secondary hover:bg-surface-sunken hover:text-text-primary border border-transparent hover:border-surface-border transition-all duration-eos-fast ease-eos-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Beralih ke tema ${nextTheme}`}
      aria-pressed={isDark}
      title={`Beralih ke tema ${nextTheme}`}
    >
      <span className="sr-only">Beralih ke tema {nextTheme}</span>
      <Sun className="h-5 w-5 shrink-0 rotate-0 scale-100 transition-all duration-eos-normal ease-eos-emphasized dark:-rotate-90 dark:scale-0" aria-hidden="true" />
      <Moon className="absolute h-5 w-5 shrink-0 rotate-90 scale-0 transition-all duration-eos-normal ease-eos-emphasized dark:rotate-0 dark:scale-100" aria-hidden="true" />
    </button>
  );
}