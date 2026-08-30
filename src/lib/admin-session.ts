import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { Timestamp } from "firebase-admin/firestore";
import { assertFirebaseServerReady, firestore } from "@/lib/firebase-admin";
import { cleanupOneExpiredAdminSessionRevocation } from "@/lib/firestore-store";
import { isSameOriginJsonMutation, randomToken } from "@/lib/security";

const cookieName = "sea_forest_admin";
const maxAgeSeconds = 60 * 60 * 2;
const maximumClockSkewMs = 60 * 1000;
const revokedSessions = firestore.collection("admin_session_revocations");
type ParsedSession = { issuedAt: number; nonce: string };

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  return secret;
}

function passwordHash() {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash || !hash.startsWith("$2")) throw new Error("ADMIN_PASSWORD_HASH must be a bcrypt hash.");
  return hash;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export async function verifyAdminPassword(password: string) {
  return bcrypt.compare(password, passwordHash());
}

export function makeAdminSession() {
  const issuedAt = Date.now().toString(36);
  const value = `${issuedAt}.${randomToken()}`;
  return `${value}.${sign(value)}`;
}

function parseAdminSession(raw: string): ParsedSession | null {
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const value = `${parts[0]}.${parts[1]}`;
  let expected: string;
  try { expected = sign(value); } catch { return null; }
  if (parts[2].length !== expected.length || !timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) return null;
  const issuedAt = Number.parseInt(parts[0], 36);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0 || issuedAt > Date.now() + maximumClockSkewMs || Date.now() - issuedAt > maxAgeSeconds * 1000) return null;
  return { issuedAt, nonce: parts[1] };
}

function revocationReference(nonce: string) {
  return revokedSessions.doc(createHash("sha256").update(nonce).digest("hex"));
}

export async function hasAdminSession() {
  const raw = (await cookies()).get(cookieName)?.value;
  if (!raw) return false;
  const parsed = parseAdminSession(raw);
  if (!parsed) return false;
  try {
    await assertFirebaseServerReady();
    return !(await revocationReference(parsed.nonce).get()).exists;
  } catch { return false; }
}

export async function revokeAdminSession() {
  const raw = (await cookies()).get(cookieName)?.value;
  if (!raw) return false;
  const parsed = parseAdminSession(raw);
  if (!parsed) return false;
  await assertFirebaseServerReady();
  await revocationReference(parsed.nonce).set({ revokedAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(parsed.issuedAt + maxAgeSeconds * 1000) });
  try { await cleanupOneExpiredAdminSessionRevocation(); } catch { /* Revocation is durable even if bounded cleanup fails. */ }
  return true;
}

export async function requireAdminMutation(request: Request) {
  return isSameOriginJsonMutation(request) && await hasAdminSession();
}

export function adminCookieOptions(maxAge = maxAgeSeconds) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    expires: new Date(Date.now() + Math.max(0, maxAge) * 1000),
  };
}

export const adminCookieName = cookieName;
