import { NextResponse } from "next/server";
import { FirebaseConfigurationError } from "@/lib/firebase-admin";
import { consumeFirestoreAttempt, createGuestOrder } from "@/lib/firestore-store";
import { hasOnlyKeys, hasPermittedContentLength, isSameOriginJsonMutation, readJson, requestClientId } from "@/lib/security";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isSameOriginJsonMutation(request)) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 403, headers: noStore });
  if (!hasPermittedContentLength(request, 8 * 1024)) return NextResponse.json({ message: "주문 정보가 너무 큽니다." }, { status: 413, headers: noStore });
  let rate: { allowed: boolean; retryAfterSeconds: number };
  try { rate = await consumeFirestoreAttempt("guest-order-create", requestClientId(request), 10); }
  catch { return NextResponse.json({ message: "주문 서비스를 일시적으로 사용할 수 없습니다." }, { status: 503, headers: noStore }); }
  if (!rate.allowed) return NextResponse.json({ message: "주문 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { ...noStore, "Retry-After": String(rate.retryAfterSeconds) } });
  const parsed = await readJson<unknown>(request, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ message: parsed.tooLarge ? "주문 정보가 너무 큽니다." : "주문 정보를 확인해 주세요." }, { status: parsed.tooLarge ? 413 : 400, headers: noStore });
  const body = parsed.value;
  const idempotencyKey = request.headers.get("idempotency-key") ?? "";
  if (!hasOnlyKeys(body, ["productId", "quantity", "recipient", "phone", "address"])) return NextResponse.json({ message: "주문 정보를 확인해 주세요." }, { status: 400, headers: noStore });
  try {
    const order = await createGuestOrder({ productId: body.productId, quantity: body.quantity, recipient: body.recipient, phone: body.phone, address: body.address, idempotencyKey });
    return NextResponse.json({ order }, { status: order.duplicate ? 200 : 201, headers: noStore });
  } catch (error) {
    if (error instanceof FirebaseConfigurationError) return NextResponse.json({ message: "주문 서비스를 일시적으로 사용할 수 없습니다." }, { status: 503, headers: noStore });
    return NextResponse.json({ message: error instanceof Error ? error.message : "주문을 만들 수 없습니다." }, { status: 400, headers: noStore });
  }
}
