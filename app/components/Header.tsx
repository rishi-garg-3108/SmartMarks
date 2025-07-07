"use client"

import Link from "next/link"
import { Bookmark } from "lucide-react"
import { useLanguage } from "../contexts/LanguageContext"
import { translations } from "../utils/translations"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import ThemeToggle from "./ThemeToggle"

export default function Header() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // ## JWT: Check for the token to determine login state
    const token = localStorage.getItem("jwt_token")
    setIsLoggedIn(!!token)
  }, [])

  const handleLogout = () => {
    // ## JWT: Remove the token on logout
    localStorage.removeItem("jwt_token")
    setIsLoggedIn(false)
    router.push("/")
    // Optionally, you can reload to ensure all state is cleared
    window.location.reload();
  }

  return (
    <header className="bg-background border-b border-border">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center space-x-2">
          <Bookmark className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-primary">SmartMarks</span>
        </Link>

        {/* Main nav links */}
        <nav>
          <ul className="flex space-x-4">
            <li><Link href="/features" className="text-foreground hover:text-primary">{t.features}</Link></li>
            <li><Link href="#" className="text-foreground hover:text-primary">{t.pricing}</Link></li>
            <li><Link href="/improvements" className="text-foreground hover:text-primary">{t.improvements}</Link></li>
          </ul>
        </nav>

        {/* Right-hand controls */}
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Select
            defaultValue={language}
            onValueChange={(value) => {
              setLanguage(value as "en" | "de")
              window.location.reload()
            }}
          >
            <SelectTrigger className="w-[100px]"><SelectValue placeholder="Language" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>

          {/* Auth controls */}
          {isLoggedIn ? (
            <Button variant="outline" onClick={handleLogout}>{t.logout}</Button>
          ) : (
            <Button asChild variant="outline"><Link href="/login">{t.loginSignup}</Link></Button>
          )}
        </div>
      </div>
    </header>
  )
}