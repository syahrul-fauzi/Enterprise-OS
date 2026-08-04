import "@repo/presentation-ui-system/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "Professional Workspace | Requirement Intake",
  description:
    "Capture, review, and advance requirements in a focused workspace built for delivery teams and client-facing operations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={GeistSans.className}>{children}</body>
    </html>
  );
}
