"use client"

import { useLanguage } from "../contexts/LanguageContext"
import { translations } from "../utils/translations"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { Upload, FileText, AlertCircle, FileOutput } from "lucide-react"
import { LanguageProvider } from "../contexts/LanguageContext"

function FeaturesPageContent() {
  const { language } = useLanguage()
  const t = translations[language]

  const features = [
    {
      icon: <Upload className="h-12 w-12 text-primary" />,
      title: t.bulkUploadTitle,
      description: t.bulkUploadDesc,
    },
    {
      icon: <FileText className="h-12 w-12 text-primary" />,
      title: t.textExtractionTitle,
      description: t.textExtractionDesc,
    },
    {
      icon: <AlertCircle className="h-12 w-12 text-primary" />,
      title: t.errorAnalysisTitle,
      description: t.errorAnalysisDesc,
    },
    {
      icon: <FileOutput className="h-12 w-12 text-primary" />,
      title: t.exportableDocsTitle,
      description: t.exportableDocsDesc,
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow">
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold text-center mb-12 text-primary">{t.keyFeatures}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-accent p-6 rounded-lg shadow-md">
                  <div className="flex items-center mb-4">
                    {feature.icon}
                    <h2 className="text-2xl font-semibold ml-4 text-primary">{feature.title}</h2>
                  </div>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default function FeaturesPage() {
  return (
    <LanguageProvider>
      <FeaturesPageContent />
    </LanguageProvider>
  )
}