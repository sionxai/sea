"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState(""), [message, setMessage] = useState(""), [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json() as { message?: string };
      if (!response.ok) { setMessage(data.message ?? "로그인하지 못했습니다."); return; }
      router.replace("/admin"); router.refresh();
    } catch { setMessage("로그인하지 못했습니다. 다시 시도해 주세요."); }
    finally { setLoading(false); }
  }
  return <form className="form admin-login-form" onSubmit={submit}><label>관리자 비밀번호<input className="field" aria-label="관리자 비밀번호" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" maxLength={256}/></label>{message && <div className="error" role="alert">{message}</div>}<button className="button" disabled={loading}>{loading ? "확인 중…" : "관리자 로그인"}</button></form>;
}
