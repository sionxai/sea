import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isDemoAccountEmail } from "@/lib/demo-accounts";

export type Session = { id: number; role: "user" | "admin"; name: string; demo: boolean };
function sessionSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "development") return "local-development-only-session-secret";
  throw new Error("SESSION_SECRET must be set to at least 32 characters outside local development.");
}
function signature(value: string) { return createHmac("sha256", sessionSecret()).update(value).digest("base64url"); }
export function makeSession(session: Session) { const value = Buffer.from(JSON.stringify(session)).toString("base64url"); return `${value}.${signature(value)}`; }
export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get("ocean_session")?.value; if (!raw) return null;
  const [value, sign] = raw.split("."); if (!value || !sign) return null;
  let expected: string; try { expected = signature(value); } catch (error) { console.error("Authentication session verification unavailable", error); return null; }
  if (sign.length !== expected.length || !timingSafeEqual(Buffer.from(sign), Buffer.from(expected))) return null;
  try { const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); if (typeof parsed.id !== "number" || (parsed.role !== "user" && parsed.role !== "admin") || typeof parsed.demo !== "boolean") return null; if (process.env.NODE_ENV === "production" && (parsed.demo || isDemoAccountEmail(parsed.email ?? ""))) return null; return parsed; } catch { return null; }
}
