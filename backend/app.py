from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
import pandas as pd
from backend_handwriting import (
    extract_text_from_image,
    correct_spelling_grammar,
    mark_text,
    create_pdf,
    pdf_to_word,
)
from fpdf import FPDF
import re
from PIL import Image
from text_improvement import (
    get_text_improvements,
    analyze_text_complexity,
    generate_improvement_suggestions,
)
import json, time, pdfkit
import json, time, pdfkit


app = Flask(__name__)
CORS(app)


# Ensure absolute path for uploads
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIRECTORY = os.path.join(BASE_DIR, "generated_pdfs")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
PDF_WORD_DIRECTORY = os.path.join(BASE_DIR, "documents")

# Create directories if they don't exist
os.makedirs(PDF_DIRECTORY, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PDF_WORD_DIRECTORY, exist_ok=True)

stored_results = []


@app.route("/download_pdf/<filename>", methods=["GET"])
def download_pdf(filename):
    file_path = os.path.join(PDF_DIRECTORY, filename)

    if not os.path.exists(file_path):
        print(f"❌ Error: PDF file not found - {file_path}")
        return jsonify({"error": "File not found"}), 404

    print(f"✅ Serving PDF: {file_path}")
    return send_from_directory(PDF_DIRECTORY, filename, as_attachment=False)


@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_image(filename):
    print(f"Requested filename: {filename}")
    print(f"Uploads folder: {UPLOAD_FOLDER}")

    full_path = os.path.join(UPLOAD_FOLDER, filename)
    print(f"Full file path attempted: {full_path}")

    try:
        files_in_dir = os.listdir(UPLOAD_FOLDER)
        print("Files in uploads directory:", files_in_dir)
    except Exception as e:
        print(f"Error listing directory: {e}")

    if not os.path.exists(full_path):
        print(f"❌ File does not exist: {full_path}")
        return jsonify({"error": "File not found"}), 404

    try:
        return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception as e:
        print(f"Error serving file: {e}")
        return jsonify({"error": "Could not serve file"}), 500


@app.route("/upload", methods=["POST"])
def upload_files():
    global stored_results
    stored_results = []
    student_name = request.form.get("studentName")
    student_class = request.form.get("studentClass")
    subject = request.form.get("subject")
    files = request.files.getlist("images")

    print("📥 Received Upload Request")
    print(f"Student: {student_name}, Class: {student_class}, Subject: {subject}")
    print(f"Number of Images: {len(files)}")

    if not files:
        print("❌ No images received!")
        return jsonify({"error": "No images uploaded"}), 400

    extracted_text_list = []
    for file in files:
        # Generate a unique filename while preserving the original extension
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)

        # Save the file
        file.save(filepath)
        print(f"✅ Saved file: {filepath} as {unique_filename}")

        # Extract text from the image
        extracted_text = extract_text_from_image(filepath)
        extracted_text_list.append({"image": unique_filename, "text": extracted_text})

    final_results = []
    for item in extracted_text_list:
        extracted_text = item["text"]
        errors = correct_spelling_grammar(extracted_text)

        print("DEBUG: Errors after processing:", errors)

        if isinstance(errors, str):
            errors = [
                line.split("->")
                for line in errors.splitlines()
                if "->" in line and len(line.split("->")) == 3
            ]

        if (
            isinstance(errors, list)
            and len(errors) > 0
            and all(isinstance(entry, list) and len(entry) == 3 for entry in errors)
        ):
            # Remove leading numbers from incorrect words
            for entry in errors:
                entry[0] = re.sub(r"^\d+\.\s*", "", entry[0])
                # Standardize error categories to only 'Spelling' or 'Grammar'
                entry[2] = "Spelling" if "spell" in entry[2].lower() else "Grammar"

            df = pd.DataFrame(
                errors, columns=["Incorrect Text", "Correct Text", "Error Category"]
            )
        else:
            print(
                "❌ ERROR: Invalid format received for errors! Empty DataFrame will be used."
            )
            df = pd.DataFrame(
                columns=["Incorrect Text", "Correct Text", "Error Category"]
            )

        print("DEBUG: Final DataFrame for errors:")
        print(df)

        marked_text = mark_text(extracted_text, df)

        result = {
            "image": item["image"],
            "extractedText": extracted_text,
            "errorTable": df.to_dict(orient="records"),
            "markedText": marked_text,
        }

        final_results.append(result)

    stored_results = final_results
    print("DEBUG: Final stored results:", stored_results)
    return jsonify(
        {
            "studentName": student_name,
            "studentClass": student_class,
            "subject": subject,
            "results": final_results,
        }
    )


