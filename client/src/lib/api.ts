/**
 * Tiny fetch wrapper for the PokerPoker API.
 * In dev, Vite proxies /api → http://localhost:3001 (see vite.config.ts).
 * In production, the Express server serves this app on the same origin.
 */
const BASE = "/api";

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  return {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(extra ?? {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: authHeaders({
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function requestBlob(path: string): Promise<Blob> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  getBlob: (path: string) => requestBlob(path),
};

export type HealthResponse = { status: string; db: boolean };

/** Upload a data-URL image, returns the new photo id. */
export async function uploadPhoto(dataUrl: string): Promise<string> {
  const comma = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const mimeType = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const { id } = await api.post<{ id: string }>("/photos", { data, mimeType });
  return id;
}
