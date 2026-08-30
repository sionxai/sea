import { NextResponse } from "next/server";
import { getProduct } from "@/lib/store";
export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const product = getProduct(Number((await params).id)); return product ? NextResponse.json(product) : NextResponse.json({ message: "상품을 찾을 수 없습니다." }, { status: 404 }); }
