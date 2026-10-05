import createClient from "openapi-fetch";
import type { paths } from "./schema";

const ACTOR_STORAGE_KEY = "datadiff-actor";

export function getActorName() {
  if (typeof window === "undefined") return "";
  const storedName = window.localStorage.getItem(ACTOR_STORAGE_KEY)?.trim() ?? "";
  return storedName === "web-ui" ? "" : storedName;
}

export function getActorHeaderName() {
  return getActorName() || "anonymous";
}

export function saveActorName(name: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTOR_STORAGE_KEY, name.trim());
    window.dispatchEvent(new Event("datadiff-actor-change"));
  }
}

export function apiHeaders() {
  return {
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY!,
    "x-actor": getActorHeaderName(),
  };
}

export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  headers: { "X-API-Key": process.env.NEXT_PUBLIC_API_KEY! },
});

export class ApiError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
  }
}

/** Turns an openapi-fetch result into data, or throws ApiError with the server's message. */
export function unwrap<T>(res: { data?: unknown; error?: unknown; response: Response }): T {
  if (!res.response.ok) {
    const e = res.error as { error?: { code?: string; message?: string } } | undefined;
    throw new ApiError(
      e?.error?.message ?? res.response.statusText ?? "Request failed",
      e?.error?.code ?? "error",
      res.response.status,
    );
  }
  return res.data as T;
}

/** Readable message for toasts and inline errors (network failures included). */
export function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Cannot reach the API. Is the backend running?";
}
