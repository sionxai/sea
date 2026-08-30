import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function requestClientId(request: Request): string {
  // Forwarded headers are trusted only when the hosting platform/proxy is
  // explicitly identified. User-Agent and language are attacker-rotatable.
  const trustedIp = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")
    : process.env.TRUST_PROXY === "1" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : null;
  return trustedIp ? createHash("sha256").update(trustedIp.slice(0, 128)).digest("base64url") : "unidentified";
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export function isSameOriginJsonMutation(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  const contentType = request.headers.get("content-type") ?? "";
  return isSameOrigin(request) && fetchSite === "same-origin" && contentType.toLowerCase().startsWith("application/json");
}

export function hasOnlyKeys(value: unknown, allowedKeys: readonly string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).every((key) => allowedKeys.includes(key));
}

export function hasPermittedContentLength(request: Request, maximumBytes: number) {
  const raw = request.headers.get("content-length");
  if (!raw) return true;
  const size = Number(raw);
  return Number.isSafeInteger(size) && size >= 0 && size <= maximumBytes;
}

export type JsonBody<T> = { ok: true; value: T } | { ok: false; tooLarge: boolean };

export function randomToken(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}

export async function readJson<T>(request: Request, maximumBytes: number): Promise<JsonBody<T>> {
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > maximumBytes) return { ok: false, tooLarge: true };
    return { ok: true, value: JSON.parse(raw) as T };
  } catch { return { ok: false, tooLarge: false }; }
}
