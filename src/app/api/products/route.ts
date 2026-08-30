import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/firestore-store";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  try {
    return NextResponse.json(await getProducts(searchParams.get("q") ?? "", searchParams.get("category") ?? ""), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "상품 정보를 불러오지 못했습니다." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
