import type { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';

let _vectorStore: MemoryVectorStore | null = null;

export function setVectorStore(store: MemoryVectorStore) {
  _vectorStore = store;
}

export function getVectorStore(): MemoryVectorStore | null {
  return _vectorStore;
}