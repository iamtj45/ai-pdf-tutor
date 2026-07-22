import { Redis } from '@upstash/redis';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Document } from '@langchain/core/documents';

const redis = Redis.fromEnv(); // reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
const STORE_KEY = 'pdf-vector-store';

type StoredVector = {
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
};

// Call after building a MemoryVectorStore to persist it beyond this request
export async function saveVectorStore(store: MemoryVectorStore) {
  const data: StoredVector[] = store.memoryVectors.map((v) => ({
    content: v.content,
    embedding: v.embedding,
    metadata: v.metadata,
  }));
  await redis.set(STORE_KEY, JSON.stringify(data));
}

// Rebuilds a MemoryVectorStore from persisted vectors — no re-embedding needed
export async function getVectorStore(): Promise<MemoryVectorStore | null> {
  const raw = await redis.get<string>(STORE_KEY);
  if (!raw) return null;

  const data: StoredVector[] = typeof raw === 'string' ? JSON.parse(raw) : (raw as any);
  if (!data || data.length === 0) return null;

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    model: 'gemini-embedding-001',
  });

  const store = new MemoryVectorStore(embeddings);
  await store.addVectors(
    data.map((d) => d.embedding),
    data.map((d) => new Document({ pageContent: d.content, metadata: d.metadata }))
  );

  return store;
}