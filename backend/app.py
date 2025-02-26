from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
import pandas as pd
from backend_handwriting import extract_text_from_image, correct_spelling_grammar, mark_text, create_pdf, pdf_to_word
from fpdf import FPDF
import re
from PIL import Image

app = Flask(__name__)
CORS(app)

PDF_DIRECTORY = "generated_pdfs"  # Ensure it matches where PDFs are saved
UPLOAD_FOLDER = 'uploads'
PDF_WORD_DIRECTORY = "documents"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PDF_WORD_DIRECTORY, exist_ok=True)

stored_results = []

@app.route('/download_pdf/<filename>', methods=['GET'])
def download_pdf(filename):
    file_path = os.path.join(PDF_DIRECTORY, filename)

    # ✅ Ensure the file exists before serving
    if not os.path.exists(file_path):
        print(f"❌ Error: PDF file not found - {file_path}")  # Debugging
        return jsonify({'error': 'File not found'}), 404

    print(f"✅ Serving PDF: {file_path}")  # Debugging
    return send_from_directory(PDF_DIRECTORY, filename, as_attachment=False)

@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_image(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/upload', methods=['POST'])
def upload_files():
    global stored_results
    stored_results = []
    student_name = request.form.get('studentName')
    student_class = request.form.get('studentClass')
    subject = request.form.get('subject')
    files = request.files.getlist('images')

    print("📥 Received Upload Request")
    print(f"Student: {student_name}, Class: {student_class}, Subject: {subject}")
    print(f"Number of Images: {len(files)}")

    if not files:
        print("❌ No images received!")
        return jsonify({'error': 'No images uploaded'}), 400

    extracted_text_list = []
    for file in files:
        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)
        print(f"✅ Saved file: {filepath}")

        extracted_text = extract_text_from_image(filepath)
        extracted_text_list.append({'image': file.filename, 'text': extracted_text})

    final_results = []
    for item in extracted_text_list:
        extracted_text = item['text']
        errors = correct_spelling_grammar(extracted_text)

        print("DEBUG: Errors after processing:", errors)

        if isinstance(errors, str):
            errors = [line.split("->") for line in errors.splitlines() if "->" in line and len(line.split("->")) == 3]

        if isinstance(errors, list) and len(errors) > 0 and all(isinstance(entry, list) and len(entry) == 3 for entry in errors):
            # Remove leading numbers from incorrect words
            for entry in errors:
                entry[0] = re.sub(r'^\d+\.\s*', '', entry[0])
                # Standardize error categories to only 'Spelling' or 'Grammar'
                entry[2] = 'Spelling' if 'spell' in entry[2].lower() else 'Grammar'
            
            df = pd.DataFrame(errors, columns=["Incorrect Text", "Correct Text", "Error Category"])
        else:
            print("❌ ERROR: Invalid format received for errors! Empty DataFrame will be used.")
            df = pd.DataFrame(columns=["Incorrect Text", "Correct Text", "Error Category"])

        print("DEBUG: Final DataFrame for errors:")
        print(df)

        marked_text = mark_text(extracted_text, df)

        result = {
            'image': item['image'],
            'extractedText': extracted_text,
            'errorTable': df.to_dict(orient='records'),
            'markedText': marked_text
        }

        final_results.append(result)
    
    stored_results = final_results
    print("DEBUG: Final stored results:", stored_results)  #  Added Debugging
    return jsonify({'studentName': student_name, 'studentClass': student_class, 'subject': subject, 'results': final_results})

@app.route('/get_results', methods=['GET'])
def get_results():
    global stored_results
    if not stored_results:
        return jsonify({'error': 'No results found'}), 404
    return jsonify({'results': stored_results})

from PIL import Image

@app.route('/generate_pdf', methods=['POST'])
def generate_pdf():
    data = request.get_json()
    
    print("📥 Received PDF generation request:", data)  # Debug log

    if not data:
        print("❌ Error: No data received for PDF generation")
        return jsonify({'error': 'No data received'}), 400

    student_name = data.get('studentName', 'Unknown')
    student_class = data.get('studentClass', 'Unknown')
    subject = data.get('subject', 'Unknown')

    if 'results' not in data or len(data['results']) == 0:
        print("❌ Error: No extracted text provided")
        return jsonify({'error': 'No extracted text provided'}), 400

    processed_results = []

    try:
        for result in data['results']:
            error_table_data = result.get('errorTable', [])

            # ✅ Ensure error_df is always a valid DataFrame
            if isinstance(error_table_data, list) and len(error_table_data) > 0:
                error_df = pd.DataFrame(error_table_data)
            else:
                error_df = pd.DataFrame(columns=["Incorrect Text", "Correct Text", "Error Category"])

            # ✅ Explicitly check for an empty DataFrame
            if error_df.empty:
                print("⚠️ No errors found, proceeding with an empty table.")

            # ✅ Validate image before adding to PDF
            image_path = result.get('image', '')
            if image_path:
                full_image_path = os.path.join("uploads", image_path)  # Ensure correct path
                
                # Check if image file exists
                if not os.path.exists(full_image_path):
                    print(f"❌ Error: Image file not found - {full_image_path}")
                    continue

                # Check if it's a valid image
                try:
                    with Image.open(full_image_path) as img:
                        img.verify()  # Validate the image format
                except Exception as e:
                    print(f"❌ Invalid image file: {full_image_path} - {e}")
                    continue  # Skip this result if image is corrupted

            print(f"✅ Processing image for PDF: {full_image_path}")

            processed_results.append({
                'image': full_image_path,
                'extractedText': result.get('extractedText', 'No extracted text'),
                'errorTable': error_df.to_dict(orient='records'),  # ✅ Convert DataFrame to list of dictionaries
                'markedText': result.get('markedText', 'No marked text')
            })

        # ✅ Generate a single PDF containing all results
        if not processed_results:
            return jsonify({'error': 'No valid results to generate PDF'}), 400

        pdf_file_path = create_pdf(student_name, student_class, subject, processed_results)

        return jsonify({
            'message': 'PDF generated successfully',
            'pdfPath': pdf_file_path
        })

    except Exception as e:
        print("❌ Error generating PDF:", str(e))
        return jsonify({'error': 'Failed to generate PDF', 'message': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)
