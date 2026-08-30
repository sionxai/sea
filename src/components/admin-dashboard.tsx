"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";

type AdminOrder = { orderNumber: string; recipient: string; phone: string; address: string; productName: string; quantity: number; totalPrice: number; status: string; createdAt: string };
const mutationHeaders = { "Content-Type": "application/json" };

export function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]), [orders, setOrders] = useState<AdminOrder[]>([]), [message, setMessage] = useState(""), [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const [productResponse, orderResponse] = await Promise.all([fetch("/api/products", { cache: "no-store" }), fetch("/api/admin", { cache: "no-store" })]);
      if (!productResponse.ok || !orderResponse.ok) throw new Error();
      setProducts(await productResponse.json() as Product[]); setOrders((await orderResponse.json() as { orders: AdminOrder[] }).orders);
    } catch { setMessage("관리자 데이터를 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function update(body: { type: "stock" | "price"; id: number; value: number } | { type: "status"; orderNumber: string; value: string }) {
    const response = await fetch("/api/admin", { method: "PATCH", headers: mutationHeaders, body: JSON.stringify(body) });
    const data = await response.json() as { message?: string };
    if (!response.ok) { setMessage(data.message ?? "저장하지 못했습니다."); return; }
    setMessage("저장했습니다."); await load();
  }
  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element);
    const response = await fetch("/api/admin", { method: "POST", headers: mutationHeaders, body: JSON.stringify({ name: form.get("name"), description: form.get("description"), category: form.get("category"), price: Number(form.get("price")), stock: Number(form.get("stock")) }) });
    const data = await response.json() as { message?: string };
    if (!response.ok) { setMessage(data.message ?? "상품을 등록하지 못했습니다."); return; }
    element.reset(); setMessage("상품을 등록했습니다."); await load();
  }
  async function logout() {
    const response = await fetch("/api/admin-logout", { method: "POST", headers: mutationHeaders, body: "{}" });
    if (!response.ok) { setMessage("로그아웃을 완료하지 못했습니다."); return; }
    location.assign("/admin/login");
  }
  if (loading) return <div className="skeleton" aria-label="관리자 데이터를 불러오는 중"/>;
  return <div className="admin-dashboard">
    <div className="admin-actions"><p className="muted">배송 정보는 주문 처리 목적으로만 표시됩니다.</p><button className="button subtle" onClick={() => void logout()}>로그아웃</button></div>
    {message && <div className="notice" role="status">{message}</div>}
    <section><h2>상품 등록</h2><form className="panel form" style={{ margin: "12px 0", maxWidth: "none" }} onSubmit={register}><label>상품명<input className="field" name="name" required maxLength={100}/></label><label>설명<input className="field" name="description" required maxLength={1000}/></label><label>카테고리<input className="field" name="category" required maxLength={50} placeholder="예: 초보자"/></label><label>가격<input className="field" name="price" type="number" min="0" max="100000000" required/></label><label>재고<input className="field" name="stock" type="number" min="0" max="1000000" required/></label><button className="button">상품 등록</button></form></section>
    <section><h2>상품 가격·재고</h2><div className="admin-list">{products.map((product) => <div className="panel admin-product" key={product.id}><b>{product.name}</b><label className="muted">가격 <input className="field" aria-label={`${product.name} 가격`} type="number" min="0" defaultValue={product.price} onBlur={(event) => { const value = Number(event.target.value); if (value !== product.price) void update({ type: "price", id: product.id, value }); }}/></label><label className="muted">재고 <input className="field" aria-label={`${product.name} 재고`} type="number" min="0" defaultValue={product.stock} onBlur={(event) => { const value = Number(event.target.value); if (value !== product.stock) void update({ type: "stock", id: product.id, value }); }}/></label></div>)}</div></section>
    <section><h2>주문·배송 관리</h2><p className="muted">최근 주문 100건까지 표시합니다.</p>{orders.length ? <div className="admin-list">{orders.map((order) => <div className="panel" key={order.orderNumber}><div className="admin-order-head"><b>주문 {order.orderNumber} · {order.recipient}</b><select className="field" aria-label={`주문 ${order.orderNumber} 상태`} value={order.status} onChange={(event) => void update({ type: "status", orderNumber: order.orderNumber, value: event.target.value })}>{["결제완료", "배송중", "배송완료", "취소"].map((status) => <option key={status}>{status}</option>)}</select></div><p className="muted">{order.phone} · {order.address}</p><p className="muted">{order.productName} {order.quantity}개 · {order.totalPrice.toLocaleString()}원</p></div>)}</div> : <div className="state">아직 관리할 주문이 없습니다.</div>}</section>
  </div>;
}
