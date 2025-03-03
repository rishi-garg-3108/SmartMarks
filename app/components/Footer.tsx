"use client"

import Link from "next/link"
import { Bookmark } from "lucide-react"
import { useLanguage } from "../contexts/LanguageContext"
import { translations } from "../utils/translations"

export default function Footer() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <footer className="bg-background border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-between">
          <div className="w-full md:w-1/3 mb-8 md:mb-0">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Bookmark className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-primary">SmartMarks</span>
            </Link>
            <p className="text-muted-foreground">{t.smartMarksFooterDesc}</p>
          </div>
          <div className="w-full md:w-1/3">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy-policy" className="text-muted-foreground hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="text-muted-foreground hover:text-primary">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="text-muted-foreground hover:text-primary">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SmartMarks. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

