"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { resolveProductImage } from "@/lib/product-images";
import type { Product } from "@/lib/types";

export function ProductDetail({ id }: { id: number }) {
  const [product, setProduct] = useState<Product | null>(null), [error, setError] = useState(false);
  useEffect(() => { fetch(`/api/products/${id}`).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Product>; }).then(setProduct).catch(() => setError(true)); }, [id]);
  if (error) return <main className="shell section"><div className="state"><p>정보를 불러오지 못했습니다.</p><Link className="button" href="/products">목록으로 돌아가기</Link></div></main>;
  if (!product) return <main className="shell detail-loading"><div className="skeleton"/><div className="skeleton"/></main>;
  const image = resolveProductImage(product.id, product.image);
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
          <p className="detail-description">{product.description}</p>
          <div className="detail-price"><strong>{product.price.toLocaleString()}원</strong><span>배송비 포함 · 테스트 결제</span></div>
          <div className="option-box"><span>키트 구성</span><strong>{product.options.join(" + ")}</strong></div>
          <ul className="benefit-list"><li><span>01</span>성게 패각 생태 블록</li><li><span>02</span>해조류 포자와 이식 안내</li><li><span>03</span>추천 해역·인증 서비스</li></ul>
          <Link className="button purchase-button" href={`/checkout?product=${product.id}`}>이 키트로 바다숲 시작하기</Link>
          <div className="purchase-meta"><span>남은 재고 <b>{product.stock}개</b></span><span>로컬 테스트 결제</span></div>
        </aside>
      </section>
      <section className="product-story">
        <div className="story-copy"><p className="eyebrow">A CIRCLE BACK TO THE SEA</p><h2>버려진 성게 껍질이<br/>새로운 숲의 터전이 됩니다</h2><p>잘게 분쇄한 성게 패각을 다공성 블록으로 만들고 해조류가 자리 잡도록 돕습니다. 물속에서 자연스럽게 머물며 어린 해조류가 뿌리내릴 표면을 제공합니다.</p></div>
        <div className="story-image"><Image src="/images/hero-sea-forest.png" alt="수중에서 해조류가 자라는 생태 블록" fill sizes="(max-width: 760px) 100vw, 52vw" /></div>
      </section>
      <section className="how-it-works"><p className="eyebrow">HOW IT WORKS</p><h2>세 단계로 시작하는 바다 식목</h2><div className="step-grid"><article><span>01</span><h3>키트를 준비해요</h3><p>구성품과 해조류 상태를 확인하고 동봉된 안내를 읽습니다.</p></article><article><span>02</span><h3>추천 해역을 찾아요</h3><p>계절과 지역별 주의사항을 확인하고 현지 안내를 따릅니다.</p></article><article><span>03</span><h3>심고 기록해요</h3><p>이식한 뒤 고유 코드를 입력해 나의 바다숲 기록을 남깁니다.</p></article></div></section>
      <section className="reviews-section" id="reviews"><div className="section-head"><div><p className="eyebrow">REAL EXPERIENCE</p><h2>먼저 바다숲을 시작한 이야기</h2></div><strong className="review-score">5.0 <span>★★★★★</span></strong></div>{product.reviews.map((review) => <article className="review-card" key={review.id}><div><b>{review.author}</b><span>{"★".repeat(review.rating)}</span></div><p>{review.content}</p><small>구매 인증 후기</small></article>)}</section>
    </div>
  </main>;
}
