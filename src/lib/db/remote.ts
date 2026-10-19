import { getCache } from "@vercel/functions";
import { Redis } from "@upstash/redis";
import type { Database as AppDatabase } from "@/lib/types";

const REDIS_KEY = "flowly:db";
/** 7 days — long enough for demos; Runtime Cache may still LRU-evict under pressure. */
const RUNTIME_TTL_SEC = 60 * 60 * 24 * 7;

export type RemoteLoadResult =
  | { status: "ok"; data: AppDatabase }
  | { status: "empty" }
  | { status: "error"; error: unknown };

function hasUpstash() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/** Shared across Vercel serverless instances (Upstash Redis, or Runtime Cache fallback). */
export function isRemoteDb() {
  return hasUpstash() || process.env.VERCEL === "1";
}

function redis() {
  return Redis.fromEnv();
}

export async function loadRemoteDbResult(): Promise<RemoteLoadResult> {
  if (hasUpstash()) {
    try {
      const data = await redis().get<AppDatabase>(REDIS_KEY);
      if (data == null) return { status: "empty" };
      return { status: "ok", data };
    } catch (error) {
      console.error("[remote-db] upstash get failed", error);
      return { status: "error", error };
    }
  }

  if (process.env.VERCEL === "1") {
    try {
      const value = await getCache().get(REDIS_KEY);
      if (value == null) return { status: "empty" };
      if (typeof value === "string") {
        return { status: "ok", data: JSON.parse(value) as AppDatabase };
      }
      return { status: "ok", data: value as AppDatabase };
    } catch (error) {
      console.error("[remote-db] runtime-cache get failed", error);
      return { status: "error", error };
    }
  }

  return { status: "empty" };
}

/** @deprecated Prefer loadRemoteDbResult — null conflates empty with errors. */
export async function loadRemoteDb(): Promise<AppDatabase | null> {
  const result = await loadRemoteDbResult();
  if (result.status === "ok") return result.data;
  return null;
}

export async function remoteHasUsers() {
  const result = await loadRemoteDbResult();
  if (result.status === "error") {
    // Fail closed: pretend users exist so ensureDb does not reseed/clobber.
    throw new Error("Remote database temporarily unavailable");
  }
  if (result.status === "empty") return false;
  return Boolean(result.data.users?.length);
}

export async function saveRemoteDb(data: AppDatabase) {
  if (hasUpstash()) {
    try {
      await redis().set(REDIS_KEY, data);
      return;
    } catch (error) {
      console.error("[remote-db] upstash set failed", error);
      throw new Error("Failed to persist database");
    }
  }

  if (process.env.VERCEL === "1") {
    try {
      await getCache().set(REDIS_KEY, data, {
        ttl: RUNTIME_TTL_SEC,
        tags: ["flowly-db"],
      });
      return;
    } catch (error) {
      console.error("[remote-db] runtime-cache set failed", error);
      throw new Error("Failed to persist database");
    }
  }
}
