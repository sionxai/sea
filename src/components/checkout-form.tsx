"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type OrderResult = { order?: { orderNumber: string; lookupCode?: string; totalPrice: number }; message?: string };
const pendingOrderKey = "sea-forest-pending-order";

export function CheckoutForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [recipient, setRecipient] = useState(""), [phone, setPhone] = useState(""), [address, setAddress] = useState(""), [quantity, setQuantity] = useState(1), [sending, setSending] = useState(false), [message, setMessage] = useState("");
  const valid = recipient.trim().length > 1 && phone.trim().length >= 7 && address.trim().length > 5 && Number.isInteger(quantity) && quantity > 0 && quantity <= 99;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!valid) return;
    setSending(true); setMessage("");
    const payload = { productId, quantity, recipient: recipient.trim(), phone: phone.trim(), address: address.trim() };
    const fingerprint = JSON.stringify(payload);
    let idempotencyKey: string;
    try {
      const pending = JSON.parse(sessionStorage.getItem(pendingOrderKey) ?? "null") as { fingerprint?: unknown; key?: unknown } | null;
      idempotencyKey = pending?.fingerprint === fingerprint && typeof pending.key === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(pending.key) ? pending.key : crypto.randomUUID();
      sessionStorage.setItem(pendingOrderKey, JSON.stringify({ fingerprint, key: idempotencyKey }));
    } catch { setSending(false); setMessage("주문 재시도 정보를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."); return; }
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) });
      const data = await response.json() as OrderResult;
      if (!response.ok || !data.order?.lookupCode) { setMessage(data.message ?? "주문을 처리하지 못했습니다. 네트워크가 끊겼다면 주문 조회를 이용해 주세요."); return; }
      sessionStorage.setItem("sea-forest-new-order", JSON.stringify(data.order));
      sessionStorage.removeItem(pendingOrderKey);
      router.push(`/orders?created=${encodeURIComponent(data.order.orderNumber)}`);
    } catch { setMessage("주문을 처리하지 못했습니다. 네트워크를 확인하고 같은 내용으로 다시 시도해 주세요."); }
    finally { setSending(false); }
  }
  return <form className="checkout-form" onSubmit={submit}>
    <div className="notice">실제 청구 없이 ‘테스트 결제 완료’ 상태로 Firestore에 안전하게 저장됩니다.</div>
    <div className="form-fields">
      <label>받는 분<input className="field" value={recipient} onChange={(e) => setRecipient(e.target.value)} required maxLength={80} placeholder="이름을 입력해 주세요"/></label>
      <label>연락처<input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={30} inputMode="tel" placeholder="배송 연락을 받을 번호"/></label>
      <label>배송지<input className="field" value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={240} placeholder="시·군·구부터 상세 주소까지 입력"/></label>
      <label>수량<input className="field" min="1" max="99" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required/></label>
    </div>
    {message && <div className="error">{message}</div>}
    <button className="button checkout-submit" disabled={!valid || sending}>{sending ? "결제 처리 중…" : "테스트 결제 완료하기"}</button>
    <p className="privacy-note">배송 정보는 주문 처리와 배송 조회에만 사용됩니다. 같은 주문 내용을 다시 보내면 기존 조회 코드를 다시 안전하게 받을 수 있습니다.</p>
  </form>;
}
