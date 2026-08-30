import { NextResponse } from "next/server";
import { consumeFirestoreAttempt, lookupGuestOrder } from "@/lib/firestore-store";
import { hasOnlyKeys, hasPermittedContentLength, isSameOriginJsonMutation, readJson, requestClientId } from "@/lib/security";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };
const lookupFailure = { message: "주문 번호 또는 조회 코드가 맞지 않습니다." };

export async function POST(request: Request) {
  if (!isSameOriginJsonMutation(request)) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 403, headers: noStore });
  if (!hasPermittedContentLength(request, 2 * 1024)) return NextResponse.json({ message: "조회 정보가 너무 큽니다." }, { status: 413, headers: noStore });
  let rate: { allowed: boolean; retryAfterSeconds: number };
  try { rate = await consumeFirestoreAttempt("guest-order-lookup", requestClientId(request)); }
  catch { return NextResponse.json({ message: "주문 조회 서비스를 일시적으로 사용할 수 없습니다." }, { status: 503, headers: noStore }); }
  if (!rate.allowed) return NextResponse.json({ message: "잠시 후 다시 시도해 주세요." }, { status: 429, headers: { ...noStore, "Retry-After": String(rate.retryAfterSeconds) } });
  const parsed = await readJson<unknown>(request, 2 * 1024);
  if (!parsed.ok) return NextResponse.json(parsed.tooLarge ? { message: "조회 정보가 너무 큽니다." } : lookupFailure, { status: parsed.tooLarge ? 413 : 404, headers: noStore });
  const body = parsed.value;
  if (!hasOnlyKeys(body, ["orderNumber", "lookupCode"]) || typeof body.orderNumber !== "string" || typeof body.lookupCode !== "string") return NextResponse.json(lookupFailure, { status: 404, headers: noStore });
  try {
    const order = await lookupGuestOrder(body.orderNumber, body.lookupCode);
    return order ? NextResponse.json({ order }, { headers: noStore }) : NextResponse.json(lookupFailure, { status: 404, headers: noStore });
  } catch { return NextResponse.json({ message: "주문 조회 서비스를 일시적으로 사용할 수 없습니다." }, { status: 503, headers: noStore }); }
}
