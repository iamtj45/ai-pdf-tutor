import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { LangChainAdapter } from 'ai';
import { getVectorStore } from '../lib/store';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    const lastMessage = messages[messages.length - 1];
    const question = lastMessage.content;

    const vectorStore = getVectorStore();
    if (!vectorStore) {
      return NextResponse.json({ error: 'No document uploaded yet' }, { status: 400 });
    }

    // Get relevant chunks
    const retriever = vectorStore.asRetriever({ k: 3 });
    const docs = await retriever.invoke(question);
    const context = docs.map((doc: any) => doc.pageContent).join('\n\n');

    // Create prompt
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

    // Create model
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
      model: 'gemini-1.5-flash',
      temperature: 0.1,
    });

    // Create chain
    const chain = RunnableSequence.from([
      {
        context: () => context,
        question: () => question,
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    // Stream response — bridges LangChain's stream to the format useChat expects
    const stream = await chain.stream(question);
    return LangChainAdapter.toDataStreamResponse(stream);

  } catch (error) {
    console.error('Chat error:', error);
    return new Response('Error processing request', { status: 500 });
  }
}