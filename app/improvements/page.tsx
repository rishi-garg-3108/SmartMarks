'use client';

import { useState, useEffect } from 'react';


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
  vocabulary_enhancements: Array<{
    original: string;
    suggestions: string[];
  }>;
  structure_suggestions: string[];
  strengths: string[];
}

interface Improvements {
  complexity_metrics: ComplexityMetrics;
  improvement_suggestions: string; // This will be a JSON string we need to parse
}

export default function ImprovementsPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [originalText, setOriginalText] = useState<string>('');
  const [improvements, setImprovements] = useState<Improvements | null>(null);
  const [parsedSuggestions, setParsedSuggestions] = useState<ImprovementSuggestions | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Get text from URL parameter if available
    const textParam = searchParams.get('text');
    if (textParam) {
      setOriginalText(decodeURIComponent(textParam));
    }
  }, [searchParams]);

  // Parse the JSON string when improvements are loaded
  useEffect(() => {
    if (improvements?.improvement_suggestions) {
      try {
        const parsed = typeof improvements.improvement_suggestions === 'string' 
          ? JSON.parse(improvements.improvement_suggestions) 
          : improvements.improvement_suggestions;
        
        setParsedSuggestions(parsed);
      } catch (err) {
        console.error('Error parsing suggestions:', err);
        setError('Failed to parse improvement suggestions');
      }
    }
  }, [improvements]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setOriginalText(e.target.value);
  };

  const analyzeText = async () => {
    if (!originalText.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/get_improvements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: originalText }),
      });

      if (!response.ok) {
        throw new Error('Failed to get improvements');
      }

      const data = await response.json();
      setImprovements(data.improvements);
    } catch (err) {
      console.error('Error analyzing text:', err);
      setError('Failed to analyze text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LanguageProvider>
      {mounted && (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-primary">Text Improvement Suggestions</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                  {loading ? 'Analyzing...' : 'Analyze Text'}
                </Button>
                
                {error && (
                  <div className="mt-3 p-3 bg-red-100 text-red-800 rounded-md">
                    {error}
                  </div>
                )}
              </div>
              
              <div>
                {improvements && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Text Analysis</h2>
                    <Card className="p-4 mb-4">
                      <h3 className="text-lg font-medium mb-2">Complexity Metrics</h3>
                      <ul className="space-y-1">
                        <li><span className="font-medium">Word Count:</span> {improvements.complexity_metrics.word_count}</li>
                        <li><span className="font-medium">Sentence Count:</span> {improvements.complexity_metrics.sentence_count}</li>
                        <li><span className="font-medium">Avg. Words per Sentence:</span> {improvements.complexity_metrics.avg_words_per_sentence}</li>
                        <li><span className="font-medium">Avg. Word Length:</span> {improvements.complexity_metrics.avg_word_length} characters</li>
                        <li><span className="font-medium">Vocabulary Diversity:</span> {improvements.complexity_metrics.vocabulary_diversity}%</li>
                        <li>
                          <span className="font-medium">Common Words:</span>{' '}
                          {improvements.complexity_metrics.common_words.map(([word, count]) => (
                            <span key={word} className="inline-block px-2 py-1 mr-2 mt-1 bg-gray-100 rounded-md text-sm">
                              {word} ({count})
                            </span>
                          ))}
                        </li>
                      </ul>
                    </Card>
                    
                    {parsedSuggestions && (
                      <>
                        <Card className="p-4 mb-4 bg-green-50">
                          <h3 className="text-lg font-medium mb-2 text-green-800">Strengths</h3>
                          <ul className="list-disc list-inside space-y-1">
  {parsedSuggestions.strengths && Array.isArray(parsedSuggestions.strengths) ? 
    parsedSuggestions.strengths.map((strength, index) => (
      <li key={index} className="text-green-700">{strength}</li>
    )) : 
    <li>No strengths data available</li>
  }
</ul>
                        </Card>
                        
                        <Card className="p-4 mb-4">
                          <h3 className="text-lg font-medium mb-2 text-blue-800">Style Improvements</h3>
                          <ul className="list-disc list-inside space-y-1">
                          {parsedSuggestions.strengths && Array.isArray(parsedSuggestions.strengths) ? 

                            parsedSuggestions.style_improvements.map((improvement, index) => (
                              <li key={index}>{improvement}</li>
                             )) : 
                            <li>No strengths data available</li>
                                 }
                          </ul>
                        </Card>
                        
                        <Card className="p-4 mb-4">
  <h3 className="text-lg font-medium mb-2 text-purple-800">Vocabulary Enhancements</h3>
  {parsedSuggestions?.vocabulary_enhancements ? (
    Array.isArray(parsedSuggestions.vocabulary_enhancements) ? (
      <ul className="space-y-2">
        {parsedSuggestions.vocabulary_enhancements.map((item, index) => (
          <li key={index} className="border-l-2 border-purple-300 pl-3">
            <span className="font-medium">{item.original}</span> → {Array.isArray(item.suggestions) ? item.suggestions.join(', ') : item.suggestions}
          </li>
        ))}
      </ul>
    ) : (
      <ul className="list-disc list-inside space-y-1">
        {Object.entries(parsedSuggestions.vocabulary_enhancements).map(([word, alternatives], index) => (
          <li key={index}>
            <span className="font-medium">{word}</span> → {Array.isArray(alternatives) ? alternatives.join(', ') : alternatives}
          </li>
        ))}
      </ul>
    )
  ) : (
    <div>No vocabulary enhancements available</div>
  )}
</Card>

<Card className="p-4">
  <h3 className="text-lg font-medium mb-2 text-orange-800">Structure Suggestions</h3>
  <ul className="list-disc list-inside space-y-1">
    {parsedSuggestions?.structure_suggestions && Array.isArray(parsedSuggestions.structure_suggestions) ? (
      parsedSuggestions.structure_suggestions.map((suggestion, index) => (
        <li key={index}>{suggestion}</li>
      ))
    ) : (
      <li>No structure suggestions available</li>
    )}
  </ul>
</Card>
 
                        
                      </>
                    )}
                  </div>
                )}

                {!improvements && !loading && !error && (
                  <div className="h-full flex items-center justify-center border border-dashed border-gray-300 rounded-md p-8">
                    <p className="text-gray-500 text-center">
                      Enter your text and click "Analyze Text" to get improvement suggestions
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