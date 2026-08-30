import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AdminDashboard } from "@/components/admin-dashboard";
export default async function AdminPage() { const session = await getSession(); if (session?.role !== "admin") redirect("/login"); return <main className="subpage"><section className="admin-hero"><div className="shell admin-hero-inner"><div><p className="eyebrow">ADMIN OPERATIONS</p><h1>바다숲 키트 운영 관리</h1><p>상품 등록과 재고, 주문 배송 상태를 한 화면에서 관리합니다.</p></div><div className="admin-image"><Image src="/images/order-support.png" alt="운영 준비가 완료된 키트 패키지" fill sizes="340px"/></div></div></section><section className="shell admin-section"><AdminDashboard/></section></main>; }
