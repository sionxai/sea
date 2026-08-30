"use client";

import { useEffect, useState } from "react";
import type { Order as MemberOrder } from "@/lib/types";

type GuestOrder = { orderNumber: string; productName: string; quantity: number; totalPrice: number; status: string; createdAt: string };
type NewOrder = { orderNumber: string; lookupCode: string; totalPrice: number };

export function Orders({ createdOrderNumber, memberOrders = [] }: { createdOrderNumber?: string; memberOrders?: MemberOrder[] }) {
  const [orderNumber, setOrderNumber] = useState(createdOrderNumber ?? "");
  const [lookupCode, setLookupCode] = useState("");
  const [order, setOrder] = useState<GuestOrder | null>(null);
  const [newOrder, setNewOrder] = useState<NewOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("sea-forest-new-order");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as NewOrder;
      if (parsed.orderNumber === createdOrderNumber && typeof parsed.lookupCode === "string") setNewOrder(parsed);
    } catch { setMessage("주문 완료 정보를 표시하지 못했습니다. 주문 번호와 조회 코드로 다시 확인해 주세요."); }
    sessionStorage.removeItem("sea-forest-new-order");
  }, [createdOrderNumber]);

  async function lookup(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage(""); setOrder(null);
    try {
      const response = await fetch("/api/orders/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber, lookupCode }), cache: "no-store" });
      const data = await response.json() as { order?: GuestOrder; message?: string };
      if (!response.ok || !data.order) { setMessage(data.message ?? "주문 번호 또는 조회 코드가 맞지 않습니다."); return; }
      setOrder(data.order);
    } catch { setMessage("주문 조회를 완료하지 못했습니다. 다시 시도해 주세요."); }
    finally { setLoading(false); }
  }

  return <div className="orders-lookup">
    {newOrder && <section className="notice order-created" data-testid="order-created"><strong>주문이 접수되었습니다.</strong><p>주문 번호 <b data-testid="order-number">{newOrder.orderNumber}</b></p><p>조회 코드 <b data-testid="lookup-code">{newOrder.lookupCode}</b></p><small>조회 코드는 지금 한 번만 표시됩니다. 주문 번호와 함께 안전한 곳에 보관해 주세요.</small></section>}
    {memberOrders.length > 0 && <section className="member-orders"><p className="eyebrow">MEMBER ORDER HISTORY</p><h3>기존 회원 주문 내역</h3><div className="admin-list">{memberOrders.map((memberOrder) => <article className="panel" key={memberOrder.id}><div className="order-result"><b>주문 #{memberOrder.id}</b><strong>{memberOrder.status}</strong></div><p className="muted">{new Date(memberOrder.createdAt).toLocaleDateString("ko-KR")} · {memberOrder.items.map((item) => `${item.productName} ${item.quantity}개`).join(", ")}</p><b>{memberOrder.totalPrice.toLocaleString()}원</b></article>)}</div></section>}
    <form className="panel orders-form" onSubmit={lookup}>
      <div><p className="eyebrow">GUEST ORDER LOOKUP</p><h3>주문 번호와 조회 코드로 확인하기</h3><p className="muted">비회원 주문도 두 정보를 모두 입력하면 배송 상태를 확인할 수 있습니다.</p></div>
      <label>주문 번호<input className="field" aria-label="주문 번호" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value.toUpperCase())} required maxLength={32} placeholder="SF-20260831-16자리 코드"/></label>
      <label>조회 코드<input className="field" aria-label="조회 코드" value={lookupCode} onChange={(event) => setLookupCode(event.target.value.toUpperCase())} required maxLength={40} placeholder="AAAAAA-BBBBBB-CCCCCC-DDDDDD"/></label>
      <button className="button" disabled={loading}>{loading ? "조회 중…" : "주문 조회하기"}</button>
    </form>
    {message && <div className="error" role="alert">{message}</div>}
    {order && <article className="panel order-result" data-testid="order-result"><div><b>주문 {order.orderNumber}</b><strong>{order.status}</strong></div><p className="muted">{new Date(order.createdAt).toLocaleDateString("ko-KR")} · {order.productName} {order.quantity}개</p><b>{order.totalPrice.toLocaleString()}원</b></article>}
  </div>;
}
