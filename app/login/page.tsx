"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bookmark } from "lucide-react"
import { useLanguage } from "../contexts/LanguageContext"
import { translations } from "../utils/translations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const { language } = useLanguage()
  const t = translations[language]
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("") // State for login errors
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // ## JWT: We check for a token, not an email
    const token = localStorage.getItem("jwt_token")
    if (token) {
      router.push("/grade")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
        const response = await fetch("http://127.0.0.1:5000/login", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            // If login fails (e.g., 401 Unauthorized), the server sends a message
            throw new Error(data.message || 'Login failed');
        }

        // ## JWT: On successful login, store the token
        localStorage.setItem("jwt_token", data.token);
        
        // Redirect to the grade page
        router.push("/grade");

    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
          <Bookmark className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">SmartMarks</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">{t.loginSignup}</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{t.loginSignup}</CardTitle>
            <CardDescription>{t.loginDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t.password}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : t.loginSignup}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}