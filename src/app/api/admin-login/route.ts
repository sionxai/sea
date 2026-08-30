import { NextResponse } from "next/server";
import { adminCookieName, adminCookieOptions, makeAdminSession, verifyAdminPassword } from "@/lib/admin-session";
import { cleanupExpiredOperationalDocs, clearFirestoreAttempts, consumeFirestoreAttempt } from "@/lib/firestore-store";
import { hasOnlyKeys, hasPermittedContentLength, isSameOriginJsonMutation, readJson, requestClientId } from "@/lib/security";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isSameOriginJsonMutation(request)) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 403, headers: noStore });
  if (!hasPermittedContentLength(request, 1024)) return NextResponse.json({ message: "로그인 정보가 너무 큽니다." }, { status: 413, headers: noStore });
  const clientId = requestClientId(request);
  let clientRate: { allowed: boolean; retryAfterSeconds: number }, globalRate: { allowed: boolean; retryAfterSeconds: number };
  try {
    clientRate = await consumeFirestoreAttempt("admin-login-client", clientId);
    globalRate = await consumeFirestoreAttempt("admin-login-global", "global", 50);
  } catch { return NextResponse.json({ message: "관리자 인증 서비스를 일시적으로 사용할 수 없습니다." }, { status: 503, headers: noStore }); }
  if (!clientRate.allowed || !globalRate.allowed) {
    const retryAfterSeconds = Math.max(clientRate.retryAfterSeconds, globalRate.retryAfterSeconds);
    return NextResponse.json({ message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { ...noStore, "Retry-After": String(retryAfterSeconds) } });
  }
  const parsed = await readJson<unknown>(request, 1024);
  if (!parsed.ok) return NextResponse.json({ message: parsed.tooLarge ? "로그인 정보가 너무 큽니다." : "비밀번호를 확인해 주세요." }, { status: parsed.tooLarge ? 413 : 400, headers: noStore });
  const body = parsed.value;
  if (!hasOnlyKeys(body, ["password"]) || typeof body.password !== "string" || body.password.length > 256) return NextResponse.json({ message: "비밀번호를 확인해 주세요." }, { status: 400, headers: noStore });
  try {
    if (!await verifyAdminPassword(body.password)) return NextResponse.json({ message: "비밀번호를 확인해 주세요." }, { status: 401, headers: noStore });
    await Promise.all([clearFirestoreAttempts("admin-login-client", clientId), clearFirestoreAttempts("admin-login-global", "global")]);
    try { await cleanupExpiredOperationalDocs(); } catch { /* Bounded operational cleanup is non-fatal. */ }
    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(adminCookieName, makeAdminSession(), adminCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ message: "관리자 인증 설정을 확인해 주세요." }, { status: 503, headers: noStore });
  }
}
