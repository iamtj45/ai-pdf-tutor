import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { setVectorStore } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 });
    }

    console.log(` Processing: ${file.name}`);

    // Parse PDF
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;

    console.log(`✅ Extracted ${fullText.length} chars from ${pdfData.numpages} pages`);

    // Split text
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitText(fullText);
    console.log(`✂️ Created ${chunks.length} chunks`);

    // Create embeddings
  const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'gemini-embedding-001',
});
    // Store in vector DB
    const store = await MemoryVectorStore.fromTexts(
      chunks,
      { source: file.name },
      embeddings
    );

    setVectorStore(store);

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        totalPages: pdfData.numpages,
        totalChunks: chunks.length,
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}