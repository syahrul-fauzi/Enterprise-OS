import "@repo/presentation-ui-system/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font";

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
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        {children}
      </body>
    </html>
  );
}