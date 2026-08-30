import { NextResponse } from "next/server";
import { getRegions } from "@/lib/store";
export const runtime = "nodejs";
export function GET() { return NextResponse.json(getRegions()); }
