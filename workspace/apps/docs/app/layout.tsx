import "@repo/presentation-ui-system/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Gradient } from "@repo/presentation-ui-system";
import { KnowNavigation } from "./_components/navigation.js";

export const metadata: Metadata = {
  title: "EOS KNOW — Enterprise OS Self-Description Surface",
  description:
    "Mata manusia melihat keadaan Enterprise Operating System: apa EOS ini, apa yang terbukti, apa yang belum, tanpa membaca source code.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${GeistSans.className} bg-black text-neutral-100`}>
        <div className="relative min-h-screen">
          <Gradient
            className="fixed top-[-400px] left-1/2 -translate-x-1/2 opacity-[0.1] w-[1000px] h-[1000px] pointer-events-none"
            conic
          />
          <KnowNavigation />
          <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
