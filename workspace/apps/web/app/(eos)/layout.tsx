import { LocaleProvider } from "@repo/presentation-hooks";
import { DEFAULT_LOCALE } from "@repo/presentation-hooks/use-locale/use-locale.js";
import { ThemeProvider } from "@/app/providers/theme-provider";

export default function EOSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="system">
      <LocaleProvider>{children}</LocaleProvider>
    </ThemeProvider>
  );
}