@app.route("/get_results", methods=["GET"])
def get_results():
    global stored_results
    if not stored_results:
        return jsonify({"error": "No results found"}), 404
    return jsonify({"results": stored_results})


@app.route("/retry_image", methods=["POST"])
def retry_image():
    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "No image provided"}), 400

    image_filename = data["image"]
    full_path = os.path.join(UPLOAD_FOLDER, image_filename)

    if not os.path.exists(full_path):
        return jsonify({"error": "File not found on server"}), 404

    # 1) Re-run extraction
    extracted_text = extract_text_from_image(full_path)

    # 2) Re-run spelling/grammar checks
    errors = correct_spelling_grammar(extracted_text)

    print("DEBUG: errors after processing:", errors)

    # 3) Convert 'errors' into a Pandas DataFrame if valid
    if isinstance(errors, str):
        # The model may return a string with lines like "word -> correction -> category"
        errors = [
            line.split("->")
            for line in errors.splitlines()
            if "->" in line and len(line.split("->")) == 3
        ]

    if (
        isinstance(errors, list)
        and len(errors) > 0
        and all(isinstance(entry, list) and len(entry) == 3 for entry in errors)
    ):
        # Remove leading numbers or fix categories, just like in /upload
        for entry in errors:
            # Example: remove leading numbers from the first field (similar to /upload)
            entry[0] = re.sub(r"^\d+\.\s*", "", entry[0])

            # Standardize error categories
            # "Spelling" if 'spell' in the category, else "Grammar"
            entry[2] = "Spelling" if "spell" in entry[2].lower() else "Grammar"

        # Finally create the DataFrame named df
        df = pd.DataFrame(
            errors, columns=["Incorrect Text", "Correct Text", "Error Category"]
        )
    else:
        print(
            "❌ ERROR: Invalid format received for errors! Empty DataFrame will be used."
        )
        df = pd.DataFrame(columns=["Incorrect Text", "Correct Text", "Error Category"])

    print("DEBUG: Final DataFrame for errors:\n", df)

    # 4) Mark text if you do that in your code
    marked_text = mark_text(extracted_text, df)

    # 5) Build the JSON response
    updated_result = {
        "extractedText": extracted_text,
        "errorTable": df.to_dict(orient="records"),
        "markedText": marked_text,
    }

    return jsonify(updated_result)


@app.route("/generate_pdf", methods=["POST"])
def generate_pdf():
    data = request.get_json()

    print("📥 Received PDF generation request:", data)

    if not data:
        print("❌ Error: No data received for PDF generation")
        return jsonify({"error": "No data received"}), 400

    student_name = data.get("studentName", "Unknown")
    student_class = data.get("studentClass", "Unknown")
    subject = data.get("subject", "Unknown")

    if "results" not in data or len(data["results"]) == 0:
        print("❌ Error: No extracted text provided")
        return jsonify({"error": "No extracted text provided"}), 400

    processed_results = []

    try:
        for result in data["results"]:
            error_table_data = result.get("errorTable", [])

            # Ensure error_df is always a valid DataFrame
            if isinstance(error_table_data, list) and len(error_table_data) > 0:
                error_df = pd.DataFrame(error_table_data)
            else:
                error_df = pd.DataFrame(
                    columns=["Incorrect Text", "Correct Text", "Error Category"]
                )

            # Explicitly check for an empty DataFrame
            if error_df.empty:
                print("⚠️ No errors found, proceeding with an empty table.")

            # Validate image before adding to PDF
            image_path = result.get("image", "")
            if image_path:
                full_image_path = os.path.join(UPLOAD_FOLDER, image_path)

                # Check if image file exists
                if not os.path.exists(full_image_path):
                    print(f"❌ Error: Image file not found - {full_image_path}")
                    continue

                # Check if it's a valid image
                try:
                    with Image.open(full_image_path) as img:
                        img.verify()
                except Exception as e:
                    print(f"❌ Invalid image file: {full_image_path} - {e}")
                    continue

            print(f"✅ Processing image for PDF: {full_image_path}")

            processed_results.append(
                {
                    "image": full_image_path,
                    "extractedText": result.get("extractedText", "No extracted text"),
                    "errorTable": error_df.to_dict(orient="records"),
                    "markedText": result.get("markedText", "No marked text"),
                }
            )

        # Generate a single PDF containing all results
        if not processed_results:
            return jsonify({"error": "No valid results to generate PDF"}), 400

        pdf_file_path = create_pdf(
            student_name, student_class, subject, processed_results
        )

        return jsonify(
            {"message": "PDF generated successfully", "pdfPath": pdf_file_path}
        )

    except Exception as e:
        print("❌ Error generating PDF:", str(e))
        return jsonify({"error": "Failed to generate PDF", "message": str(e)}), 500


