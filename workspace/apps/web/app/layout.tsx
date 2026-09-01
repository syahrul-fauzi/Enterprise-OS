import "@repo/presentation-ui-system/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font";
import { LocaleProvider } from "@repo/presentation-hooks";
import { DEFAULT_LOCALE } from "@repo/presentation-hooks/use-locale/use-locale.js";

import { ThemeProvider } from "./providers/theme-provider";

export const metadata: Metadata = {
  title: "EOS — Ruang Kerja Profesional",
  description:
    "Kelola pekerjaan, dokumen, klien, dan aktivitas tim dalam satu workspace yang fokus, aman, dan siap produksi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ThemeProvider
          defaultTheme="system"
        >
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}