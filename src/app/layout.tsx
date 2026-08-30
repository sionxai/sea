import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "바다숲 키트", description: "성게 패각 생태 블록으로 바다에 해조류를 심는 키트" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><header className="nav"><nav className="shell nav-in" aria-label="주요 메뉴"><Link className="brand" href="/">바다숲 키트</Link><div className="nav-links"><Link href="/products">키트 둘러보기</Link><Link href="/regions">추천 해역</Link><Link href="/certify">이식 인증</Link><Link href="/orders">주문 조회</Link><Link href="/login">로그인</Link></div></nav></header>{children}</body></html>;
}