@app.route("/get_improvements", methods=["POST"])
def get_improvements():
    data = request.get_json()

    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data["text"]

    try:
        print(f"Analyzing text: {text[:50]}...")  # Print first 50 chars of text

        # First try just the complexity metrics
        complexity_metrics = analyze_text_complexity(text)
        print("Complexity metrics calculated successfully")

        # Then try the GPT suggestions
        try:
            suggestions_json = generate_improvement_suggestions(text)
            print("Improvement suggestions generated successfully")
        except Exception as e:
            print(f"Error generating suggestions: {str(e)}")
            suggestions_json = json.dumps(
                {
                    "style_improvements": ["Error generating style suggestions"],
                    "vocabulary_enhancements": [],
                    "structure_suggestions": ["Error generating structure suggestions"],
                    "strengths": ["Text analysis unavailable"],
                }
            )

        # Combine results
        improvements = {
            "complexity_metrics": complexity_metrics,
            "improvement_suggestions": suggestions_json,
        }

        return jsonify({"text": text, "improvements": improvements})
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error generating improvements: {error_msg}")
        return jsonify({"error": f"Failed to generate improvements: {error_msg}"}), 500


# ----------  Export Improvements Report to PDF  ----------
@app.route("/improvements_pdf", methods=["POST"])
def improvements_pdf():
    # local import is okay if not at top

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    text = data.get("text", "")
    improvements = data.get("improvements", {})
    metrics = improvements.get("complexity_metrics", {})
    raw_sugg = improvements.get("improvement_suggestions", "{}")

    try:
        suggestions = raw_sugg if isinstance(raw_sugg, dict) else json.loads(raw_sugg)
    except Exception as e:
        print("❌ Failed to parse suggestions:", e)
        suggestions = {}

    # ---------- Build HTML report ----------
    html = "<html><body style='font-family:Arial;'>"
    html += "<h1>Text Improvement Report</h1>"

    # original text
    html += "<h2>Original Text</h2>"
    html += f"<p>{text.replace(chr(10), '<br>')}</p>"

    # metrics
    html += "<h2>Complexity Metrics</h2><ul>"
    html += f"<li>Word Count: {metrics.get('word_count', '–')}</li>"
    html += f"<li>Sentence Count: {metrics.get('sentence_count', '–')}</li>"
    html += (
        f"<li>Avg. Words / Sentence: {metrics.get('avg_words_per_sentence', '–')}</li>"
    )
    html += f"<li>Avg. Word Length: {metrics.get('avg_word_length', '–')}</li>"
    html += (
        f"<li>Vocabulary Diversity: {metrics.get('vocabulary_diversity', '–')}%</li>"
    )
    html += "</ul>"

    # helper to build <ul><li>…</li></ul>
    def build_list(title: str, items):
        out = f"<h2>{title}</h2><ul>"
        for itm in items:
            out += f"<li>{itm}</li>"
        out += "</ul>"
        return out

    html += build_list("Strengths", suggestions.get("strengths", []))
    html += build_list("Style Improvements", suggestions.get("style_improvements", []))

    # vocabulary enhancements
    vocab = suggestions.get("vocabulary_enhancements", [])
    html += "<h2>Vocabulary Enhancements</h2><ul>"
    for entry in vocab:
        original = entry.get("original", "")
        alternatives = ", ".join(entry.get("suggestions", []))
        html += f"<li><b>{original}</b> → {alternatives}</li>"
    html += "</ul>"

    html += build_list(
        "Structure Suggestions", suggestions.get("structure_suggestions", [])
    )
    html += "</body></html>"

    # ---------- Produce PDF ----------
    ts = int(time.time())
    filename = f"improvement_{ts}.pdf"
    pdf_path = os.path.join(PDF_DIRECTORY, filename)

    try:
        pdfkit.from_string(html, pdf_path, options={"enable-local-file-access": ""})
    except Exception as e:
        print("❌ pdfkit error:", e)
        return jsonify({"error": "Failed to create PDF"}), 500

    return jsonify({"pdfPath": filename})


if __name__ == "__main__":
    app.run(debug=True)

