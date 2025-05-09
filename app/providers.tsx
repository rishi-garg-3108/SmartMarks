/* app/providers.tsx */
"use client";

import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./contexts/LanguageContext";
import { useState, useEffect } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // optional hydration-flash guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <LanguageProvider>{mounted && children}</LanguageProvider>
    </ThemeProvider>
  );
}
