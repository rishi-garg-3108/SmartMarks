"use client"

import { useLanguage } from "../contexts/LanguageContext"
import { translations } from "../utils/translations"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { LanguageProvider } from "../contexts/LanguageContext"

function CookiePolicyContent() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t.cookiePolicy}</h1>
        <p className="mb-4">{t.cookiePolicyContent}</p>
        {/* Add more content as needed */}
      </main>
      <Footer />
    </div>
  )
}

export default function CookiePolicyPage() {
  return (
    <LanguageProvider>
      <CookiePolicyContent />
    </LanguageProvider>
  )
}