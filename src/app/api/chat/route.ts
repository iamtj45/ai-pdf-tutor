import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { getVectorStore } from '@/lib/store';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question;

    if (!question) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    const vectorStore = getVectorStore();
    if (!vectorStore) {
      return NextResponse.json({ error: 'No document uploaded yet' }, { status: 400 });
    }

    const retriever = vectorStore.asRetriever({ k: 3 });
    const docs = await retriever.invoke(question);
    const context = docs.map((doc: any) => doc.pageContent).join('\n\n');

    const prompt = PromptTemplate.fromTemplate(`
You are a helpful AI assistant. Answer using ONLY the provided context.

CONTEXT:
{context}

QUESTION:
{question}

INSTRUCTIONS:
- Answer based strictly on the CONTEXT
- If not in context, say "I cannot find that in the document"
- Do not make up information
- Be concise
`);

    const model = new ChatGoogleGenerativeAI({
  model: 'gemini-3.5-flash', // Direct upgrade path with faster, higher-quality coding capability
  apiKey: process.env.GOOGLE_API_KEY!,
  temperature: 0.1,
});

    const chain = RunnableSequence.from([
      { context: () => context, question: () => question },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    const answer = await chain.invoke(question);

    return NextResponse.json({ answer });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}