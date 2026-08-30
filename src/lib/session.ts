import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export type Session = { id: number; role: "user" | "admin"; name: string };
const secret = process.env.SESSION_SECRET ?? "local-development-only-change-before-deploy";
function signature(value: string) { return createHmac("sha256", secret).update(value).digest("base64url"); }
export function makeSession(session: Session) { const value = Buffer.from(JSON.stringify(session)).toString("base64url"); return `${value}.${signature(value)}`; }
export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get("ocean_session")?.value; if (!raw) return null;
  const [value, sign] = raw.split("."); if (!value || !sign) return null;
  const expected = signature(value); if (sign.length !== expected.length || !timingSafeEqual(Buffer.from(sign), Buffer.from(expected))) return null;
  try { const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); return typeof parsed.id === "number" && (parsed.role === "user" || parsed.role === "admin") ? parsed : null; } catch { return null; }
}
