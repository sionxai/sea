import Image from "next/image";
import Link from "next/link";
import { Catalog } from "@/components/catalog";

export default function Home() {
  return <main>
    <section className="home-hero">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">URCHIN SHELL · SEA FOREST</p>
          <h1>작은 블록 하나가<br/><span>바다의 숲</span>이 됩니다</h1>
          <p>버려지는 성게 껍질로 만든 생태 블록에 해조류 포자를 담았습니다. 키트를 고르고, 알맞은 해역을 찾아, 당신의 바다숲을 시작해 보세요.</p>
          <div className="hero-actions"><Link className="button" href="/products">키트 둘러보기 <span aria-hidden>→</span></Link><Link className="text-link" href="/regions">어디에 심을 수 있나요?</Link></div>
          <div className="hero-trust"><span>✓ 장비 없이 시작</span><span>✓ 추천 해역 안내</span><span>✓ 이식 기록 인증</span></div>
        </div>
        <figure className="hero-media">
          <Image src="/images/hero-sea-forest.png" alt="성게 패각 생태 블록에서 자라는 어린 해조류" fill priority sizes="(max-width: 760px) 100vw, 52vw" />
          <figcaption><strong>FROM URCHIN TO OCEAN</strong><span>성게 패각을 다시 바다의 기반으로</span></figcaption>
        </figure>
      </div>
    </section>
    <section className="shell proof-strip" aria-label="서비스 이용 순서">
      <div><span>01</span><p><strong>키트 고르기</strong><small>해조류와 계절에 맞게</small></p></div>
      <div><span>02</span><p><strong>해역 확인하기</strong><small>지역별 주의사항까지</small></p></div>
      <div><span>03</span><p><strong>심고 인증하기</strong><small>나의 바다숲 기록 남기기</small></p></div>
    </section>
    <section className="shell section home-products">
      <div className="section-head"><div><p className="eyebrow">START YOUR SEA FOREST</p><h2>처음이어도 괜찮은 바다 식목 키트</h2><p className="section-copy">재료와 목적이 다른 세 가지 키트 중 나에게 맞는 시작을 찾아보세요.</p></div><Link href="/products" className="text-link">모든 키트 보기 →</Link></div>
      <Catalog featured/>
    </section>
    <section className="impact-band">
      <div className="shell impact-grid"><div><p className="eyebrow">WHY URCHIN SHELL?</p><h2>문제의 원인을<br/>회복의 재료로</h2></div><p>바다 사막화를 악화시키는 성게의 껍질을 버리지 않고, 어린 해조류가 뿌리내릴 수 있는 다공성 생태 블록으로 다시 만듭니다.</p><Link className="button subtle" href="/certify">이식 인증 알아보기</Link></div>
    </section>
  </main>;
}
