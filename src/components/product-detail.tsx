"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getProductDetailContent } from "@/lib/product-detail-content";
import { resolveProductImage } from "@/lib/product-images";
import type { Product } from "@/lib/types";

export function ProductDetail({ id }: { id: number }) {
  const [product, setProduct] = useState<Product | null>(null), [error, setError] = useState(false);
  useEffect(() => { fetch(`/api/products/${id}`).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Product>; }).then(setProduct).catch(() => setError(true)); }, [id]);
  if (error) return <main className="shell section"><div className="state"><p>정보를 불러오지 못했습니다.</p><Link className="button" href="/products">목록으로 돌아가기</Link></div></main>;
  if (!product) return <main className="shell detail-loading"><div className="skeleton"/><div className="skeleton"/></main>;
  const image = resolveProductImage(product.id, product.image);
  const detail = getProductDetailContent(product.id);
  return <main className="product-page">
    <div className="shell">
      <nav className="breadcrumb" aria-label="현재 위치"><Link href="/">홈</Link><span>/</span><Link href="/products">키트</Link><span>/</span><strong>{product.name}</strong></nav>
      <section className="detail-layout">
        <div className="detail-gallery">
          <div className="detail-main-image">{image ? <Image src={image} alt={`${product.name} 전체 구성`} fill priority sizes="(max-width: 760px) 100vw, 58vw" /> : <span aria-hidden>{product.image}</span>}<span className="image-note">실제 구성 이미지</span></div>
          <div className="detail-thumbs"><div className="detail-thumb">{image && <Image src={image} alt="키트 구성 확대" fill sizes="28vw" />}</div><div className="detail-thumb underwater"><Image src="/images/hero-sea-forest.png" alt="바다에 이식된 생태 블록" fill sizes="28vw" /><span>이식 후 모습</span></div></div>
        </div>
        <aside className="purchase-card">
          <p className="eyebrow">{product.category} · SEA FOREST KIT</p>
          <div className="detail-rating"><span>★★★★★</span><a href="#reviews">5.0 · 후기 {product.reviews.length}개</a></div>
          <h1>{product.name}</h1>
          <p className="detail-subtitle">{detail.subtitle}</p>
          <p className="detail-description">{product.description}</p>
          <div className="detail-price"><strong>{product.price.toLocaleString()}원</strong><span>배송비 포함 · 테스트 결제</span></div>
          <div className="option-box"><span>키트 구성</span><strong>{product.options.join(" + ")}</strong></div>
          <ul className="benefit-list">{detail.kitContents.slice(0, 3).map((item, index) => <li key={item.title}><span>{String(index + 1).padStart(2, "0")}</span>{item.title}</li>)}</ul>
          <Link className="button purchase-button" href={`/checkout?product=${product.id}`}>이 키트로 바다숲 시작하기</Link>
          <div className="purchase-meta"><span>남은 재고 <b>{product.stock}개</b></span><span>로컬 테스트 결제</span></div>
        </aside>
      </section>
      <nav className="detail-anchor-nav" aria-label="상품 상세 바로가기"><a href="#overview">한눈에 보기</a><a href="#contents">키트 구성</a><a href="#guide">이식 안내</a><a href="#safety">주의사항</a><a href="#faq">자주 묻는 질문</a><a href="#reviews">후기</a></nav>
      <section className="detail-overview" id="overview"><div className="section-head"><div><p className="eyebrow">AT A GLANCE</p><h2>이 키트를 한눈에</h2></div><p>수치나 전문 장비보다, 처음 참여할 때 꼭 알아야 할 기준을 중심으로 정리했습니다.</p></div><div className="highlight-grid">{detail.highlights.map(item => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}</div><div className="recommended-box"><div><p className="eyebrow">RECOMMENDED FOR</p><h3>이런 분께 추천해요</h3></div><ul>{detail.recommendedFor.map(item => <li key={item}>{item}</li>)}</ul></div></section>
      <section className="kit-contents" id="contents"><div className="kit-contents-image">{image && <Image src={image} alt={`${product.name} 구성품 상세`} fill sizes="(max-width: 760px) 100vw, 44vw"/>}<span>상품별 구성은 주문 전 다시 확인해 주세요.</span></div><div className="kit-contents-copy"><p className="eyebrow">WHAT&apos;S IN THE KIT</p><h2>키트에 들어 있어요</h2><div className="content-list">{detail.kitContents.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div></div></section>
      <section className="product-story">
        <div className="story-copy"><p className="eyebrow">A CIRCLE BACK TO THE SEA</p><h2>버려진 성게 껍질이<br/>새로운 숲의 터전이 됩니다</h2><p>잘게 분쇄한 성게 패각을 다공성 블록으로 만들고 해조류가 자리 잡도록 돕습니다. 물속에서 자연스럽게 머물며 어린 해조류가 뿌리내릴 표면을 제공합니다.</p></div>
        <div className="story-image"><Image src="/images/hero-sea-forest.png" alt="수중에서 해조류가 자라는 생태 블록" fill sizes="(max-width: 760px) 100vw, 52vw" /></div>
      </section>
      <section className="how-it-works" id="guide"><p className="eyebrow">HOW IT WORKS</p><h2>네 단계로 시작하는 바다 식목</h2><div className="step-grid four"><article><span>01</span><h3>키트를 확인해요</h3><p>구성품과 해조류 상태, 고유 코드를 먼저 확인합니다.</p></article><article><span>02</span><h3>추천 해역을 찾아요</h3><p>계절과 지역별 주의사항을 확인하고 현지 안내를 따릅니다.</p></article><article><span>03</span><h3>안전하게 이식해요</h3><p>파도와 접근 조건을 확인하고 무리하지 않는 범위에서 진행합니다.</p></article><article><span>04</span><h3>참여를 기록해요</h3><p>고유 코드와 추천 해역을 선택해 나의 바다숲 기록을 남깁니다.</p></article></div></section>
      <section className="preflight-section" id="safety"><div className="preflight-image"><Image src="/images/certification-action.png" alt="얕은 바다에 생태 블록을 이식하는 모습" fill loading="eager" sizes="(max-width: 760px) 100vw, 45vw"/></div><div className="preflight-copy"><p className="eyebrow">BEFORE YOU PLANT</p><h2>이식 전에 꼭 확인해 주세요</h2><ul>{detail.preflight.map(item => <li key={item}><span>✓</span>{item}</li>)}</ul><Link className="button subtle" href="/regions">추천 해역 다시 보기</Link></div></section>
      <section className="care-section"><div className="section-head"><div><p className="eyebrow">CARE &amp; NOTICE</p><h2>보관과 현장 주의사항</h2></div><p>현지 안내와 안전 판단이 키트 안내보다 항상 우선합니다.</p></div><div className="care-grid">{detail.care.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></section>
      <section className="faq-section" id="faq"><div><p className="eyebrow">FAQ</p><h2>자주 묻는 질문</h2><p>구매 전 알아두면 좋은 내용을 모았습니다.</p></div><div className="faq-list">{detail.faqs.map((item, index) => <details key={item.question} open={index === 0}><summary>{item.question}<span>＋</span></summary><p>{item.answer}</p></details>)}</div></section>
      <section className="reviews-section" id="reviews"><div className="section-head"><div><p className="eyebrow">REAL EXPERIENCE</p><h2>먼저 바다숲을 시작한 이야기</h2></div><strong className="review-score">5.0 <span>★★★★★</span></strong></div>{product.reviews.map((review) => <article className="review-card" key={review.id}><div><b>{review.author}</b><span>{"★".repeat(review.rating)}</span></div><p>{review.content}</p><small>구매 인증 후기</small></article>)}</section>
    </div>
    <div className="mobile-purchase-bar"><div><span>{product.name}</span><strong>{product.price.toLocaleString()}원</strong></div><Link className="button" href={`/checkout?product=${product.id}`}>구매하기</Link></div>
  </main>;
}
