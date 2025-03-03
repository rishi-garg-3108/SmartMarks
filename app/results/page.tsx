"use client";

import { useSearchParams } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { translations } from "../utils/translations";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ErrorTableEntry {
  incorrectText: string;
  correctText: string;
  errorCategory: string;
}

interface ResultType {
  extractedText: string;
  errorTable: ErrorTableEntry[];
  image: string;
}

export default function ResultsPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const searchParams = useSearchParams();
  const router = useRouter();

  const studentName = searchParams.get("studentName") || "N/A";
  const studentClass = searchParams.get("studentClass") || "N/A";
  const subject = searchParams.get("subject") || "N/A";

  const [results, setResults] = useState<ResultType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        const response = await fetch("http://127.0.0.1:5000/get_results");
        if (!response.ok) throw new Error("Failed to fetch results");
        const data = await response.json();

        console.log("DEBUG: API Response from /get_results:", data);

        if (data.results && data.results.length > 0) {
          const transformedResults = data.results.map((result) => ({
            ...result,
            errorTable: result.errorTable.map((error: any) => ({
              incorrectText: error["Incorrect Text"],
              correctText: error["Correct Text"],
              errorCategory: error["Error Category"],
            })),
          }));

          setResults(transformedResults);
        } else {
          console.warn("⚠️ No results found in API response:", data);
        }
      } catch (error) {
        console.error("❌ Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, []);

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/generate_pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName,
          studentClass,
          subject,
          results,
        }),
      });
      
      const result = await response.json();

      if (response.ok) {
        setPdfUrl(`http://127.0.0.1:5000/download_pdf/${result.pdfPath}`);
        alert("✅ PDF generated successfully!");
      } else {
        alert(`❌ Error generating PDF: ${result.message}`);
      }
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      alert("There was an error generating the PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-primary">{t.resultsTitle}</h1>

        <Button onClick={handleGeneratePDF} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700" disabled={isGeneratingPDF}>
          {isGeneratingPDF ? "Generating PDF..." : "Export to PDF"}
        </Button>

        {pdfUrl && (
                  <div className="mt-4 flex gap-4">
                    <a
                      href={pdfUrl.replace("generated_pdfs/", "")} // ✅ Ensure correct path
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Preview PDF
                    </a>
                    <a
                      href={pdfUrl.replace("generated_pdfs/", "")} // ✅ Ensure correct path
                      download
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                    >
                      Download PDF
                    </a>
                  </div>
                )}


        {results.map((result, index) => (
          <div key={index} className="result-container my-6 p-4 border border-gray-300 rounded-md shadow-md">
            <h3 className="text-lg font-bold mb-2">Extracted Text for Image {index + 1}:</h3>

            {result.image && (
              <div className="mt-4">
                <h3 className="text-lg font-bold">Uploaded Image:</h3>
                <Image
                  src={`http://127.0.0.1:5000/uploads/${result.image}`}
                  alt={`Uploaded Image ${index + 1}`}
                  width={400}
                  height={400}
                  className="border border-gray-300 rounded-md shadow-md"
                  onError={(e) => console.error("Image failed to load:", e)}
                />
              </div>
            )}

            <p className="text-black p-3 bg-gray-100 rounded-md">{result.extractedText}</p>

            {result.errorTable.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-bold">Error Analysis:</h3>
                <table className="w-full border border-gray-300 rounded-lg shadow-md mt-4 text-sm text-left text-gray-700">
                  <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-red-600">❌ Incorrect</th>
                      <th className="px-4 py-3 text-green-600">✅ Correct</th>
                      <th className="px-4 py-3 text-blue-600">📌 Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errorTable.map((error, i) => (
                      <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-200 transition-all duration-150`}>
                        <td className="px-4 py-3 font-bold text-red-600">{error.incorrectText}</td>
                        <td className="px-4 py-3 font-semibold text-green-600">{error.correctText}</td>
                        <td className="px-4 py-3 font-semibold text-blue-600 flex items-center gap-2">
                          {error.errorCategory === "Spelling" ? "🔠" : "📖"} {error.errorCategory}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </main>
      <Footer />
    </div>
  );
}