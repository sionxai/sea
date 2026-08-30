import { NextResponse } from "next/server";
import { authenticate } from "@/lib/store";
import { makeSession } from "@/lib/session";
export const runtime = "nodejs";
export async function POST(request: Request) { const body = await request.json().catch(() => null) as { email?: string; password?: string } | null; if (!body?.email || !body.password) return NextResponse.json({ message: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 }); const user = authenticate(body.email.toLowerCase(), body.password); if (!user) return NextResponse.json({ message: "이메일 또는 비밀번호가 맞지 않습니다." }, { status: 401 }); const response = NextResponse.json({ name: user.name, role: user.role }); response.cookies.set("ocean_session", makeSession({ id: user.id, role: user.role as "user" | "admin", name: user.name }), { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7 }); return response; }
