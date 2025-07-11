'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ComplexityMetrics {
  language: 'german' | 'english';
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

// German translations
const germanLabels = {
  title: 'Textverbesserungsvorschläge',
  yourText: 'Ihr Text',
  placeholder: 'Geben Sie hier Ihren Text zur Analyse ein...',
  analyzeButton: 'Text analysieren',
  analyzing: 'Analysiere...',
  
  // Metrics
  complexityMetrics: 'Komplexitätsmetriken',
  wordCount: 'Wortanzahl',
  sentenceCount: 'Satzanzahl',
  avgWordsPerSentence: 'Durchschnittl. Wörter pro Satz',
  avgWordLength: 'Durchschnittl. Wortlänge',
  vocabularyDiversity: 'Wortschatzvielfalt',
  commonWords: 'Häufige Wörter',
  
  // Sections
  strengths: 'Stärken',
  styleImprovements: 'Stilverbesserungen',
  vocabularyEnhancements: 'Wortschatz-Verbesserungen',
  structureSuggestions: 'Strukturvorschläge',
  
  // Actions
  exportToPdf: 'Als PDF exportieren',
  generatingPdf: 'Generiere PDF...',
  previewPdf: 'PDF Vorschau',
  downloadPdf: 'PDF herunterladen',
  
  // Messages
  emptyState: 'Geben Sie Ihren Text ein und klicken Sie auf "Text analysieren", um Verbesserungsvorschläge zu erhalten',
  noDataAvailable: 'Keine Daten verfügbar',
  enterText: 'Bitte geben Sie Text zur Analyse ein',
  analysisFailed: 'Textanalyse fehlgeschlagen. Bitte versuchen Sie es erneut.',
  parseFailed: 'Fehler beim Verarbeiten der Verbesserungsvorschläge',
  pdfFailed: 'PDF-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut.',
  
  // Language indicator
  detectedLanguage: 'Erkannte Sprache',
  deutsch: 'Deutsch',
  english: 'Englisch'
};

