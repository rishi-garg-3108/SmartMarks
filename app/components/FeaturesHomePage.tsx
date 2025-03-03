"use client"

import { Clock, CheckCircle, Sliders, Layers } from "lucide-react"
import { useLanguage } from "../contexts/LanguageContext"
import { translations } from "../utils/translations"

const features = [
  {
    icon: <Clock className="h-8 w-8 text-primary" />,
    titleKey: "timeSaving",
    descriptionKey: "timeSavingDesc",
  },
  {
    icon: <CheckCircle className="h-8 w-8 text-primary" />,
    titleKey: "accurate",
    descriptionKey: "accurateDesc",
  },
  {
    icon: <Sliders className="h-8 w-8 text-primary" />,
    titleKey: "customizable",
    descriptionKey: "customizableDesc",
  },
  {
    icon: <Layers className="h-8 w-8 text-primary" />,
    titleKey: "seamless",
    descriptionKey: "seamlessDesc",
  },
]

export default function FeaturesHomePage() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-primary">{t.whyChoose}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-accent p-6 rounded-lg shadow-md flex items-start">
              <div className="mr-4 mt-1">{feature.icon}</div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-primary">{t[feature.titleKey]}</h3>
                <p className="text-muted-foreground">{t[feature.descriptionKey]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

