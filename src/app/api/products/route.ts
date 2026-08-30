import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/store";
export const runtime = "nodejs";
export function GET(request: NextRequest) { const { searchParams } = request.nextUrl; return NextResponse.json(getProducts(searchParams.get("q") ?? "", searchParams.get("category") ?? "")); }
