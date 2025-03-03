"use client"

import { useLanguage } from "../contexts/LanguageContext"
import { translations } from "../utils/translations"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { LanguageProvider } from "../contexts/LanguageContext"

function TermsOfServiceContent() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-primary">{t.termsOfService}</h1>
        <p className="mb-4 text-foreground">{t.termsOfServiceContent}</p>
        {/* Add more content as needed */}
      </main>
      <Footer />
    </div>
  )
}

export default function TermsOfServicePage() {
  return (
    <LanguageProvider>
      <TermsOfServiceContent />
    </LanguageProvider>
  )
}

