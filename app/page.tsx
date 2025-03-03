"use client"

import { LanguageProvider } from "./contexts/LanguageContext"
import Header from "./components/Header"
import Hero from "./components/Hero"
import FeaturesHomePage from "./components/FeaturesHomePage"
import Footer from "./components/Footer"
import { useState, useEffect } from "react"

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <LanguageProvider>
      {mounted && (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <Header />
          <main className="flex-grow">
            <Hero />
            <FeaturesHomePage />
          </main>
          <Footer />
        </div>
      )}
    </LanguageProvider>
  )
}

