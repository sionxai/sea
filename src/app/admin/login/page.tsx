import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { hasAdminSession } from "@/lib/admin-session";

export default async function AdminLoginPage() {
  if (await hasAdminSession()) redirect("/admin");
  return <main className="auth-page"><section className="shell"><div className="admin-login-card"><p className="eyebrow">ADMIN ONLY</p><h1>운영 관리 로그인</h1><p className="muted">관리자 비밀번호를 입력해 상품과 주문을 관리하세요.</p><AdminLoginForm/></div></section></main>;
}
