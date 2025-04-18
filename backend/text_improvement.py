import openai
import os
import config
import re
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from collections import Counter

# Set up OpenAI API key - use the same key you're using for handwriting analysis
os.environ['OPENAI_API_KEY'] = config.OPENAI_API_KEY
# Configure OpenAI client
openai.api_key = os.getenv('OPENAI_API_KEY')



def analyze_text_complexity(text):
    
    """Calculate various text complexity metrics using basic string operations"""
    # Simple sentence tokenization by splitting on periods, exclamation points, and question marks
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    
    # Simple word tokenization by splitting on whitespace
    words = [w for w in re.split(r'\s+', text) if w]
    
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
        "common_words": common_words
    }
    
def generate_improvement_suggestions(text):
    """Generate text improvement suggestions using GPT"""
    # Create system prompt for GPT
    system_prompt = """You are an expert writing coach. Analyze the text and provide:
1. Style Improvements: Suggest 3 specific ways to improve writing style (clarity, conciseness, tone)
2. Vocabulary Enhancements: Identify 3-5 words that could be replaced with more precise or sophisticated alternatives
3. Structure Suggestions: Recommend improvements to paragraph structure, transitions, or flow
4. Strengths: Note 2 positive aspects of the writing

Format your response as a structured JSON with these sections."""

    # Call GPT-4o with the text
    try:
        response = openai.chat.completions.create(
            model='gpt-4o',
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this text: {text}"}
            ],
            response_format={"type": "json_object"}
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
            "strengths": ["Text analysis unavailable"]
        }

def get_text_improvements(text):
    """Main function to get all text improvements"""
    # Get basic text complexity metrics
    complexity_metrics = analyze_text_complexity(text)
    
    # Get GPT-generated improvement suggestions
    suggestions_json = generate_improvement_suggestions(text)
    
    # Combine all results
    return {
        "complexity_metrics": complexity_metrics,
        "improvement_suggestions": suggestions_json
    }