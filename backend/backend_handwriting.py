import base64
import os
import re
import openai
import cv2
import pandas as pd
from io import BytesIO
from PIL import Image
from fpdf import FPDF
import pdfkit
from PyPDF2 import PdfReader
from docx import Document

os.environ['OPENAI_API_KEY'] = "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"
os.environ['OPENAI_MODEL_NAME'] = 'gpt-4o'

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def extract_text_from_image(image_path):
    image_base64 = f"data:image/jpeg;base64,{encode_image(image_path)}"
    client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    response = client.chat.completions.create(
        model='gpt-4o',
        messages=[
            {"role": "user", "content": [
                {"type": "text", "text": "Extract the text from this image without modifying spelling or grammar."},
                {"type": "image_url", "image_url": {"url": image_base64}}
            ]},
        ],
        max_tokens=500,
    )
    return response.choices[0].message.content

def correct_spelling_grammar(text):
    response = openai.chat.completions.create(
        model='gpt-4o',
        messages=[
            {"role": "system", "content": "You are an expert in spelling and grammar correction. Identify errors and provide corrections in 'Incorrect -> Correct -> Category' format."},
            {"role": "user", "content": f"Review the following text: '{text}' and identify spelling and grammar mistakes."}
        ]
    )

    corrected_text = response.choices[0].message.content.strip()
    print("DEBUG: GPT Response:\n", corrected_text)  # Debugging

    # Ensure correct parsing
    errors = []
    for line in corrected_text.splitlines():
        if "->" in line:
            parts = line.split("->")
            if len(parts) == 3:
                errors.append([parts[0].strip(), parts[1].strip(), parts[2].strip()])

    print("DEBUG: Parsed Errors:", errors)  # Debugging

    return errors  # Ensure it's a list of lists


def mark_text(text, df):
    corrections = df.to_dict(orient='records')
    for correction in corrections:
        incorrect_text = correction['Incorrect Text']
        category = correction['Error Category']
        if "Spelling" in category:
            text = re.sub(re.escape(incorrect_text), f'<span style="color:red;">{incorrect_text}</span>', text)
        elif "Grammar" in category:
            text = re.sub(re.escape(incorrect_text), f'<span style="color:blue;">{incorrect_text}</span>', text)
    return text




PDF_DIRECTORY = "generated_pdfs"

if not os.path.exists(PDF_DIRECTORY):
    os.makedirs(PDF_DIRECTORY)

def create_pdf(student_name, student_class, subject, results):
    pdf_file_path = os.path.join(PDF_DIRECTORY, "student_report.pdf")  # Single PDF file

    # ✅ Start HTML Formatting for the PDF
    html_content = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 20px;
            }}
            h1, h2, h3 {{
                color: #333;
            }}
            p {{
                font-size: 14px;
                color: #444;
            }}
            .highlight-red {{
                color: red;
                font-weight: bold;
            }}
            .highlight-green {{
                color: green;
                font-weight: bold;
            }}
            .highlight-blue {{
                color: blue;
                font-weight: bold;
            }}
            .error-table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                font-size: 14px;
            }}
            .error-table th, .error-table td {{
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }}
            .error-table th {{
                background-color: #f2f2f2;
                color: black;
            }}
            .error-table td:nth-child(1) {{
                color: red;
                font-weight: bold;
            }}
            .error-table td:nth-child(2) {{
                color: green;
                font-weight: bold;
            }}
            .error-table td:nth-child(3) {{
                color: blue;
                font-weight: bold;
            }}
            .section-divider {{
                margin-top: 30px;
                border-top: 3px solid #000;
            }}
            .extracted-text {{
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                padding: 10px;
                font-size: 14px;
            }}
            .marked-text {{
                background-color: #f3f3f3;
                border: 1px solid #bbb;
                padding: 10px;
                font-size: 14px;
            }}
            sup {{
                font-size: 10px;
                vertical-align: super;
                color: red;
            }}
        </style>
    </head>
    <body>
        <h1 style="text-align:center;">Student Report</h1>
        <p><strong>Student Name:</strong> {student_name}</p>
        <p><strong>Class:</strong> {student_class}</p>
        <p><strong>Subject:</strong> {subject}</p>
    """

    # ✅ Loop through all images and results
    for i, result in enumerate(results):
        image = result.get("image", "")
        extracted_text = result.get("extractedText", "No text extracted")
        marked_text = result.get("markedText", "No marked text available")
        error_table_data = result.get("errorTable", [])

        # ✅ Ensure error data is a valid DataFrame
        error_df = pd.DataFrame(error_table_data)

        if not error_df.empty:
            # ✅ Fix KeyError by renaming columns to a standard format
            expected_columns = {
                "incorrectText": "Incorrect Text",
                "correctText": "Correct Text",
                "errorCategory": "Error Category"
            }

            # Rename columns if necessary
            error_df.rename(columns=expected_columns, inplace=True)

            # ✅ Validate that expected columns exist in the DataFrame
            for col in ["Incorrect Text", "Correct Text", "Error Category"]:
                if col not in error_df.columns:
                    print(f"⚠️ Warning: Column {col} missing in error table.")
                    error_df[col] = ""  # Add missing columns with empty values

        # ✅ Process extracted text to add superscripts (G/S)
        for _, row in error_df.iterrows():
            incorrect_word = row['Incorrect Text']
            error_type = row['Error Category']

            if "Spelling" in error_type:
                superscript = "<sup>S</sup>"  # S for Spelling
            else:
                superscript = "<sup>G</sup>"  # G for Grammar

            extracted_text = extracted_text.replace(incorrect_word, f"{incorrect_word}{superscript}")

        # ✅ Format the error table
        error_table_html = """
        <table class="error-table">
            <tr>
                <th>Incorrect Text (🔴 Red)</th>
                <th>Correct Text (🟢 Green)</th>
                <th>Error Category (🔵 Blue)</th>
            </tr>
        """
        for _, row in error_df.iterrows():
            error_table_html += f"""
            <tr>
                <td class="highlight-red">{row['Incorrect Text']}</td>
                <td class="highlight-green">{row['Correct Text']}</td>
                <td class="highlight-blue">{row['Error Category']}</td>
            </tr>
            """
        error_table_html += "</table>" if not error_df.empty else "<p>No errors found.</p>"

        # ✅ Add sections for each image
        html_content += f"""
        <div class="section-divider"></div>
        <h2>Image {i + 1}</h2>
        
        <h3>Uploaded Image:</h3>
        <img src="{image}" style="width:100%; max-height:400px;" />

        <h3>Extracted Text (Errors Marked in Superscript):</h3>
        <p class="extracted-text">{extracted_text}</p>

        <h3>Errors in the Text:</h3>
        {error_table_html}

        <h3>Marked Text:</h3>
        <p class="marked-text">{marked_text}</p>
        """

    html_content += "</body></html>"

    # ✅ Generate the PDF with the improved formatting
    pdfkit.from_string(html_content, pdf_file_path, options={'enable-local-file-access': ''})

    print(f"✅ PDF successfully saved: {pdf_file_path}")  # Debugging

    return pdf_file_path


def pdf_to_word(pdf_path, word_path):
    pdf_reader = PdfReader(pdf_path)
    word_doc = Document()
    for page in pdf_reader.pages:
        text = page.extract_text()
        word_doc.add_paragraph(text)
    word_doc.save(word_path)
    return word_path
