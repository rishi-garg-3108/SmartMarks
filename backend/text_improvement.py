import openai
import re
from collections import Counter
from dotenv import load_dotenv

load_dotenv()


def detect_language_with_openai(text):
    """Detect language using OpenAI"""
    try:
        system_prompt = """You are a language detection expert. Analyze the given text and determine if it's written in German or English.

Respond with ONLY ONE WORD:
- "german" if the text is in German
- "english" if the text is in English

Consider grammar patterns, vocabulary, and sentence structure."""

        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Detect the language: {text[:300]}"}
            ],
            max_tokens=10,
            temperature=0
        )
        
        detected_language = response.choices[0].message.content.strip().lower()
        return detected_language if detected_language in ['german', 'english'] else 'english'
        
    except Exception as e:
        print(f"Language detection failed: {str(e)}")
        # Simple fallback
        german_words = ['der', 'die', 'das', 'und', 'ist', 'mit', 'zu', 'auf', 'für', 'von']
        english_words = ['the', 'and', 'is', 'to', 'of', 'a', 'in', 'that', 'for', 'with']
        
        text_lower = text.lower()
        german_count = sum(1 for word in german_words if word in text_lower)
        english_count = sum(1 for word in english_words if word in text_lower)
        
        return 'german' if german_count > english_count else 'english'


def analyze_text_complexity(text):
    """Calculate various text complexity metrics using basic string operations"""
    # Detect language first
    language = detect_language_with_openai(text)
    
    # Simple sentence tokenization by splitting on periods, exclamation points, and question marks
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]

    # Simple word tokenization by splitting on whitespace
    words = [w for w in re.split(r"\s+", text) if w]

    # Word count
    word_count = len(words)

    # Sentence count
    sentence_count = len(sentences)

    # Average words per sentence
    avg_words_per_sentence = word_count / max(sentence_count, 1)

    # Average word length
    avg_word_length = sum(len(word) for word in words) / max(word_count, 1)

    # Word frequency
    word_freq = Counter(word.lower() for word in words if len(word) > 3)
    common_words = word_freq.most_common(5)

    # Vocabulary diversity (unique words / total words)
    vocabulary_diversity = len(set(word.lower() for word in words)) / max(word_count, 1)

    return {
        "language": language,
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_words_per_sentence": round(avg_words_per_sentence, 1),
        "avg_word_length": round(avg_word_length, 1),
        "vocabulary_diversity": round(vocabulary_diversity * 100, 1),
        "common_words": common_words,
    }


def generate_improvement_suggestions(text):
    """Generate text improvement suggestions using GPT in detected language"""
    # Detect language
    language = detect_language_with_openai(text)
    
    if language == 'german':
        system_prompt = """Du bist ein Experte für Schreibberatung. Analysiere den Text und gib folgende Verbesserungsvorschläge auf Deutsch:

1. Stilverbesserungen: Schlage 3 spezifische Wege vor, um den Schreibstil zu verbessern (Klarheit, Prägnanz, Tonfall)
2. Wortschatz-Verbesserungen: Identifiziere 3-5 gewöhnliche oder schwache Wörter, die durch präzisere oder anspruchsvollere Alternativen ersetzt werden könnten. Formatiere GENAU als Array von Objekten mit "original" und "suggestions".
3. Strukturvorschläge: Empfehle Verbesserungen für Absatzstruktur, Übergänge oder Textfluss
4. Stärken: Nenne 2 positive Aspekte des Textes

Formatiere deine Antwort als strukturiertes JSON mit diesen Abschnitten:
{
  "style_improvements": ["Stilverbesserung 1", "Stilverbesserung 2", "Stilverbesserung 3"],
  "vocabulary_enhancements": [
    {
      "original": "gut",
      "suggestions": ["ausgezeichnet", "hervorragend", "vorzüglich"]
    }
  ],
  "structure_suggestions": ["Strukturvorschlag 1", "Strukturvorschlag 2"],
  "strengths": ["Stärke 1", "Stärke 2"]
}

Antworte ausschließlich auf Deutsch."""
        
        user_message = f"Analysiere diesen deutschen Text: {text}"
        
    else:
        system_prompt = """You are an expert writing coach. Analyze the text and provide:
1. Style Improvements: Suggest 3 specific ways to improve writing style (clarity, conciseness, tone)
2. Vocabulary Enhancements: Identify 3-5 common or weak words that could be replaced with more precise or sophisticated alternatives. Format EXACTLY as an array of objects, each with "original" (the original word) and "suggestions" (an array of better word alternatives).
3. Structure Suggestions: Recommend improvements to paragraph structure, transitions, or flow
4. Strengths: Note 2 positive aspects of the writing

Format your response as a structured JSON with these sections:
{
  "style_improvements": ["Style improvement 1", "Style improvement 2", "Style improvement 3"],
  "vocabulary_enhancements": [
    {
      "original": "good",
      "suggestions": ["excellent", "outstanding", "superb"]
    }
  ],
  "structure_suggestions": ["Structure suggestion 1", "Structure suggestion 2"],
  "strengths": ["Strength 1", "Strength 2"]
}"""
        
        user_message = f"Analyze this text: {text}"

    # Call GPT-4o with the text
    try:
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
        )

        # Parse the JSON response
        suggestions = response.choices[0].message.content
        return suggestions
    except Exception as e:
        print(f"Error generating suggestions: {str(e)}")
        
        # Return error messages in appropriate language
        if language == 'german':
            return {
                "style_improvements": ["Fehler beim Generieren der Stilvorschläge"],
                "vocabulary_enhancements": [],
                "structure_suggestions": ["Fehler beim Generieren der Strukturvorschläge"],
                "strengths": ["Textanalyse nicht verfügbar"],
            }
        else:
            return {
                "style_improvements": ["Error generating style suggestions"],
                "vocabulary_enhancements": [],
                "structure_suggestions": ["Error generating structure suggestions"],
                "strengths": ["Text analysis unavailable"],
            }


def get_text_improvements(text):
    """Main function to get all text improvements"""
    # Get basic text complexity metrics (includes language detection)
    complexity_metrics = analyze_text_complexity(text)

    # Get GPT-generated improvement suggestions (detects language again for consistency)
    suggestions_json = generate_improvement_suggestions(text)

    # Combine all results
    return {
        "complexity_metrics": complexity_metrics,
        "improvement_suggestions": suggestions_json,
    }