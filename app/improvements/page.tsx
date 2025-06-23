'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSearchParams } from 'next/navigation';
import { LanguageProvider } from '../contexts/LanguageContext';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ComplexityMetrics {
  word_count: number;
  sentence_count: number;
  avg_words_per_sentence: number;
  avg_word_length: number;
  vocabulary_diversity: number;
  common_words: [string, number][];
}

interface ImprovementSuggestions {
  style_improvements: string[];
  vocabulary_enhancements: Array<{ original: string; suggestions: string[] }>;
  structure_suggestions: string[];
  strengths: string[];
}

interface Improvements {
  complexity_metrics: ComplexityMetrics;
  improvement_suggestions: string; // returned as JSON string
}

interface PdfResponse {
  pdfPath: string;
}

export default function ImprovementsPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const searchParams = useSearchParams();
  const router = useRouter();

  /* ─────────────────────────── state ────────────────────────── */
  const [mounted, setMounted] = useState(false);
  const [originalText, setOriginalText] = useState<string>('');
  const [improvements, setImprovements] = useState<Improvements | null>(null);
  const [parsedSuggestions, setParsedSuggestions] = useState<ImprovementSuggestions | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* PDF-related state */
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  /* ───────────────────── JWT Authentication Check ──────────── */
  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      router.push("/login");
      return;
    }
  }, [router]);

  /* ───────────────────── hydrate and pre-fill text ──────────── */
  useEffect(() => {
    setMounted(true);
    const textParam = searchParams.get('text');
    if (textParam) setOriginalText(decodeURIComponent(textParam));
  }, [searchParams]);

  /* ───────── parse improvement_suggestions whenever loaded ──── */
  useEffect(() => {
    if (improvements?.improvement_suggestions) {
      try {
        const parsed =
          typeof improvements.improvement_suggestions === 'string'
            ? JSON.parse(improvements.improvement_suggestions)
            : improvements.improvement_suggestions;
        setParsedSuggestions(parsed);
      } catch (err) {
        console.error('Error parsing suggestions:', err);
        setError('Failed to parse improvement suggestions');
      }
    }
  }, [improvements]);

  /* ───────────────────────── handlers ───────────────────────── */

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setOriginalText(e.target.value);

  const analyzeText = async () => {
    if (!originalText.trim()) {
      setError('Please enter some text to analyze');
      return;
    }
    setLoading(true);
    setError(null);
    setImprovements(null);
    setParsedSuggestions(null);
    setPdfUrl(null);

    // Get JWT token
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_improvements`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: originalText }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          localStorage.removeItem("jwt_token");
          router.push("/login");
          return;
        }
        throw new Error(`Request failed with status ${res.status}`);
      }
      
      const data = await res.json();
      setImprovements(data.improvements);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* 🔥 Generate PDF */
  const handleGeneratePDF = async () => {
    if (!improvements || !parsedSuggestions) return;
    setPdfGenerating(true);
    setError(null);

    // Get JWT token
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/improvements_pdf`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: originalText, improvements }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("jwt_token");
          router.push("/login");
          return;
        }
        throw new Error(`PDF generation failed with status ${res.status}`);
      }
      
      const data: PdfResponse = await res.json();
      setPdfUrl(`${process.env.NEXT_PUBLIC_API_URL}/download_pdf/${data.pdfPath}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'PDF generation failed. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  /* ─────────────────────────── UI ───────────────────────────── */
  return (
    <LanguageProvider>
      {mounted && (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-primary">
              Text Improvement Suggestions
            </h1>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* ── left: textarea ────────────────────────────────── */}
              <div>
                <h2 className="text-xl font-semibold mb-3">Your Text</h2>
                <textarea
                  className="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={originalText}
                  onChange={handleTextChange}
                  placeholder="Enter or paste your text here for analysis..."
                />
                <Button
                  onClick={analyzeText}
                  className="mt-3 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Analyzing…' : 'Analyze Text'}
                </Button>

                {error && (
                  <div className="mt-3 p-3 bg-red-100 text-red-800 rounded-md">
                    {error}
                  </div>
                )}
              </div>

              {/* ── right: analysis cards ─────────────────────────── */}
              <div>
                {improvements && (
                  <>
                    {/* Complexity Metrics */}
                    <Card className="p-4 mb-4">
                      <h3 className="text-lg font-medium mb-2">
                        Complexity Metrics
                      </h3>
                      <ul className="space-y-1">
                        <li>
                          <span className="font-medium">Word Count:</span>{' '}
                          {improvements.complexity_metrics.word_count}
                        </li>
                        <li>
                          <span className="font-medium">Sentence Count:</span>{' '}
                          {improvements.complexity_metrics.sentence_count}
                        </li>
                        <li>
                          <span className="font-medium">Avg Words/Sentence:</span>{' '}
                          {improvements.complexity_metrics.avg_words_per_sentence?.toFixed(1)}
                        </li>
                        <li>
                          <span className="font-medium">Avg Word Length:</span>{' '}
                          {improvements.complexity_metrics.avg_word_length?.toFixed(1)}
                        </li>
                        <li>
                          <span className="font-medium">Vocabulary Diversity:</span>{' '}
                          {improvements.complexity_metrics.vocabulary_diversity?.toFixed(1)}%
                        </li>
                        <li>
                          <span className="font-medium">Common Words:</span>{' '}
                          {improvements.complexity_metrics.common_words?.map(
                            ([word, count]) => (
                              <span
                                key={word}
                                className="inline-block px-2 py-1 mr-2 mt-1 bg-gray-800 rounded-md text-sm text-white"
                              >
                                {word} ({count})
                              </span>
                            ),
                          )}
                        </li>
                      </ul>
                    </Card>

                    {/* Suggestions cards (render only if parsed ok) */}
                    {parsedSuggestions && (
                      <>
                        {/* Strengths Card */}
                        <Card className="p-4 mb-4 bg-green-50">
                          <h3 className="text-lg font-medium mb-2 text-white bg-green-800 p-2 rounded">
                            Strengths
                          </h3>
                          <ul className="list-disc list-inside space-y-1">
                            {parsedSuggestions.strengths?.length ? (
                              parsedSuggestions.strengths.map((s, i) => (
                                <li key={i} className="text-green-700">
                                  {s}
                                </li>
                              ))
                            ) : (
                              <li className="text-green-700">No strengths data available</li>
                            )}
                          </ul>
                        </Card>

                        {/* Style Improvements */}
                        <Card className="p-4 mb-4 bg-blue-50">
                          <h3 className="text-lg font-medium mb-2 text-white bg-blue-800 p-2 rounded">
                            Style Improvements
                          </h3>
                          <ul className="list-disc list-inside space-y-1">
                            {parsedSuggestions.style_improvements?.length ? (
                              parsedSuggestions.style_improvements.map((s, i) => (
                                <li key={i} className="text-blue-700">
                                  {s}
                                </li>
                              ))
                            ) : (
                              <li className="text-blue-700">No style improvements available</li>
                            )}
                          </ul>
                        </Card>

                        {/* Vocabulary Enhancements */}
                        <Card className="p-4 mb-4 bg-purple-50">
                          <h3 className="text-lg font-medium mb-2 text-white bg-purple-800 p-2 rounded">
                            Vocabulary Enhancements
                          </h3>
                          {parsedSuggestions.vocabulary_enhancements?.length ? (
                            <ul className="space-y-2">
                              {parsedSuggestions.vocabulary_enhancements.map((item, i) => (
                                <li
                                  key={i}
                                  className="border-l-2 border-purple-300 pl-3 text-purple-700"
                                >
                                  <span className="font-medium">
                                    {item.original}
                                  </span>{' '}
                                  → {item.suggestions.join(', ')}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-purple-700">No vocabulary enhancements available</div>
                          )}
                        </Card>

                        {/* Structure Suggestions */}
                        <Card className="p-4 mb-4 bg-orange-50">
                          <h3 className="text-lg font-medium mb-2 text-white bg-orange-800 p-2 rounded">
                            Structure Suggestions
                          </h3>
                          <ul className="list-disc list-inside space-y-1">
                            {parsedSuggestions.structure_suggestions?.length ? (
                              parsedSuggestions.structure_suggestions.map((s, i) => (
                                <li key={i} className="text-orange-700">
                                  {s}
                                </li>
                              ))
                            ) : (
                              <li className="text-orange-700">No structure suggestions available</li>
                            )}
                          </ul>
                        </Card>
                      </>
                    )}

                    {/* 🔥 PDF buttons */}
                    <div className="mt-6 flex gap-4">
                      <Button
                        onClick={handleGeneratePDF}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={pdfGenerating}
                      >
                        {pdfGenerating ? 'Generating PDF…' : 'Export to PDF'}
                      </Button>

                      {pdfUrl && (
                        <>
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                          >
                            Preview PDF
                          </a>
                          <a
                            href={pdfUrl}
                            download
                            className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
                          >
                            Download PDF
                          </a>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Empty state */}
                {!improvements && !loading && !error && (
                  <div className="h-full flex items-center justify-center border border-dashed border-gray-300 rounded-md p-8">
                    <p className="text-gray-500 text-center">
                      Enter your text and click "Analyze Text" to get
                      improvement suggestions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </main>
          <Footer />
        </div>
      )}
    </LanguageProvider>
  );
}