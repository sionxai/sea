import { NextResponse } from "next/server";
import { getProduct } from "@/lib/firestore-store";
export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const product = await getProduct(Number((await params).id));
    return product ? NextResponse.json(product, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ message: "상품을 찾을 수 없습니다." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "상품 정보를 불러오지 못했습니다." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
