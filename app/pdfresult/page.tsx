"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "../contexts/LanguageContext"
import { translations } from "../utils/translations"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PDFResultPage() {
  const { language } = useLanguage()
  const t = translations[language]
  const searchParams = useSearchParams()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const studentName = searchParams.get("studentName")
  const studentClass = searchParams.get("studentClass")
  const subject = searchParams.get("subject")
  const imageNames = searchParams.get("images")?.split(",") || []

  useEffect(() => {
    // Here you would typically generate the PDF on the server
    // For this example, we'll just use a placeholder PDF
    setPdfUrl("/placeholder.pdf")
  }, [])

  const handleDownloadPDF = () => {
    // Implement PDF download logic here
    console.log("Downloading PDF")
  }

  const handleDownloadWord = () => {
    // Implement Word document download logic here
    console.log("Downloading Word document")
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-primary">{t.pdfResultTitle}</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{t.studentDetails}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              <strong>{t.studentName}:</strong> {studentName}
            </p>
            <p>
              <strong>{t.class}:</strong> {studentClass}
            </p>
            <p>
              <strong>{t.subject}:</strong> {subject}
            </p>
          </CardContent>
        </Card>

        {pdfUrl && (
          <div className="mb-8">
            <iframe src={pdfUrl} className="w-full h-[600px] border border-border rounded-md" />
          </div>
        )}

        <div className="flex space-x-4">
          <Button onClick={handleDownloadPDF}>{t.downloadPDF}</Button>
          <Button onClick={handleDownloadWord}>{t.downloadWord}</Button>
        </div>
      </main>
      <Footer />
    </div>
  )
}

