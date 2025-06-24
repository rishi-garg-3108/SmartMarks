# backend/app.py

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
import pandas as pd
from backend_handwriting import extract_text_from_image, correct_spelling_grammar, mark_text, create_pdf, pdf_to_word
from fpdf import FPDF
import re
from PIL import Image
from text_improvement import get_text_improvements, analyze_text_complexity, generate_improvement_suggestions
import json, time, pdfkit

## JWT: Import new libraries for JWT, password hashing, and decorators
import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash


app = Flask(__name__)
CORS(app)

## JWT: Add a secret key. This is crucial for signing your tokens!
## In a real app, load this from an environment variable.
app.config['SECRET_KEY'] = 'a-very-secret-and-long-random-string-that-no-one-can-guess'


# Ensure absolute path for uploads
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIRECTORY = os.path.join(BASE_DIR, "generated_pdfs")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
PDF_WORD_DIRECTORY = os.path.join(BASE_DIR, "documents")

# Create directories if they don't exist
os.makedirs(PDF_DIRECTORY, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PDF_WORD_DIRECTORY, exist_ok=True)

## JWT: Simple in-memory user store for demonstration.
## In a real app, this would be a database (like PostgreSQL or MongoDB).
## The password 'testpassword' is hashed for security.
users = {
    "teacher@example.com": {
        "password": generate_password_hash("testpassword", method='pbkdf2:sha256'),
        "id": "1"
    }
}

stored_results = []


