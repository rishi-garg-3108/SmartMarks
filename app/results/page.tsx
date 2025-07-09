"use client";

import { useSearchParams } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { translations } from "../utils/translations";
import Header from "../components/Header";
import Footer from "../components/Footer";
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

  // Reading the params from URL
  const studentName = searchParams.get("studentName") || "N/A";
  const studentClass = searchParams.get("studentClass") || "N/A";
  const subject = searchParams.get("subject") || "N/A";

  // Main results state
  const [results, setResults] = useState<ResultType[]>([]);
  const [loading, setLoading] = useState(true);

  // PDF generation states
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Track image load errors
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);

  // NEW: State for persistent error and success messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch results on load
  useEffect(() => {
    async function fetchResults() {
      // JWT: Get token from local storage
      const token = localStorage.getItem("jwt_token");

      // Redirect to login if no token is found
      if (!token) {
        router.push("/login");
        return;
      }
      
      try {
        const response = await fetch("http://localhost/api/get_results", {
          // JWT: Add authorization header to the request
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch results");
        }
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const transformedResults = data.results.map((result: any) => ({
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
          setErrorMessage("No results were found for this submission.");
        }
      } catch (error: any) {
        console.error("❌ Error fetching results:", error);
        // NEW: Set the persistent error message
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [router]);

  // Generate PDF
  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    // NEW: Clear previous messages before starting
    setErrorMessage(null);
    setSuccessMessage(null);

    // JWT: Get the token
    const token = localStorage.getItem("jwt_token");

    try {
      const response = await fetch("http://localhost/api/generate_pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // JWT: Add authorization header
          'Authorization': `Bearer ${token}`
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
        setPdfUrl(`http://localhost/api/download_pdf/${result.pdfPath}`);
        // NEW: Set a success message instead of alert
        setSuccessMessage("PDF generated successfully!");
      } else {
        // NEW: Set an error message instead of alert
        throw new Error(result.message || "Error generating PDF");
      }
    } catch (error: any) {
      console.error("❌ Error generating PDF:", error);
      // NEW: Set the persistent error message
      setErrorMessage(error.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  const handleGetImprovements = (text: string) => {
    const encodedText = encodeURIComponent(text);
    router.push(`/improvements?text=${encodedText}`);
  };

  const handleRetry = async (index: number) => {
    const targetImage = results[index].image;
    setRetryingIndex(index);
    // NEW: Clear previous messages
    setErrorMessage(null);
    setSuccessMessage(null);

    // JWT: Get the token
    const token = localStorage.getItem("jwt_token");

    try {
      const response = await fetch("http://localhost/api/retry_image",  {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // JWT: Add authorization header
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image: targetImage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Retry failed with status ${response.status}`);
      }

      const updatedResult = await response.json();

      setResults((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                extractedText: updatedResult.extractedText,
                errorTable: updatedResult.errorTable.map((err: any) => ({
                  incorrectText: err["Incorrect Text"],
                  correctText: err["Correct Text"],
                  errorCategory: err["Error Category"],
                })),
              }
            : item
        )
      );
      // NEW: Add a success message for the retry
      setSuccessMessage(`Successfully re-analyzed image ${index + 1}.`);

    } catch (error: any) {
      console.error("❌ Error retrying image:", error);
      // NEW: Set the persistent error message
      setErrorMessage(error.message);
    } finally {
      setRetryingIndex(null);
    }
  };

  if (loading) {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <p>Loading results...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-primary">{t.resultsTitle}</h1>

        {/* NEW: Persistent Message Display Area */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md relative" role="alert">
            <strong className="font-bold">Success: </strong>
            <span className="block sm:inline">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-8">
          <Button onClick={handleGeneratePDF} disabled={isGeneratingPDF}>
            {isGeneratingPDF ? "Generating PDF..." : "Export to PDF"}
          </Button>

          {pdfUrl && (
            <>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                Preview PDF
              </a>
              <a href={pdfUrl} download className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                Download PDF
              </a>
            </>
          )}
        </div>
        
        {/* The rest of the page remains the same */}
        {results.map((result, index) => (
          <div key={index} className="result-container my-6 p-4 border rounded-md shadow-md">
            <h3 className="text-lg font-bold mb-2">Results for Image {index + 1}:</h3>
            {result.image && !imageErrors[index] && (
              <div className="mt-4">
                <h3 className="text-lg font-bold">Uploaded Image:</h3>
                <img
                  src={`http://localhost/api/uploads/${result.image}`}
                  alt={`Uploaded Image ${index + 1}`}
                  className="max-w-[400px] max-h-[400px] border rounded-md shadow-md object-contain"
                  onError={() => handleImageError(index)}
                />
              </div>
            )}
            {(imageErrors[index] || !result.image) && (
              <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
                <p>Image could not be loaded. Filename: {result.image}</p>
              </div>
            )}
            <p className="text-black p-3 bg-gray-100 rounded-md mt-4">{result.extractedText}</p>
            {result.errorTable.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-bold">Error Analysis:</h3>
                <table className="w-full border rounded-lg shadow-md mt-4 text-sm text-left">
                  <thead className="bg-gray-100 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-red-600">❌ Incorrect</th>
                      <th className="px-4 py-3 text-green-600">✅ Correct</th>
                      <th className="px-4 py-3 text-blue-600">📌 Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errorTable.map((error, i) => (
                      <tr key={i} className="hover:bg-gray-200">
                        <td className="px-4 py-3 font-bold text-red-600">{error.incorrectText}</td>
                        <td className="px-4 py-3 font-semibold text-green-600">{error.correctText}</td>
                        <td className="px-4 py-3 font-semibold text-blue-600 flex items-center gap-2">
                          {error.errorCategory === "Spelling" ? "🔠" : "📖"}{" "}
                          {error.errorCategory}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-4">
              <Button onClick={() => handleGetImprovements(result.extractedText)} className="bg-purple-500 hover:bg-purple-700">
                Get Improvement Suggestions
              </Button>
              <Button onClick={() => handleRetry(index)} disabled={retryingIndex === index} className="bg-orange-500 hover:bg-orange-700">
                {retryingIndex === index ? "Retrying..." : "Retry Analysis"}
              </Button>
            </div>
          </div>
        ))}
      </main>
      <Footer />
    </div>
  );
}