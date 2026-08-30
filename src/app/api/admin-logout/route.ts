import { NextResponse } from "next/server";
import { adminCookieName, adminCookieOptions, hasAdminSession, revokeAdminSession } from "@/lib/admin-session";
import { hasOnlyKeys, hasPermittedContentLength, isSameOriginJsonMutation, readJson } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginJsonMutation(request) || !await hasAdminSession()) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!hasPermittedContentLength(request, 128)) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 413, headers: { "Cache-Control": "no-store" } });
  const parsed = await readJson<unknown>(request, 128);
  if (!parsed.ok) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: parsed.tooLarge ? 413 : 400, headers: { "Cache-Control": "no-store" } });
  if (!hasOnlyKeys(parsed.value, [])) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    if (!await revokeAdminSession()) return NextResponse.json({ message: "로그아웃 정보를 확인하지 못했습니다." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(adminCookieName, "", adminCookieOptions(0));
    return response;
  } catch { return NextResponse.json({ message: "로그아웃을 완료하지 못했습니다." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
