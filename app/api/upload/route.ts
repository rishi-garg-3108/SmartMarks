import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const data = await req.formData();
  const files = data.getAll('images') as File[];

  if (!files.length) {
    return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
  }

  // Define the directory to save images
  const uploadDir = path.join(process.cwd(), 'public', 'images');

  // Ensure the directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Process each file
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, file.name);
    fs.writeFileSync(filePath, buffer);
  }

  return NextResponse.json({ message: 'Images uploaded successfully' });
}