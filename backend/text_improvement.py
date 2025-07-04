import openai
import re
from collections import Counter
from dotenv import load_dotenv

load_dotenv()


def analyze_text_complexity(text):
    """Calculate various text complexity metrics using basic string operations"""
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
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_words_per_sentence": round(avg_words_per_sentence, 1),
        "avg_word_length": round(avg_word_length, 1),
        "vocabulary_diversity": round(vocabulary_diversity * 100, 1),
        "common_words": common_words,
    }


def generate_improvement_suggestions(text):
    """Generate text improvement suggestions using GPT"""  # Create system prompt for GPT
    system_prompt = """You are an expert writing coach. Analyze the text and provide:
1. Style Improvements: Suggest 3 specific ways to improve writing style (clarity, conciseness, tone)
2. Vocabulary Enhancements: Identify 3-5 common or weak words that could be replaced with more precise or sophisticated alternatives. Format EXACTLY as an array of objects, each with "original" (the original word) and "suggestions" (an array of better word alternatives).
3. Structure Suggestions: Recommend improvements to paragraph structure, transitions, or flow
4. Strengths: Note 2 positive aspects of the writing

Format your response as a structured JSON with these sections. For vocabulary enhancements, use this exact format:
{
  "vocabulary_enhancements": [
    {
      "original": "good",
      "suggestions": ["excellent", "outstanding", "superb"]
    },
    {
      "original": "use",
      "suggestions": ["utilize", "employ", "implement"]
    }
  ]
}"""

    # Call GPT-4o with the text
    try:
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this text: {text}"},
            ],
            response_format={"type": "json_object"},
        )

        # Parse the JSON response
        suggestions = response.choices[0].message.content
        return suggestions
    except Exception as e:
        print(f"Error generating suggestions: {str(e)}")
        return {
            "style_improvements": ["Error generating style suggestions"],
            "vocabulary_enhancements": [],
            "structure_suggestions": ["Error generating structure suggestions"],
            "strengths": ["Text analysis unavailable"],
        }


def get_text_improvements(text):
    """Main function to get all text improvements"""
    # Get basic text complexity metrics
    complexity_metrics = analyze_text_complexity(text)

    # Get GPT-generated improvement suggestions
    suggestions_json = generate_improvement_suggestions(text)

    # Alternative: You can use the custom vocabulary enhancement function instead of GPT
    # custom_vocab_enhancements = generate_vocabulary_enhancements_custom(text)
    # if using the custom function, you would need to add it to your return object

    # Combine all results
    return {
        "complexity_metrics": complexity_metrics,
        "improvement_suggestions": suggestions_json,
    }