## JWT: Create the decorator to protect routes.
## This is the "ride attendant" that checks for a valid "wristband" (token).
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check if 'Authorization' header is in the request
        if 'Authorization' in request.headers:
            # The header format is "Bearer <token>"
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            # Decode the token using our secret key
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            # Find the user based on the 'sub' (subject) field in the token
            current_user = next((user for email, user in users.items() if user['id'] == data['sub']), None)
            if not current_user:
                 return jsonify({'message': 'Token is invalid!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401

        # Pass the current user to the decorated function
        return f(current_user, *args, **kwargs)

    return decorated


## JWT: New login route. This is our "main gate".
@app.route('/login', methods=['POST'])
def login():
    auth = request.json
    if not auth or not auth.get('email') or not auth.get('password'):
        return jsonify({'message': 'Could not verify'}), 401, {'WWW-Authenticate': 'Basic realm="Login required!"'}

    email = auth['email']
    password = auth['password']

    user_data = users.get(email)

    # Check if user exists and password is correct
    if not user_data or not check_password_hash(user_data['password'], password):
        return jsonify({'message': 'Could not verify! Wrong email or password.'}), 401

    # If credentials are correct, create the JWT
    token = jwt.encode({
        'sub': user_data['id'],  # 'sub' is standard for "subject" (the user ID)
        'iat': datetime.now(timezone.utc), # 'iat' is "issued at"
        'exp': datetime.now(timezone.utc) + timedelta(hours=24) # 'exp' is "expiration time"
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({'token': token})


@app.route('/download_pdf/<filename>', methods=['GET'])
def download_pdf(filename):
    # This route might not need protection if PDFs are meant to be public links
    file_path = os.path.join(PDF_DIRECTORY, filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    return send_from_directory(PDF_DIRECTORY, filename, as_attachment=False)

@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_image(filename):
    # This route should also be protected to prevent unauthorized image access
    return send_from_directory(UPLOAD_FOLDER, filename)


## JWT: Add the @token_required decorator to all routes that need protection.
@app.route('/upload', methods=['POST'])
@token_required
def upload_files(current_user):
    global stored_results
    stored_results = []
    # (The rest of your upload logic remains the same)
    student_name = request.form.get('studentName')
    student_class = request.form.get('studentClass')
    subject = request.form.get('subject')
    files = request.files.getlist('images')

    if not files:
        return jsonify({'error': 'No images uploaded'}), 400

    extracted_text_list = []
    for file in files:
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(filepath)
        extracted_text = extract_text_from_image(filepath)
        extracted_text_list.append({'image': unique_filename, 'text': extracted_text})

    final_results = []
    for item in extracted_text_list:
        extracted_text = item['text']
        errors = correct_spelling_grammar(extracted_text)
        if isinstance(errors, str):
            errors = [line.split("->") for line in errors.splitlines() if "->" in line and len(line.split("->")) == 3]
        if isinstance(errors, list) and len(errors) > 0 and all(isinstance(entry, list) and len(entry) == 3 for entry in errors):
            for entry in errors:
                entry[0] = re.sub(r'^\d+\.\s*', '', entry[0])
                entry[2] = 'Spelling' if 'spell' in entry[2].lower() else 'Grammar'
            df = pd.DataFrame(errors, columns=["Incorrect Text", "Correct Text", "Error Category"])
        else:
            df = pd.DataFrame(columns=["Incorrect Text", "Correct Text", "Error Category"])
        marked_text = mark_text(extracted_text, df)
        result = {
            'image': item['image'],
            'extractedText': extracted_text,
            'errorTable': df.to_dict(orient='records'),
            'markedText': marked_text
        }
        final_results.append(result)
    
    stored_results = final_results
    return jsonify({'studentName': student_name, 'studentClass': student_class, 'subject': subject, 'results': final_results})

@app.route('/get_results', methods=['GET'])
@token_required
def get_results(current_user):
    global stored_results
    if not stored_results:
        return jsonify({'error': 'No results found'}), 404
    return jsonify({'results': stored_results})

@app.route('/retry_image', methods=['POST'])
@token_required
def retry_image(current_user):
    # (The rest of your retry logic remains the same)
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': 'No image provided'}), 400
    image_filename = data['image']
    full_path = os.path.join(UPLOAD_FOLDER, image_filename)
    if not os.path.exists(full_path):
        return jsonify({'error': 'File not found on server'}), 404
    extracted_text = extract_text_from_image(full_path)
    errors = correct_spelling_grammar(extracted_text)
    if isinstance(errors, str):
        errors = [line.split("->") for line in errors.splitlines() if "->" in line and len(line.split("->")) == 3]
    if (isinstance(errors, list) and len(errors) > 0 and all(isinstance(entry, list) and len(entry) == 3 for entry in errors)):
        for entry in errors:
            entry[0] = re.sub(r'^\d+\.\s*', '', entry[0])
            entry[2] = 'Spelling' if 'spell' in entry[2].lower() else 'Grammar'
        df = pd.DataFrame(errors, columns=["Incorrect Text", "Correct Text", "Error Category"])
    else:
        df = pd.DataFrame(columns=["Incorrect Text", "Correct Text", "Error Category"])
    marked_text = mark_text(extracted_text, df)
    updated_result = {
        "extractedText": extracted_text,
        "errorTable": df.to_dict(orient="records"),
        "markedText": marked_text
    }
    return jsonify(updated_result)

@app.route('/generate_pdf', methods=['POST'])
@token_required
def generate_pdf(current_user):
    # (The rest of your generate_pdf logic remains the same)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data received'}), 400
    student_name = data.get('studentName', 'Unknown')
    student_class = data.get('studentClass', 'Unknown')
    subject = data.get('subject', 'Unknown')
    if 'results' not in data or len(data['results']) == 0:
        return jsonify({'error': 'No extracted text provided'}), 400
    processed_results = []
    try:
        for result in data['results']:
            error_table_data = result.get('errorTable', [])
            if isinstance(error_table_data, list) and len(error_table_data) > 0:
                error_df = pd.DataFrame(error_table_data)
            else:
                error_df = pd.DataFrame(columns=["Incorrect Text", "Correct Text", "Error Category"])
            image_path = result.get('image', '')
            if image_path:
                full_image_path = os.path.join(UPLOAD_FOLDER, image_path)
                if not os.path.exists(full_image_path): continue
                try:
                    with Image.open(full_image_path) as img: img.verify()
                except Exception as e: continue
            processed_results.append({
                'image': full_image_path,
                'extractedText': result.get('extractedText', 'No extracted text'),
                'errorTable': error_df.to_dict(orient='records'),
                'markedText': result.get('markedText', 'No marked text')
            })
        if not processed_results:
            return jsonify({'error': 'No valid results to generate PDF'}), 400
        pdf_file_path = create_pdf(student_name, student_class, subject, processed_results)
        return jsonify({'message': 'PDF generated successfully', 'pdfPath': os.path.basename(pdf_file_path)})
    except Exception as e:
        return jsonify({'error': 'Failed to generate PDF', 'message': str(e)}), 500

@app.route('/get_improvements', methods=['POST'])
@token_required
def get_improvements(current_user):
    # (The rest of your improvements logic remains the same)
    data = request.get_json()
    if not data or 'text' not in data: return jsonify({'error': 'No text provided'}), 400
    text = data['text']
    try:
        complexity_metrics = analyze_text_complexity(text)
        try:
            suggestions_json = generate_improvement_suggestions(text)
        except Exception as e:
            suggestions_json = json.dumps({"style_improvements": ["Error generating style suggestions"],"vocabulary_enhancements": [],"structure_suggestions": ["Error generating structure suggestions"],"strengths": ["Text analysis unavailable"]})
        improvements = {"complexity_metrics": complexity_metrics, "improvement_suggestions": suggestions_json}
        return jsonify({'text': text, 'improvements': improvements})
    except Exception as e:
        return jsonify({'error': f'Failed to generate improvements: {str(e)}'}), 500

@app.route("/improvements_pdf", methods=["POST"])
@token_required
def improvements_pdf(current_user):
    # (The rest of your improvements_pdf logic remains the same)
    data = request.get_json()
    if not data: return jsonify({"error": "No data provided"}), 400
    text = data.get("text", "")
    improvements = data.get("improvements", {})
    metrics = improvements.get("complexity_metrics", {})
    raw_sugg = improvements.get("improvement_suggestions", "{}")
    try:
        suggestions = raw_sugg if isinstance(raw_sugg, dict) else json.loads(raw_sugg)
    except Exception as e: suggestions = {}
    html = "<html><body style='font-family:Arial;'>"
    html += "<h1>Text Improvement Report</h1>"
    html += "<h2>Original Text</h2>"
    html += f"<p>{text.replace(chr(10), '<br>')}</p>"
    html += "<h2>Complexity Metrics</h2><ul>"
    html += f"<li>Word Count: {metrics.get('word_count','–')}</li>"
    html += f"<li>Sentence Count: {metrics.get('sentence_count','–')}</li>"
    html += f"<li>Avg. Words / Sentence: {metrics.get('avg_words_per_sentence','–')}</li>"
    html += f"<li>Avg. Word Length: {metrics.get('avg_word_length','–')}</li>"
    html += f"<li>Vocabulary Diversity: {metrics.get('vocabulary_diversity','–')}%</li>"
    html += "</ul>"
    def build_list(title: str, items):
        out = f"<h2>{title}</h2><ul>"
        for itm in items: out += f"<li>{itm}</li>"
        out += "</ul>"
        return out
    html += build_list("Strengths", suggestions.get("strengths", []))
    html += build_list("Style Improvements", suggestions.get("style_improvements", []))
    vocab = suggestions.get("vocabulary_enhancements", [])
    html += "<h2>Vocabulary Enhancements</h2><ul>"
    for entry in vocab:
        original = entry.get("original", "")
        alternatives = ", ".join(entry.get("suggestions", []))
        html += f"<li><b>{original}</b> → {alternatives}</li>"
    html += "</ul>"
    html += build_list("Structure Suggestions", suggestions.get("structure_suggestions", []))
    html += "</body></html>"
    ts = int(time.time())
    filename = f"improvement_{ts}.pdf"
    pdf_path = os.path.join(PDF_DIRECTORY, filename)
    try:
        pdfkit.from_string(html, pdf_path, options={"enable-local-file-access": ""})
    except Exception as e: return jsonify({"error": "Failed to create PDF"}), 500
    return jsonify({"pdfPath": os.path.basename(filename)})

if __name__ == '__main__':
    ## JWT: Run the app on a different port if you want, e.g., 5001
    app.run(host='0.0.0.0', port=5000, debug=True)