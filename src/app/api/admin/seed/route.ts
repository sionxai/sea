import { NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/admin-session";
import { FirebaseConfigurationError } from "@/lib/firebase-admin";
import { seedProductsForAdmin } from "@/lib/firestore-store";
import { hasOnlyKeys, hasPermittedContentLength, readJson } from "@/lib/security";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!await requireAdminMutation(request)) return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403, headers: noStore });
  if (!hasPermittedContentLength(request, 128)) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 413, headers: noStore });
  const parsed = await readJson<unknown>(request, 128);
  if (!parsed.ok) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: parsed.tooLarge ? 413 : 400, headers: noStore });
  if (!hasOnlyKeys(parsed.value, [])) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400, headers: noStore });
  try { await seedProductsForAdmin(); return NextResponse.json({ ok: true }, { headers: noStore }); }
  catch (error) { return NextResponse.json({ message: error instanceof FirebaseConfigurationError ? "운영 시드 권한이 설정되지 않았습니다." : "상품 시드를 만들지 못했습니다." }, { status: error instanceof FirebaseConfigurationError ? 503 : 500, headers: noStore }); }
}
