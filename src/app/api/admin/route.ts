import { NextResponse } from "next/server";
import { createProduct, getAdminOrders, updateOrderStatus, updateProductPrice, updateProductStock } from "@/lib/firestore-store";
import { hasAdminSession, requireAdminMutation } from "@/lib/admin-session";
import { hasOnlyKeys, hasPermittedContentLength, readJson } from "@/lib/security";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };
async function admin() { return hasAdminSession(); }
async function canMutate(request: Request) { return requireAdminMutation(request); }
export async function GET() {
  if (!await admin()) return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403, headers: noStore });
  try { return NextResponse.json({ orders: await getAdminOrders() }, { headers: noStore }); }
  catch { return NextResponse.json({ message: "관리자 데이터를 불러오지 못했습니다." }, { status: 503, headers: noStore }); }
}
export async function POST(request: Request) {
  if (!await canMutate(request)) return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403, headers: noStore });
  if (!hasPermittedContentLength(request, 4 * 1024)) return NextResponse.json({ message: "상품 정보가 너무 큽니다." }, { status: 413, headers: noStore });
  const parsed = await readJson<unknown>(request, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ message: parsed.tooLarge ? "상품 정보가 너무 큽니다." : "상품 정보를 확인해 주세요." }, { status: parsed.tooLarge ? 413 : 400, headers: noStore });
  const body = parsed.value;
  if (!hasOnlyKeys(body, ["name", "description", "price", "stock", "category"])) return NextResponse.json({ message: "상품 정보를 확인해 주세요." }, { status: 400, headers: noStore });
  try { return NextResponse.json({ id: await createProduct({ name: body.name, description: body.description, category: body.category, price: body.price, stock: body.stock }) }, { status: 201, headers: noStore }); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "상품을 등록하지 못했습니다." }, { status: 400, headers: noStore }); }
}
export async function PATCH(request: Request) {
  if (!await canMutate(request)) return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403, headers: noStore });
  if (!hasPermittedContentLength(request, 2 * 1024)) return NextResponse.json({ message: "수정 정보가 너무 큽니다." }, { status: 413, headers: noStore });
  const parsed = await readJson<unknown>(request, 2 * 1024);
  if (!parsed.ok) return NextResponse.json({ message: parsed.tooLarge ? "수정 정보가 너무 큽니다." : "요청 형식이 올바르지 않습니다." }, { status: parsed.tooLarge ? 413 : 400, headers: noStore });
  const body = parsed.value;
  if (!hasOnlyKeys(body, ["type", "id", "orderNumber", "value"])) return NextResponse.json({ message: "요청 형식이 올바르지 않습니다." }, { status: 400, headers: noStore });
  try {
    if ((body.type === "stock" || body.type === "price") && !hasOnlyKeys(body, ["type", "id", "value"])) return NextResponse.json({ message: "요청 형식이 올바르지 않습니다." }, { status: 400, headers: noStore });
    if (body.type === "status" && !hasOnlyKeys(body, ["type", "orderNumber", "value"])) return NextResponse.json({ message: "요청 형식이 올바르지 않습니다." }, { status: 400, headers: noStore });
    if (body.type === "stock") await updateProductStock(body.id, body.value);
    else if (body.type === "price") await updateProductPrice(body.id, body.value);
    else if (body.type === "status") await updateOrderStatus(body.orderNumber, body.value);
    else return NextResponse.json({ message: "요청 형식이 올바르지 않습니다." }, { status: 400, headers: noStore });
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "수정하지 못했습니다." }, { status: 400, headers: noStore }); }
}
