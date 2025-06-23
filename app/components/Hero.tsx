"use client"

import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "../contexts/LanguageContext"
import { translations } from "../utils/translations"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Hero() {
  const { language } = useLanguage()
  const t = translations[language]
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail")
    setIsLoggedIn(!!userEmail)
  }, [])

  const handleStartGrading = () => {
    if (isLoggedIn) {
      router.push("/grade")
    } else {
      router.push("/login")
    }
  }

  return (
    <section className="bg-background text-foreground py-20">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-8 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">{t.marksExams}</h1>
          <p className="text-xl mb-6 text-muted-foreground">{t.smartMarksDescription}</p>
          <Button onClick={handleStartGrading}>{t.getStarted}</Button>
        </div>
      </div>
    </section>
  )
}

