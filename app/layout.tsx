/* app/layout.tsx  – SERVER component, no "use client" */
import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";          // ← client wrapper

export const metadata: Metadata = {
  title: "SmartMarks AI",
  description: "Hand-writing recognition & grading",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* all client contexts and hooks live inside <Providers /> */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
