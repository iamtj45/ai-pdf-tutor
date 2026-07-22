import { NextRequest } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { getVectorStore } from '@/lib/store';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('RAW BODY:', JSON.stringify(body, null, 2)); // ← temporary debug line

    const messages = body.messages;
    if (!messages || messages.length === 0) {
      return Response.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Extract the user's question, handling both message formats:
    // - AI SDK v4: message.content is a string
    // - AI SDK v5: message.parts is an array of { type: 'text', text }
    const lastMessage = messages[messages.length - 1];
    console.log('LAST MESSAGE:', JSON.stringify(lastMessage, null, 2)); // ← temporary debug line

    const question =
      lastMessage.content ??
      lastMessage.parts
        ?.filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('') ??
      '';

    console.log('EXTRACTED QUESTION:', question); // ← temporary debug line

    if (!question) {
      return Response.json({ error: 'No question provided' }, { status: 400 });
    }

    const vectorStore = await getVectorStore();
    if (!vectorStore) {
      return Response.json(
        { error: 'No document uploaded yet. Please upload a PDF first.' },
        { status: 400 }
      );
    }

    // 1. Retrieve relevant chunks from the vector store
    const retriever = vectorStore.asRetriever({ k: 3 });
    const docs = await retriever.invoke(question);
    const context = docs.map((doc: any) => doc.pageContent).join('\n\n');

    // 2. Strict RAG prompt
    const prompt = PromptTemplate.fromTemplate(`
You are a highly accurate AI tutor. Answer the user's question using ONLY the provided context.

CONTEXT:
{context}

QUESTION:
{question}

INSTRUCTIONS:
- Answer based STRICTLY on the CONTEXT provided above.
- If the answer is not in the context, reply exactly with: "I cannot find that information in the provided document."
- Do not make up information, hallucinate, or use outside knowledge.
- Keep the answer concise, clear, and professional.
`);

    // 3. Model
    const model = new ChatGoogleGenerativeAI({
       model: "gemini-flash-latest",
      apiKey: process.env.GOOGLE_API_KEY!,
      temperature: 0.1,
    });

    // 4. Chain
    const chain = RunnableSequence.from([
      {
        context: () => context,
        question: () => question,
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    // 5. Stream the response as plain text
    const langchainStream = await chain.stream(question);

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of langchainStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('❌ Chat error:', error);
    return new Response('Error processing request. Please check your API key and try again.', {
      status: 500,
    });
  }
}