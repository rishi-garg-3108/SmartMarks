"use client"

import Link from "next/link"
import { Bookmark, ChevronDown } from "lucide-react"
import { useLanguage } from "../contexts/LanguageContext"
import { translations } from "../utils/translations"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"


export default function Header() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // In a real application, you would check the user's session here
    const email = localStorage.getItem("userEmail")
    if (email) {
      setUserEmail(email)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("userEmail")
    setUserEmail(null)
    router.push("/")
  }

  return (
    <header className="bg-background border-b border-border">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Bookmark className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-primary">SmartMarks</span>
        </Link>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/features" className="text-foreground hover:text-primary">
                {t.features}
              </Link>
            </li>
            <li>
              <Link href="#" className="text-foreground hover:text-primary">
                {t.pricing}
              </Link>
            </li>
                             {/* Add the improvements link here */}
            <li>
              <Link href="/improvements" className="text-foreground hover:text-primary">
          Improvements
              </Link>
            </li>
          </ul>
        </nav>
        <div className="flex items-center space-x-4">
          <Select
            defaultValue={language}
            onValueChange={(value) => {
              setLanguage(value as "en" | "de")
              window.location.reload() // Force a page reload to apply the new language
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
          {userEmail ? (
            <div className="flex items-center space-x-2">
              <span className="text-foreground">{userEmail}</span>
              <Button variant="outline" onClick={handleLogout}>
                {t.logout}
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline">
              <Link href="/login">{t.loginSignup}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

