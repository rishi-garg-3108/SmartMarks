"use client";

import "./globals.css"
import type { Metadata } from "next"
import { LanguageProvider } from "./contexts/LanguageContext"
import { useState, useEffect } from "react"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <html lang="en">
      <LanguageProvider>
        <body>{mounted && children}</body>
      </LanguageProvider>
    </html>
  )
}