// English translations
const englishLabels = {
  title: 'Text Improvement Suggestions',
  yourText: 'Your Text',
  placeholder: 'Enter or paste your text here for analysis...',
  analyzeButton: 'Analyze Text',
  analyzing: 'Analyzing...',
  
  // Metrics
  complexityMetrics: 'Complexity Metrics',
  wordCount: 'Word Count',
  sentenceCount: 'Sentence Count',
  avgWordsPerSentence: 'Avg Words per Sentence',
  avgWordLength: 'Avg Word Length',
  vocabularyDiversity: 'Vocabulary Diversity',
  commonWords: 'Common Words',
  
  // Sections
  strengths: 'Strengths',
  styleImprovements: 'Style Improvements',
  vocabularyEnhancements: 'Vocabulary Enhancements',
  structureSuggestions: 'Structure Suggestions',
  
  // Actions
  exportToPdf: 'Export to PDF',
  generatingPdf: 'Generating PDF...',
  previewPdf: 'Preview PDF',
  downloadPdf: 'Download PDF',
  
  // Messages
  emptyState: 'Enter your text and click "Analyze Text" to get improvement suggestions',
  noDataAvailable: 'No data available',
  enterText: 'Please enter some text to analyze',
  analysisFailed: 'Failed to analyze text. Please try again.',
  parseFailed: 'Failed to parse improvement suggestions',
  pdfFailed: 'PDF generation failed. Please try again.',
  
  // Language indicator
  detectedLanguage: 'Detected Language',
  deutsch: 'German',
  english: 'English'
};

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
  const [detectedLanguage, setDetectedLanguage] = useState<'german' | 'english' | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* PDF-related state */
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  /* ───────────────────── Auth Check and Hydration ──────────── */
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      router.push('/login');
      return;
    }
    setMounted(true);
    const textParam = searchParams.get('text');
    if (textParam) setOriginalText(decodeURIComponent(textParam));
  }, [router, searchParams]);

  /* ───────── parse improvement_suggestions and detect language ──── */
  useEffect(() => {
    if (improvements?.improvement_suggestions) {
      try {
        const parsed =
          typeof improvements.improvement_suggestions === 'string'
            ? JSON.parse(improvements.improvement_suggestions)
            : improvements.improvement_suggestions;
        setParsedSuggestions(parsed);
        
        // Set detected language from complexity metrics
        if (improvements.complexity_metrics.language) {
          setDetectedLanguage(improvements.complexity_metrics.language);
        }
      } catch (err) {
        console.error('Error parsing suggestions:', err);
        const labels = getLabels();
        setError(labels.parseFailed);
      }
    }
  }, [improvements]);

  /* ───────────────────────── Get Labels Based on Detected Language ───────────────────────── */
  const getLabels = () => {
    if (detectedLanguage === 'german') {
      return germanLabels;
    }
    return englishLabels;
  };

  /* ───────────────────────── handlers ───────────────────────── */
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setOriginalText(e.target.value);

  const analyzeText = async () => {
    if (!originalText.trim()) {
      const labels = getLabels();
      setError(labels.enterText);
      return;
    }
    setLoading(true);
    setError(null);
    setImprovements(null);
    setParsedSuggestions(null);
    setPdfUrl(null);
    setDetectedLanguage(null);

    const token = localStorage.getItem('jwt_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('http://localhost/api/get_improvements', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: originalText }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setImprovements(data.improvements);
    } catch (err) {
      console.error(err);
      // Use default English labels for errors during analysis
      setError(englishLabels.analysisFailed);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGeneratePDF = async () => {
    if (!improvements || !parsedSuggestions) return;
    setPdfGenerating(true);
    setError(null);

    const token = localStorage.getItem('jwt_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('http://localhost/api/improvements_pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: originalText, improvements }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const data: PdfResponse = await res.json();
      setPdfUrl(`http://localhost/api/download_pdf/${data.pdfPath}`);
    } catch (err) {
      console.error(err);
      const labels = getLabels();
      setError(labels.pdfFailed);
    } finally {
      setPdfGenerating(false);
    }
  };

  const labels = getLabels();

  /* ─────────────────────────── UI ───────────────────────────── */
  return (
    <>
      {mounted && (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-primary">
                {labels.title}
              </h1>
              {detectedLanguage && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {labels.detectedLanguage}:
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    detectedLanguage === 'german' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {detectedLanguage === 'german' ? labels.deutsch : labels.english}
                  </span>
                </div>
              )}
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* ── left: textarea ────────────────────────────────── */}
              <div>
                <h2 className="text-xl font-semibold mb-3">{labels.yourText}</h2>
                <textarea
                  className="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={originalText}
                  onChange={handleTextChange}
                  placeholder={labels.placeholder}
                />
                <Button
                  onClick={analyzeText}
                  className="mt-3 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? labels.analyzing : labels.analyzeButton}
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
                        {labels.complexityMetrics}
                      </h3>
                      <ul className="space-y-1">
                        <li>
                          <span className="font-medium">{labels.wordCount}:</span>{' '}
                          {improvements.complexity_metrics.word_count}
                        </li>
                        <li>
                          <span className="font-medium">{labels.sentenceCount}:</span>{' '}
                          {improvements.complexity_metrics.sentence_count}
                        </li>
                        <li>
                          <span className="font-medium">{labels.avgWordsPerSentence}:</span>{' '}
                          {improvements.complexity_metrics.avg_words_per_sentence}
                        </li>
                        <li>
                          <span className="font-medium">{labels.avgWordLength}:</span>{' '}
                          {improvements.complexity_metrics.avg_word_length}
                        </li>
                        <li>
                          <span className="font-medium">{labels.vocabularyDiversity}:</span>{' '}
                          {improvements.complexity_metrics.vocabulary_diversity}%
                        </li>
                        <li>
                          <span className="font-medium">{labels.commonWords}:</span>{' '}
                          {improvements.complexity_metrics.common_words.map(
                            ([word, count]) => (
                              <span
                                key={word}
                                className="inline-block px-2 py-1 mr-2 mt-1 bg-black rounded-md text-sm text-white"
                              >
                                {word} ({count})
                              </span>
                            ),
                          )}
                        </li>
                      </ul>
                    </Card>

                    {/* Suggestions cards */}
                    {parsedSuggestions && (
                      <>
                        {/* Strengths Card */}
                        <Card className="p-4 mb-4 bg-green-50">
                          <h3 className="text-lg font-medium mb-2 text-white bg-green-800 p-2 rounded">
                            {labels.strengths}
                          </h3>
                          <ul className="list-disc list-inside space-y-1">
                            {parsedSuggestions.strengths?.length ? (
                              parsedSuggestions.strengths.map(
                                (s, i) => (
                                  <li key={i} className="text-green-700">
                                    {s}
                                  </li>
                                ),
                              )
                            ) : (
                              <li className="text-green-700">{labels.noDataAvailable}</li>
                            )}
                          </ul>
                        </Card>

                        {/* Style Improvements */}
                        <Card className="p-4 mb-4 bg-blue-50">
                          <h3 className="text-lg font-medium mb-2 text-white bg-blue-800 p-2 rounded">
                            {labels.styleImprovements}
                          </h3>
                          <ul className="list-disc list-inside space-y-1">
                            {parsedSuggestions.style_improvements?.length ? (
                              parsedSuggestions.style_improvements.map(
                                (s, i) => (
                                  <li key={i} className="text-blue-700">
                                    {s}
                                  </li>
                                ),
                              )
                            ) : (
                              <li className="text-blue-700">{labels.noDataAvailable}</li>
                            )}
                          </ul>
                        </Card>

                        {/* Vocabulary Enhancements */}
                        <Card className="p-4 mb-4 bg-purple-50">
                          <h3 className="text-lg font-medium mb-2 text-white bg-purple-800 p-2 rounded">
                            {labels.vocabularyEnhancements}
                          </h3>
                          {parsedSuggestions.vocabulary_enhancements?.length ? (
                            <ul className="space-y-2">
                              {parsedSuggestions.vocabulary_enhancements.map(
                                (item, i) => (
                                  <li
                                    key={i}
                                    className="border-l-2 border-purple-300 pl-3 text-purple-700"
                                  >
                                    <span className="font-medium">
                                      {item.original}
                                    </span>{' '}
                                    → {item.suggestions.join(', ')}
                                  </li>
                                ),
                              )}
                            </ul>
                          ) : (
                            <div className="text-purple-700">{labels.noDataAvailable}</div>
                          )}
                        </Card>

                        {/* Structure Suggestions */}
                        <Card className="p-4 mb-4 bg-orange-50">
                          <h3 className="text-lg font-medium mb-2 text-white bg-orange-800 p-2 rounded">
                            {labels.structureSuggestions}
                          </h3>
                          <ul className="list-disc list-inside space-y-1">
                            {parsedSuggestions.structure_suggestions?.length ? (
                              parsedSuggestions.structure_suggestions.map(
                                (s, i) => (
                                  <li key={i} className="text-orange-700">
                                    {s}
                                  </li>
                                ),
                              )
                            ) : (
                              <li className="text-orange-700">{labels.noDataAvailable}</li>
                            )}
                          </ul>
                        </Card>
                      </>
                    )}

                    {/* PDF buttons */}
                    <div className="mt-6 flex gap-4">
                      <Button
                        onClick={handleGeneratePDF}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={pdfGenerating}
                      >
                        {pdfGenerating ? labels.generatingPdf : labels.exportToPdf}
                      </Button>

                      {pdfUrl && (
                        <>
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                          >
                            {labels.previewPdf}
                          </a>
                          <a
                            href={pdfUrl}
                            download
                            className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
                          >
                            {labels.downloadPdf}
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
                      {labels.emptyState}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </main>
          <Footer />
        </div>
      )}
    </>
  );
}