import "@repo/presentation-ui-system/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font";
import { LocaleProvider } from "@repo/presentation-hooks";
import { DEFAULT_LOCALE } from "@repo/presentation-hooks/use-locale/use-locale.js";

export const metadata: Metadata = {
  title: "LawyersHub — Ruang Kerja Hukum Profesional",
  description:
    "Kelola kasus hukum, dokumen, klien, dan aktivitas tim dalam satu workspace yang fokus, aman, dan siap produksi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body className={GeistSans.className}>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}