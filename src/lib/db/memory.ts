import type { Database as AppDatabase } from "@/lib/types";

/** Vercel (serverless) has no persistent disk — keep DB in process memory. */
export function isMemoryDb() {
  return process.env.VERCEL === "1" || process.env.FLOWLY_MEMORY_DB === "1";
}

declare global {
  // eslint-disable-next-line no-var
  var __flowlyMemoryDb: AppDatabase | undefined;
}

export function memoryHasUsers() {
  return Boolean(globalThis.__flowlyMemoryDb?.users?.length);
}

export function loadMemoryDb(): AppDatabase {
  if (!globalThis.__flowlyMemoryDb) {
    throw new Error("Memory database is empty");
  }
  return globalThis.__flowlyMemoryDb;
}

export function saveMemoryDb(data: AppDatabase) {
  globalThis.__flowlyMemoryDb = data;
}
