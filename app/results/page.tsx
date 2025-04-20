"use client";

import { useSearchParams } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { translations } from "../utils/translations";
import Header from "../components/Header";
import Footer from "../components/Footer";
import EmailForm from "../components/EmailForm";
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

  // 🔥 NEW: track the index of an image being retried (if any)
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);

  // Fetch results on load
  useEffect(() => {
    async function fetchResults() {
      try {
        const response = await fetch("http://127.0.0.1:5000/get_results");
        if (!response.ok) throw new Error("Failed to fetch results");
        const data = await response.json();

        console.log("DEBUG: API Response from /get_results:", data);

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
        }
      } catch (error) {
        console.error("❌ Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, []);

  // Generate PDF (existing functionality)
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
 // 🔥 NEW: improvements function for a single image
 const handleGetImprovements = (text: string) => {
  // Encode the text to safely include it in a URL
  const encodedText = encodeURIComponent(text);
  // Navigate to the improvements page with the text as a parameter
  router.push(`/improvements?text=${encodedText}`);
};

  // Track individual image loading errors
  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({
      ...prev,
      [index]: true,
    }));
  };

  
  // 🔥 NEW: Retry function for a single image
  const handleRetry = async (index: number) => {
    // The image to reprocess
    const targetImage = results[index].image;
    setRetryingIndex(index); // show "Retrying..." on that item
    
    try {
      const response = await fetch("http://127.0.0.1:5000/retry_image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: targetImage }),
      });

      if (!response.ok) {
        throw new Error(`Retry failed with status ${response.status}`);
      }

      const updatedResult = await response.json();
      console.log("Retry success for image:", targetImage, updatedResult);

      // Merge updated data into results
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
    } catch (error) {
      console.error("❌ Error retrying image:", error);
      alert("Retry failed! Check console for details.");
    } finally {
      setRetryingIndex(null);
    }
  };

  // Render
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-primary">{t.resultsTitle}</h1>

        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            onClick={handleGeneratePDF}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? "Generating PDF..." : "Export to PDF"}
          </Button>

          {pdfUrl && (
            <>
              <a
                href={pdfUrl.replace("generated_pdfs/", "")}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Preview PDF
              </a>
              <a
                href={pdfUrl.replace("generated_pdfs/", "")}
                download
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Download PDF
              </a>
            </>
          )}
        </div>

        {results.map((result, index) => (
          <div
            key={index}
            className="result-container my-6 p-4 border border-gray-300 rounded-md shadow-md"
          >
            <h3 className="text-lg font-bold mb-2">
              Extracted Text for Image {index + 1}:
            </h3>

            {/* Display Image if no load error */}
            {result.image && !imageErrors[index] && (
              <div className="mt-4">
                <h3 className="text-lg font-bold">Uploaded Image:</h3>
                <img
                  src={`http://127.0.0.1:5000/uploads/${result.image}`}
                  alt={`Uploaded Image ${index + 1}`}
                  className="max-w-[400px] max-h-[400px] border border-gray-300 rounded-md shadow-md object-contain"
                  onError={() => {
                    console.error("Image failed to load:", result.image);
                    handleImageError(index);
                  }}
                />
              </div>
            )}

            {/* If image fails to load or missing */}
            {(imageErrors[index] || !result.image) && (
              <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
                <p>Image could not be loaded. Filename: {result.image}</p>
              </div>
            )}

            {/* Extracted Text */}
            <p className="text-black p-3 bg-gray-100 rounded-md mt-4">
              {result.extractedText}
            </p>

            {/* Error Table */}
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
                      <tr
                        key={i}
                        className={`${
                          i % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-gray-200 transition-all duration-150`}
                      >
                        <td className="px-4 py-3 font-bold text-red-600">
                          {error.incorrectText}
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-600">
                          {error.correctText}
                        </td>
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
            <div className="mt-4">

            {/* 🔥 NEW: Improvement Button */}
          <Button 
            onClick={() => handleGetImprovements(result.extractedText)}
            className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
            Get Improvement Suggestions
        </Button>
            </div>

            {/* 🔥 NEW: Retry Button */}
            <div className="mt-4">
              <Button
                onClick={() => handleRetry(index)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                disabled={retryingIndex === index}
              >
                {retryingIndex === index ? "Retrying..." : "Retry"}
              </Button>
            </div>
          </div>
        ))}

        {/* Email Form Section */}
        <div className="mt-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-6 text-center text-primary">
            Send Report by Email
          </h2>
          <div className="max-w-2xl mx-auto">
            <p className="text-center mb-6 text-gray-600">
              Use the form below to send this report to the student's email
              address.
            </p>
            <EmailForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
