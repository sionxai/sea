import { NextResponse } from "next/server";
import { certifyKit } from "@/lib/store";
import { getSession } from "@/lib/session";
export const runtime = "nodejs";
export async function POST(request: Request) { const body = await request.json().catch(() => null) as { code?: string; regionId?: number } | null; const regionId = body?.regionId; if (!body?.code || typeof regionId !== "number" || !Number.isInteger(regionId)) return NextResponse.json({ message: "키트 코드와 추천 해역을 확인해 주세요." }, { status: 400 }); try { const session = await getSession(); certifyKit(body.code.trim().toUpperCase(), regionId, session?.id); return NextResponse.json({ ok: true }, { status: 201 }); } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "인증하지 못했습니다." }, { status: 400 }); } }
